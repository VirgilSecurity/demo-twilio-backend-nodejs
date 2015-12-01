using Microsoft.Owin;
using Owin;

[assembly: OwinStartup(typeof(Virgil.TwilioIPMessaging.Startup))]

namespace Virgil.TwilioIPMessaging
{
    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
        }
    }
}
