namespace Virgil.TwilioIPMessaging.Models
{
    public class Meta
    {
        public int page { get; set; }
        public int page_size { get; set; }
        public string first_page_url { get; set; }
        public object previous_page_url { get; set; }
        public string url { get; set; }
        public object next_page_url { get; set; }
        public string key { get; set; }
    }
}