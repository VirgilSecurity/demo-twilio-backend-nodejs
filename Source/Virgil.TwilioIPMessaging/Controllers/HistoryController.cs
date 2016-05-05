namespace Virgil.TwilioIPMessaging.Controllers
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;
    using System.Web.Http;
    using SDK.Identities;
    using Virgil.SDK;
    using Virgil.Crypto;
    using Virgil.TwilioIPMessaging.Common;
    using Virgil.TwilioIPMessaging.Models;

    public class HistoryController : ApiController
    {
        private readonly ServiceHub serviceHub;
        private readonly TwilioService twilioService;

        public HistoryController(ServiceHub serviceHub, TwilioService twilioService)
        {
            this.serviceHub = serviceHub;
            this.twilioService = twilioService;
        }

        public async Task<IEnumerable<TwilioMessage>> Get(string channelSid, string memberName)
        {
            var messages = twilioService.GetChennelHistory(channelSid);

            var publicKey = await EnsurePublicKey(memberName);

            using (var cipher = new VirgilCipher())
            {
                cipher.AddKeyRecipient(publicKey.PublicKeyIdData, publicKey.PublicKeyData);

                foreach (var message in messages)
                {
                    var encryptedBodyData = Convert.FromBase64String(message.body);
                    var recepientIdData = Encoding.UTF8.GetBytes(Constants.TwilioChannelAdminCardId);

                    try
                    {
                        var decryptedBody = cipher.DecryptWithKey(encryptedBodyData, recepientIdData, Constants.TwilioChannelAdminPrivateKey);
                        message.body = Convert.ToBase64String(cipher.Encrypt(decryptedBody, true));
                    }
                    catch (Exception ex)
                    {
                        var undecryptedBody = Encoding.UTF8.GetBytes("Problemo Problemo!");
                        message.body = Convert.ToBase64String(cipher.Encrypt(undecryptedBody, true));
                    }
                }
            }

            return messages;
        }

        private async Task<PublicKeyInfo> EnsurePublicKey(string memberName)
        {
            var cards = await serviceHub.Cards.Search(memberName);
            var card = cards.OrderBy(it => it.CreatedAt).Last();
                        
            var publicKeyInfo = new PublicKeyInfo
            {
                UserId = memberName,
                PublicKeyData = card.PublicKey.Value,
                PublicKeyIdData = Encoding.UTF8.GetBytes(card.Id.ToString())
            };
            
            return publicKeyInfo;
        }
    }
}
