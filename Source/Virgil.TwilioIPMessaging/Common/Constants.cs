namespace Virgil.TwilioIPMessaging.Common
{
    using System;
    using System.Configuration;

    public class Constants
    {
        public static string TwilioAccountSID => ConfigurationManager.AppSettings["twilio:AccountSID"];
        public static string TwilioAuthToken => ConfigurationManager.AppSettings["twilio:AuthToken"];
        public static string TwilioIpMessagingServiceSID => ConfigurationManager.AppSettings["twilio:IpMessagingServiceSID"];
        public static string TwilioChannelAdminCardId => "2f993b2b-7602-49ab-805a-115ae82b2f69";
        public static string TwilioChannelAdminPublicKeyId => "fd1c7f78-db78-4cf4-8df6-a7c43e6a96a2";
        public static byte[] TwilioChannelAdminPrivateKey => Convert.FromBase64String("LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1JSGFBZ0VCQkVBNytMV3pWSmJPVlJvRWZUUHkzR1BkQkdEN3pQOG91Vnk0cjNtZ2dDcDhmZ2dZODVydVMycVcKNThvMDRhT2RLOURwNHRxbXJsUnNaS1NVTjNwRllYR01vQXNHQ1Nza0F3TUNDQUVCRGFHQmhRT0JnZ0FFYU9TQwpmc2VmQ0wzNkk5alo3RUthTm5MTXlCS28zaWxpYnNHQmRGM1E3bG03b3Rzc1ZTSGR3bzlTOE5ydk9UVmp5WGNZCnNhNC9qVmlEQytWZHlscElwaW14Q1NUdjRDVEwzNENNakhydWo0dlozOEpPeXQ3ZkFySXB6Y09LZ2FTeWxFNWIKaHQ3QXJLYTRMWWJsbHdBTzN2bjkvcDZUT0tSV1VCbU9SWEdwMEM0PQotLS0tLUVORCBFQyBQUklWQVRFIEtFWS0tLS0tCg==");
        public static string VirgilAppToken => ConfigurationManager.AppSettings["virgil:AppToken"];
    }
}