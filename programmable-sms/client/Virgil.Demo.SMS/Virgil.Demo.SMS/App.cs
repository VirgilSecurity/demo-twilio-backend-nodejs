namespace Virgil.Demo.SMS
{
    using Xamarin.Forms;

    using Virgil.Demo.SMS.Common;

    public class App : Application
    {
        private readonly MainPageModel viewModel;

        public App(IPhoneService phoneService)
        {
            this.viewModel = new MainPageModel(phoneService);
            this.MainPage = new MainPage { BindingContext = this.viewModel };
        }

        protected override async void OnStart()
        {
            await this.viewModel.Initialize();
        }

        protected override void OnSleep()
        {
            // Handle when your app sleeps
        }

        protected override void OnResume()
        {
            // Handle when your app resumes
        }
    }
}
