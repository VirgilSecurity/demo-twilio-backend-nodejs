namespace Virgil.Demo.SMS.Common
{
    using System;

    public interface IPhoneService
    {
        string GetPhoneNumber();

        /// <summary>
        /// Occurs when SMS message receaved.
        /// </summary>
        Action<string, string> SmsReceived { get; set; }
    }
}