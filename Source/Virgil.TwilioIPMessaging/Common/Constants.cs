namespace Virgil.TwilioIPMessaging.Common
{
    using System;
    using System.Configuration;

    public class Constants
    {
        public static string TwilioAccountSID => ConfigurationManager.AppSettings["twilio:AccountSID"];
        public static string TwilioAuthToken => ConfigurationManager.AppSettings["twilio:AuthToken"];
        public static string TwilioIpMessagingServiceSID => ConfigurationManager.AppSettings["twilio:IpMessagingServiceSID"];
        public static string TwilioChannelAdminCardId => "7ebce2fa-8cd2-4ab1-9fcb-23df6e616b08";
        public static string TwilioChannelAdminPublicKeyId => "9a288fd9-4b3a-4fec-b00a-15669d5794c5";
        public static byte[] TwilioChannelAdminPrivateKey => Convert.FromBase64String("LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1HQUNBUUVFR1FEZ0tUTjBYOVVTVWxYbDZ6aVlBRG9QMHN6MEJuMkprWW1nQ2dZSUtvWkl6ajBEQVFHaE5BTXkKQUFTWXpEZk5Pb0kwOXYxNTVoNkx5K1k3dENNN0xwd1lVUk9JenhNaDZsRE1WVHdteEtPZlY3WTZFMXdBOFdkeApnQXM9Ci0tLS0tRU5EIEVDIFBSSVZBVEUgS0VZLS0tLS0K");
        public static string VirgilAppToken => ConfigurationManager.AppSettings["virgil:AppToken"];
    }
}