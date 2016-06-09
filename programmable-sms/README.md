# Quickstart: Sending Encrypted SMS Messages using Twilio API

With these instructions, you'll learn how to install and integrate the Virgil Security to Twilio Programmable SMS. Let's go!

## Prerequisites

If you haven't yet, read over the REST Quickstart for voice calls, as this example utilizes concepts introduced in that guide.

### Obtaining an Access Token
 
First you must create a free Virgil Security developer's account by signing up [here](https://developer.virgilsecurity.com/account/signup). Once you have your account you can [sign in](https://developer.virgilsecurity.com/account/signin) and generate an access token for your application.
 
The access token provides authenticated secure access to Virgil Keys Services and is passed with each API call. The access token also allows the API to associate your app’s requests with your Virgil Security developer's account.
 
Use this token to initialize the SDK client [here](#lets-get-started).

### Install
 
Use NuGet Package Manager (Tools -> Library Package Manager -> Package Manager Console) to install Virgil.SDK and Twilio packages, running the command:
 
```
PM> Install-Package Virgil.SDK
PM> Install-Package Twilio
```

## Let's Get Started 

I think it's time we threw a Star Wars party. We are going to invite our friends via SMS messages. We are serious about this event, so we're gonna send encrypted messages to make sure that only True people show up. Using Twilio & Virgil will make this task a piece of cake.

### Initialization

```csharp
// set our AccountSid and AuthToken
string accountSid = "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
string authToken = "YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY";

// instantiate a new Twilio Rest Client
var twilio = new TwilioRestClient(accountSid, authToken);

// instantiate a new Virgil Rest Client
var virgil = ServiceHub.Create("%ACCESS_TOKEN%");
```

### Send SMS Messages

To send an SMS message let's perform an HTTP POST to the Messages resource URI. It's also possible to use a [Twilio Helper Library](https://www.twilio.com/docs/libraries) for making REST requests.

```csharp
// make an associative array of Star Wars people we know, indexed by phone number
var people = new Dictionary<string,string>() {
    {"+14XXXXXXXX1","Darth Vader"},
    {"+14XXXXXXXX2","Luke Skywalker"},
    {"+14XXXXXXXX3","Princess Leia"}
};

// load peaple Public Keys from Virgil Service.
var peopleCards = await Task.WhenAll(people
    .Select(it => virgil.Cards.Search(number)));
            
foreach (var personCards in peopleCards)
{
    // get latest person's card.
    var personCard = personCards.OrderBy(it => it.CreatedAt).Last();
    var personName = people[personCard.Identity.Value];

    // Prepare package 
    using (var tinyCipher = new VirgilTinyCipher(120))
    {
        var message = $"Hey {personName}, here is your security code. We are waiting for you!";
        var messageData = Encoding.UTF8.GetBytes(message);

        tinyCipher.Encrypt(messageData, personCard.PublicKey.Value);

        // gets the encrypted message from package.
        var encryptedMessage = Convert.ToBase64String(tinyCipher.GetPackage(0));

        // Send a new outgoing SMS by POSTing to the Messages resource
        twilio.SendMessage(
            SMS.Constants.TwilioPhoneNumber, // From number, must be an SMS-enabled Twilio number
            personCard.Identity.Value,       // To person's phone number
            encryptedMessage);
    }
}

```

Lets look at the details:

  - First, head over to the Twilio website and log into your [Twilio Account page](https://www.twilio.com/user/account/). On the Dashboard near the top you will find your AccountSid and AuthToken. Copy those values and paste them into AccountSid and AuthToken variables.
  - Next, we instantiate a new TwilioRestClient and Virgil ServiceHub REST clients.
  - Next, we search for people's Public Keys and encrypt messages for them.
  - Next, we call the SendMessage method with the To, From and Body of the message.

If your REST request is successful, the SMS will successfully be queued for transmission. The SMS will be sent as soon as possible at a maximum rate of [1 message per second](https://www.twilio.com/faq/sms/) per 'From' phone number.
