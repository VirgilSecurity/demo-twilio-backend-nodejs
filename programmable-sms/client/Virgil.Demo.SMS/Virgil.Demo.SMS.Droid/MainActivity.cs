namespace Virgil.Demo.SMS.Droid
{
    using System.Text;

    using Android.App;
    using Android.Content;
    using Android.Content.PM;
    using Android.OS;
    using Android.Runtime;
    using Android.Telephony;

    [Activity(Label = "Virgil.Demo.SMS", Icon = "@drawable/icon", MainLauncher = true, ConfigurationChanges = ConfigChanges.ScreenSize | ConfigChanges.Orientation)]
    public class MainActivity : global::Xamarin.Forms.Platform.Android.FormsApplicationActivity
    {
        internal static PhoneService PhoneService { get; private set; }

        protected override void OnCreate(Bundle bundle)
        {
            base.OnCreate(bundle);

            // initialize services.

            var telephonyManager = (TelephonyManager)this.GetSystemService(TelephonyService);
            PhoneService = new PhoneService(telephonyManager);

            global::Xamarin.Forms.Forms.Init(this, bundle);
            this.LoadApplication(new App(PhoneService));
        }
    }

    [BroadcastReceiver(Enabled = true, Label = "SMS Receiver")]
    [IntentFilter(new[] { "android.provider.Telephony.SMS_RECEIVED", })]
    public class SMSBroadcastReceiver : BroadcastReceiver
    {
        private const string Tag = "SMSBroadcastReceiver";
        private const string IntentAction = "android.provider.Telephony.SMS_RECEIVED";

        public override void OnReceive(Context context, Intent intent)
        {
            if (intent.Action != IntentAction) return;

            var bundle = intent.Extras;

            if (bundle == null) return;

            var pdus = bundle.Get("pdus");
            var castedPdus = JNIEnv.GetArray<Java.Lang.Object>(pdus.Handle);

            var msgs = new SmsMessage[castedPdus.Length];

            for (var i = 0; i < msgs.Length; i++)
            {
                var bytes = new byte[JNIEnv.GetArrayLength(castedPdus[i].Handle)];
                JNIEnv.CopyArray(castedPdus[i].Handle, bytes);

                msgs[i] = SmsMessage.CreateFromPdu(bytes);

                MainActivity.PhoneService.RaiseSmsReceived(msgs[i].OriginatingAddress, msgs[i].MessageBody);
            }
        }
    }
}

