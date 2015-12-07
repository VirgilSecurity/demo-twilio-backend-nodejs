namespace Virgil.TwilioIPMessaging.Controllers
{
    using System.Web.Http;
    using Twilio;
    using Virgil.TwilioIPMessaging.Common;

    public class TokenController : ApiController
    {
        public string Get(string identity)
        {
            var twilio = new TwilioCapability(Constants.TwilioAccountSID, Constants.TwilioAuthToken);
            twilio.AllowClientOutgoing("IPMessagingPrivateBeta", new
            {
                service_sid = Constants.TwilioIpMessagingServiceSID,
                endpoint_id = "VIRGIL_CHAT:" + "browser-browser" + ":" + identity,
                identity
            });

            var token = twilio.GenerateToken();
            return token;
        }
    }
}
