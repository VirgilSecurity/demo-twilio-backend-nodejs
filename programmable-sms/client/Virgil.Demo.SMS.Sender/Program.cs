namespace Virgil.Demo.SMS.Sender
{
    using System;
    using System.Configuration;
    using System.Linq;
    using System.Text;

    using Virgil.Crypto;

    using Twilio;
    using Virgil.SDK;
    using Virgil.SDK.Identities;
    using Virgil.SDK.Models;
    using Virgil.SDK.Utils;

    public class Program
    {
        private static readonly string TwilioAccountSid = ConfigurationManager.AppSettings["twilio:AccountSid"];
        private static readonly string TwilioAuthToken = ConfigurationManager.AppSettings["twilio:AuthToken"];
        private static readonly string TwilioPhoneNumber = ConfigurationManager.AppSettings["twilio:PhoneNumber"];
        private static readonly string VirgilAccessToken = ConfigurationManager.AppSettings["virgil:AccessToken"];
        private static readonly string VirgilAppPrivateKey = ConfigurationManager.AppSettings["virgil:AppPrivateKey"];
        private static readonly string VirgilAppPrivateKeyPassword = ConfigurationManager.AppSettings["virgil:AppPrivateKeyPassword"];

        private static ServiceHub virgil;
        private static TwilioRestClient twilio;
        private static CardModel myCard;

        public static void Main(string[] args)
        {
            // initialize Virgil & Twilio services with access tokens.

            twilio = new TwilioRestClient(TwilioAccountSid, TwilioAuthToken);

            virgil = ServiceHub.Create(VirgilAccessToken);

            // register or load twilio phone number card.
            myCard = EnsureTwilioPhoneNumberCardRegistered();

            while (true)
            {
                Console.Write("Enter recipent's phone number: ");
                var phoneNumber = Console.ReadLine();

                // get a recipient's card with public key from Virgil keys services.

                var recipientCard = GetCardByPhoneNumber(phoneNumber);
                if (recipientCard == null)
                {
                    Console.WriteLine("Card with given Phone number is not found.");
                    continue;
                }

                Console.Write("Enter message: ");
                var message = Console.ReadLine();

                // encrypt SMS message with recipient's public key.

                var encryptedMessage = EncryptMessage(recipientCard, message);

                var response = twilio.SendMessage(TwilioPhoneNumber, phoneNumber, encryptedMessage);
                if (response.RestException != null)
                {
                    Console.WriteLine(response.RestException.Message);
                    continue;
                }

                Console.WriteLine("Message has been sent successfully.");
                break;
            }

            Console.ReadKey();
        }

        /// <summary>
        /// Encrypts the message with given recipient's card.
        /// </summary>
        private static string EncryptMessage(CardModel recipientCard, string message)
        {
            using (var crypto = new VirgilTinyCipher(120))
            {
                var messageData = Encoding.UTF8.GetBytes(message);
                crypto.Encrypt(messageData, recipientCard.PublicKey.Value);

                var encryptedMessage = Convert.ToBase64String(crypto.GetPackage(0));
                return encryptedMessage;
            }
        }

        /// <summary>
        /// Gets the recipient phone card by phone number from Virgil services.
        /// </summary>
        private static CardModel GetCardByPhoneNumber(string phoneNumber)
        {
            var foundCard = virgil.Cards.Search(phoneNumber).Result
                .OrderBy(it => it.CreatedAt)
                .LastOrDefault();

            return foundCard;
        }

        /// <summary>
        /// Registers or generates new Card for Twilio Phone number.
        /// </summary>
        public static CardModel EnsureTwilioPhoneNumberCardRegistered()
        {
            var phoneCard = virgil.Cards.Search(TwilioPhoneNumber).Result
                .OrderBy(it => it.CreatedAt)
                .LastOrDefault();

            if (phoneCard != null)
            {
                return phoneCard;
            }

            var keyPair = VirgilKeyPair.Generate(VirgilKeyPair.Type.EC_Curve25519);

            var validationToken = ValidationTokenGenerator.Generate(TwilioPhoneNumber, "phone",
                Encoding.UTF8.GetBytes(VirgilAppPrivateKey), VirgilAppPrivateKeyPassword);

            var identityInfo = new IdentityInfo
            {
                Value = TwilioPhoneNumber,
                Type = "phone",
                ValidationToken = validationToken
            };

            phoneCard = virgil.Cards.Create(identityInfo, keyPair.PublicKey(), keyPair.PrivateKey()).Result;
            virgil.PrivateKeys.Stash(phoneCard.Id, keyPair.PrivateKey());

            return phoneCard;
        }
    }
}
