namespace Virgil.Demo.SMS
{
    using System;
    using System.ComponentModel;
    using System.Linq;
    using System.Runtime.CompilerServices;
    using System.Text;
    using System.Threading.Tasks;

    using Virgil.Crypto;
    using Virgil.SDK.Identities;
    using Virgil.SDK.Models;
    using Virgil.Demo.SMS.Common;
    using Virgil.SDK;

    using Xamarin.Forms;

    /// <summary>
    /// Represents a view model for <see cref="MainPage"/> class.
    /// </summary>
    public class MainPageModel : INotifyPropertyChanged
    {
        private readonly IPhoneService phoneService;
        private ServiceHub serviceHub;

        private bool isLoading;
        private string loadingText;

        private CardModel myCard;
        private byte[] myPrivateKey;
        private VirgilTinyCipher tinyCipher;

        public MainPageModel(IPhoneService phoneService)
        {
            this.phoneService = phoneService;
        }

        /// <summary>
        /// Gets or sets a value indicating whether this view is loading.
        /// </summary>
        public bool IsLoading
        {
            get { return this.isLoading; }
            set
            {
                this.isLoading = value;
                this.RaisePropertyChanged();
            }
        }

        /// <summary>
        /// Gets or sets the loading indicator description text.
        /// </summary>
        public string LoadingText
        {
            get { return this.loadingText; }
            set
            {
                this.loadingText = value;
                this.RaisePropertyChanged();
            }
        }

        /// <summary>
        /// Intializes a view model instance.
        /// </summary>
        public async Task Initialize()
        {
            this.IsLoading = true;
            this.LoadingText = "Loading...";

            // get a current phone number.

            this.tinyCipher = new VirgilTinyCipher(120);

            var number = this.phoneService.GetPhoneNumber();

            try
            {
                var client = new System.Net.Http.HttpClient();
                var virgilToken = await client.GetStringAsync("https://demo-sms.virgilsecurity.com/virgil-token");

                this.serviceHub = ServiceHub.Create(virgilToken);
            }
            catch (Exception ex)
            {
                ;
            }

            await this.LoadKeys(number);

            this.phoneService.SmsReceived += this.OnSmsReceived;
        }

        private void OnSmsReceived(string from, string message)
        {
            this.tinyCipher.AddPackage(Convert.FromBase64String(message));
            if (this.tinyCipher.IsPackagesAccumulated())
            {
                var decryptedData = this.tinyCipher.Decrypt(this.myPrivateKey);
                var decryptedMessage = Encoding.UTF8.GetString(decryptedData, 0, decryptedData.Length);

                this.tinyCipher.Reset();

                Application.Current.MainPage.DisplayAlert($"From: {from}", decryptedMessage, "Got It");
            }
        }

        private async Task LoadKeys(string phoneNumber)
        {
            // search for Public Key on Virgil Service.

            this.LoadingText = "Search for Public Key...";

            var cards = await this.serviceHub.Cards.Search(phoneNumber);
            this.myCard = cards.OrderBy(it => it.CreatedAt).LastOrDefault();

            var validationToken = await this.ValidatePhoneNumber(phoneNumber);

            var identityInfo = new IdentityInfo
            {
                Type = "phone",
                Value = phoneNumber,
                ValidationToken = validationToken
            };

            if (this.myCard != null)
            {
                this.LoadingText = "Loading a Private Key...";

                this.myPrivateKey = (await this.serviceHub.PrivateKeys
                    .Get(this.myCard.Id, identityInfo)).PrivateKey;
            }
            else
            {
                this.LoadingText = "Generating a Public/Private key pair...";

                var keyPair = VirgilKeyPair.Generate(VirgilKeyPair.Type.EC_Curve25519);

                this.LoadingText = "Registering a Public Key...";

                this.myCard = await this.serviceHub.Cards
                    .Create(identityInfo, keyPair.PublicKey(), keyPair.PrivateKey());

                this.LoadingText = "Stashing a Private Key...";

                await this.serviceHub.PrivateKeys.Stash(this.myCard.Id, keyPair.PrivateKey());

                this.myPrivateKey = keyPair.PrivateKey();
            }

            this.IsLoading = false;
            this.LoadingText = "Waiting for incoming messages";
        }

        private async Task<string> ValidatePhoneNumber(string phoneNumber)
        {
            var number = phoneNumber.Replace("+", "");

            var client = new System.Net.Http.HttpClient();
            var virgilToken = await client.GetStringAsync($"https://demo-sms.virgilsecurity.com/validate-phone-number?phoneNumber={number}");

            return virgilToken;
        }

        #region INotifyPropertyChanged Implementation

        public event PropertyChangedEventHandler PropertyChanged;

        /// <summary>
        /// Triggers the UI that specified property has been changed.
        /// </summary>
        protected virtual void RaisePropertyChanged([CallerMemberName] string propertyName = null)
        {
            this.PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }

        #endregion
    }
}