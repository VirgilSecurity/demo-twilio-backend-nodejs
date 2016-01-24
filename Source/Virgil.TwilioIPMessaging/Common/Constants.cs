namespace Virgil.TwilioIPMessaging.Common
{
    using System;
    using System.Configuration;

    public class Constants
    {
        public static string TwilioAccountSID => ConfigurationManager.AppSettings["twilio:AccountSID"];
        public static string TwilioAuthToken => ConfigurationManager.AppSettings["twilio:AuthToken"];
        public static string TwilioIpMessagingServiceSID => ConfigurationManager.AppSettings["twilio:IpMessagingServiceSID"];
        public static string TwilioChannelAdminCardId => "7e95615b-d1cd-4635-9bf6-8e9f538bd1da";
        public static string TwilioChannelAdminPublicKeyId => "ce51c3b9-12c8-4519-8fc4-e364a2923f3b";
        public static byte[] TwilioChannelAdminPrivateKey => Convert.FromBase64String("LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1GOENBUUVFR0NnRkp4MkJkdEFEbFY5cUhxa1ZKYkpZQy94eUhkT3gycUFLQmdncWhrak9QUU1CQWFFMEF6SUEKQkVIVTlTYmdjV1NON1pJK3lBck0xbnkvcld4ZmlLdVd1ZlorQ0s5aVdRZ20vZ3o1cWhYQzRFVEw4MnZRVnJ5RgpZdz09Ci0tLS0tRU5EIEVDIFBSSVZBVEUgS0VZLS0tLS0K");
        public static string VirgilAppToken => ConfigurationManager.AppSettings["virgil:AppToken"];
    }
}