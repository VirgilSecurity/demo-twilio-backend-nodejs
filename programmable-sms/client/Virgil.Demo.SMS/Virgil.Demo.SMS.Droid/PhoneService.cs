namespace Virgil.Demo.SMS.Droid
{
    using System;
    using Android.Telephony;
    using Virgil.Demo.SMS.Common;

    /// <summary>
    /// 
    /// </summary>
    public class PhoneService : IPhoneService
    {
        private readonly TelephonyManager telephonyManager;

        /// <summary>
        /// Initializes a new instance of the <see cref="PhoneService"/> class.
        /// </summary>
        public PhoneService(TelephonyManager telephonyManager)
        {
            this.telephonyManager = telephonyManager;
        }

        /// <summary>
        /// Gets the phone number.
        /// </summary>
        public string GetPhoneNumber()
        {
            return this.telephonyManager.Line1Number;
        }

        public Action<string, string> SmsReceived { get; set; }

        /// <summary>
        /// Raises 
        /// </summary>
        /// <param name="originatingAddress"></param>
        /// <param name="messageBody"></param>
        internal void RaiseSmsReceived(string originatingAddress, string messageBody)
        {
            this.SmsReceived?.Invoke(originatingAddress, messageBody);
        }
    }
}