namespace Virgil.TwilioIPMessaging.Controllers
{
    using System.Web.Http;
    using Twilio.Auth;
    using Virgil.TwilioIPMessaging.Common;

    public class TokenController : ApiController
    {
        public string Get(string identity)
        {
            // Create an Access Token generator
            var token = new AccessToken(Constants.TwilioAccountSID, Constants.TwilioApiKey, Constants.TwilioApiKeySecret) { Identity = identity };
            
            // Create an IP messaging grant for this token
            var grant = new IpMessagingGrant
            {
                EndpointId = $"VIRGIL_CHAT:{identity}:browser-browser",
                ServiceSid = Constants.TwilioIpMessagingServiceSID
            };

            token.AddGrant(grant);
            return token.ToJWT();
        }
    }
}
