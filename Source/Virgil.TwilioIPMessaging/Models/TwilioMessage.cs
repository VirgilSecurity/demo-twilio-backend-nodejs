namespace Virgil.TwilioIPMessaging.Models
{
    using System;

    public class TwilioMessage
    {
        public string sid { get; set; }
        public string account_sid { get; set; }
        public string service_sid { get; set; }
        public string to { get; set; }
        public string author { get; set; }
        public DateTime date_created { get; set; }
        public DateTime date_updated { get; set; }
        public bool was_edited { get; set; }
        public string from { get; set; }
        public string body { get; set; }
        public string url { get; set; }
    }
}