namespace Virgil.TwilioIPMessaging.Common
{
    using System;
    using System.Configuration;

    public class Constants
    {
        public static string TwilioAccountSID => ConfigurationManager.AppSettings["twilio:AccountSID"];
        public static string TwilioApiKey => ConfigurationManager.AppSettings["twilio:ApiKey"];
        public static string TwilioApiKeySecret => ConfigurationManager.AppSettings["twilio:ApiKeySecret"];
        public static string TwilioIpMessagingServiceSID => ConfigurationManager.AppSettings["twilio:IpMessagingServiceSID"];

        public static string TwilioChannelAdminCardId => ConfigurationManager.AppSettings["virgil:TwilioChannelAdminCardId"];
        public static byte[] TwilioChannelAdminPrivateKey => Convert.FromBase64String(ConfigurationManager.AppSettings["virgil:TwilioChannelAdminPrivateKey"]);

        public static string VirgilAppAccessToken => ConfigurationManager.AppSettings["virgil:AppToken"];
        public static byte[] VirgilAppPrivateKey => Convert.FromBase64String(ConfigurationManager.AppSettings["virgil:AppPrivateKey"]);
        public static string VirgilAppPrivateKeyPassword => ConfigurationManager.AppSettings["virgil:AppPrivateKeyPassword"];
    }
}