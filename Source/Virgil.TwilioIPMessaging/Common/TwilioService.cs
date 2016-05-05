namespace Virgil.TwilioIPMessaging.Common
{
    using System;
    using System.Collections.Generic;
    using System.Net;
    using System.Text;

    using Newtonsoft.Json;

    using Virgil.TwilioIPMessaging.Models;

    public class TwilioService
    {
        public List<TwilioMessage> GetChennelHistory(string channelSid)
        {
            var webClient = this.GetWebClient();
            var messagesUrl = $"https://ip-messaging.twilio.com/v1/Services/{Constants.TwilioIpMessagingServiceSID}/Channels/{channelSid}/Messages";

            var messagesResponse = webClient.DownloadString(new Uri(messagesUrl));
            var messagesResult = JsonConvert.DeserializeObject<MessagesResult>(messagesResponse);

            return messagesResult.messages;
        }

        private WebClient GetWebClient()
        {
            var webClient = new WebClient();
            var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes(Constants.TwilioApiKey + ":" + Constants.TwilioApiKeySecret));
            webClient.Headers[HttpRequestHeader.Authorization] = "Basic " + credentials;

            return webClient;
        }
    }
}