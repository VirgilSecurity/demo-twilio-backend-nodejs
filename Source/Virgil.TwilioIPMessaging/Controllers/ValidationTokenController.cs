namespace Virgil.TwilioIPMessaging.Controllers
{
    using System.Web.Http;
    using Common;
    using SDK.Utils;

    public class ValidationTokenController : ApiController
    {
        public string Get(string identity)
        {
            return ValidationTokenGenerator.Generate(identity, "member", 
                Constants.VirgilAppPrivateKey, Constants.VirgilAppPrivateKeyPassword);
        }
    }
}
