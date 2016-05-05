namespace Virgil.TwilioIPMessaging.Models
{
    using System.Collections.Generic;

    public class MessagesResult
    {
        public Meta meta { get; set; }
        public List<TwilioMessage> messages { get; set; }
    }
}