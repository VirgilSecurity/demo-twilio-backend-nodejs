namespace Virgil.TwilioIPMessaging.Controllers
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;
    using System.Web.Http;

    using Virgil.Crypto;
    using Virgil.SDK.Infrastructure;
    using Virgil.TwilioIPMessaging.Common;
    using Virgil.TwilioIPMessaging.Models;

    public class HistoryController : ApiController
    {
        public async Task<IEnumerable<Message>> Get(string channelSid, string memberName)
        {
            var twilioService = new TwilioService();
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
                    catch (Exception)
                    {
                        var undecryptedBody = Encoding.UTF8.GetBytes("Problemo Problemo!");
                        message.body = Convert.ToBase64String(cipher.Encrypt(undecryptedBody, true));
                    }
                }
            }

            return messages;
        }

        private static async Task<PublicKeyInfo> EnsurePublicKey(string memberName)
        {
            var virgilHub = Bootsrapper.UseAccessToken(Constants.VirgilAppToken)
                .WithCustomIdentityServiceUri(new Uri("https://identity-stg.virgilsecurity.com/v3/"))
                .WithCustomPublicServiceUri(new Uri("https://keys-stg.virgilsecurity.com/v3/"))
                .Build();

            var cards = await virgilHub.Cards.Search(memberName);
            var card = cards.Single();
                        
            var publicKeyInfo = new PublicKeyInfo
            {
                UserId = memberName,
                PublicKeyData = card.PublicKey.PublicKey,
                PublicKeyIdData = Encoding.UTF8.GetBytes(card.Id.ToString())
            };
            
            return publicKeyInfo;
        }
    }
}
