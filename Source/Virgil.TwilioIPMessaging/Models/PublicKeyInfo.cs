namespace Virgil.TwilioIPMessaging.Models
{
    public class PublicKeyInfo
    {
        public byte[] PublicKeyData { get; set; }
        public byte[] PublicKeyIdData { get; set; }
        public string UserId { get; set; }
    }
}