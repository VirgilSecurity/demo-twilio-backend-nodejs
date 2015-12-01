namespace Virgil.TwilioIPMessaging.Common
{
    using System;
    using System.Configuration;
    using System.Text;

    public class Constants
    {
        public static string TwilioAccountSID => ConfigurationManager.AppSettings["twilio:AccountSID"];
        public static string TwilioAuthToken => ConfigurationManager.AppSettings["twilio:AuthToken"];
        public static string TwilioIpMessagingServiceSID => ConfigurationManager.AppSettings["twilio:IpMessagingServiceSID"];
        public static string TwilioChannelAdminPublicKeyId => "6660f756-27c6-c239-0a97-2ecc55e8ad18";
        public static byte[] TwilioChannelAdminPrivateKey => Convert.FromBase64String("LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1IY0NBUUVFSUN6Q3Z4TWVkdVh5RS9JdUU4OFB2bTZ4RWUyYmF3Um90dldSdHptWldSS0xvQW9HQ0NxR1NNNDkKQXdFSG9VUURRZ0FFTVlmOUdxVTE2RXhDL1pVOVAxNFV2ZzBONWdJR24rcGw5Ry9VSEhrSkNhTHZPdmloYWJ6UApmM01aa1pYcllUZ09aZmxFcWF0MUw2cTBtcDVFUC9XK3NnPT0KLS0tLS1FTkQgRUMgUFJJVkFURSBLRVktLS0tLQo=");
        public static string VirgilAppToken => ConfigurationManager.AppSettings["virgil:AppToken"];
    }
}