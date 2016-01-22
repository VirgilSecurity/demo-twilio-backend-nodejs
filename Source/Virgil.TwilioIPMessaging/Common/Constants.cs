namespace Virgil.TwilioIPMessaging.Common
{
    using System;
    using System.Configuration;

    public class Constants
    {
        public static string TwilioAccountSID => ConfigurationManager.AppSettings["twilio:AccountSID"];
        public static string TwilioAuthToken => ConfigurationManager.AppSettings["twilio:AuthToken"];
        public static string TwilioIpMessagingServiceSID => ConfigurationManager.AppSettings["twilio:IpMessagingServiceSID"];
        public static string TwilioChannelAdminCardId => "8f2af496-a10e-4b15-88a8-77e7b68f2d1c";
        public static string TwilioChannelAdminPublicKeyId => "4c4a4ed3-5f23-48c2-8f67-b4c32bf609d8";
        public static byte[] TwilioChannelAdminPrivateKey => Convert.FromBase64String("LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1JSGFBZ0VCQkVCckh0YUkxK2pxZk1uV3VTeU9UbytQK1UxZDlHS016bzRtNlNkTUoralBtUjh3S0hUUVNDc3YKVEgzZ3RCRlRpZ1FQc3VUVFlEeWFEd0JjWW1GbEl4YUtvQXNHQ1Nza0F3TUNDQUVCRGFHQmhRT0JnZ0FFQklUawpLUXFPVEllaEVMdzk3NTh2RmdhZEN5dHNYVkpjSjVMTVE0RVFUcHZkeW5JdXBtKzFYRjdoOElRSGtETzJRNHA0CnZDL3hmZ0I1d2YyMzRvMlhheHA1d3hvd1dGQ0FBbjFWYzNmS2dPZlRGQXRYdjRlQmhYQTBLZU1GQ1ZwRnMxR2IKOFBsb01zb1A3TmRDZ2hRVnF6UkVvVGl1RlI3dmdtTE4zb3dFZ05nPQotLS0tLUVORCBFQyBQUklWQVRFIEtFWS0tLS0tCg==");
        public static string VirgilAppToken => ConfigurationManager.AppSettings["virgil:AppToken"];
    }
}