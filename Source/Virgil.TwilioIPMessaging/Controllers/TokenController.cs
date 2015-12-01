namespace Virgil.TwilioIPMessaging.Controllers
{
    using System.Configuration;
    using System.Web.Http;
    using Twilio;
    
    public class TokenController : ApiController
    {
        public string Get(string identity)
        {
            var accountSid = ConfigurationManager.AppSettings["twilio:AccountSID"];
            var authToken = ConfigurationManager.AppSettings["twilio:AuthToken"];
            var ipMessagingServiceSid = ConfigurationManager.AppSettings["twilio:IpMessagingServiceSID"];

            var twilio = new TwilioCapability(accountSid, authToken);
            twilio.AllowClientOutgoing("IPMessagingPrivateBeta", new
            {
                service_sid = ipMessagingServiceSid,
                endpoint_id = "VIRGIL_CHAT:" + "browser-browser" + ":" + identity,
                identity
            });

            var token = twilio.GenerateToken();
            return token;
        }
    }
}
