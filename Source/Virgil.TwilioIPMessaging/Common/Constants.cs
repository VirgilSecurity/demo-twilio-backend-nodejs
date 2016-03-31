namespace Virgil.TwilioIPMessaging.Common
{
    using System;
    using System.Configuration;

    public class Constants
    {
        public static string TwilioAccountSID => ConfigurationManager.AppSettings["twilio:AccountSID"];
        public static string TwilioAuthToken => ConfigurationManager.AppSettings["twilio:AuthToken"];
        public static string TwilioApiKey => ConfigurationManager.AppSettings["twilio:ApiKey"];
        public static string TwilioApiKeySecret => ConfigurationManager.AppSettings["twilio:ApiKeySecret"];
#if !DEBUG
        public static string TwilioIpMessagingServiceSID => ConfigurationManager.AppSettings["twilio:IpMessagingServiceSID"];
#else
        public static string TwilioIpMessagingServiceSID => ConfigurationManager.AppSettings["twilio:IpMessagingServiceSIDTest"];
#endif
        public static string TwilioChannelAdminCardId => "e99ac8da-5d57-4f7e-898f-25bd7f62cc1a";
        public static string TwilioChannelAdminPublicKeyId => "256077b6-80b0-481f-91c7-6a2b62a02041";
        public static byte[] TwilioChannelAdminPrivateKey => Convert.FromBase64String("LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1GOENBUUVFR0c2SUNFWDdKbWVNdDNvMlY1M0V6cnh3UE83Mm5ZcVY1S0FLQmdncWhrak9QUU1CQWFFMEF6SUEKQkI5TitadXFGOFBLMVdaSE9yOGlBM29xNUl3eTYzRERaS25USFlaK1BxRkJURDIvaTBTOEVlZ2pOMFVUOGpVVQp6dz09Ci0tLS0tRU5EIEVDIFBSSVZBVEUgS0VZLS0tLS0K");
        public static string VirgilAccessToken => ConfigurationManager.AppSettings["virgil:AppToken"];
    }
}