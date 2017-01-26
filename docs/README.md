# Quickstart: Adding End-to-End Encryption to Twilio Programmable Chat.

## Introduction

With these instructions, you'll learn how to install and integrate the Virgil Crypto API and Twilio Programmable Chat API. Let's go!

## How it Works - Basics
![IPMessaging](https://github.com/VirgilSecurity/virgil-demo-twilio/blob/master/Images/how-it-works.png)

## Setting up your project

### Target environments

SDK targets ECMAScript5 compatible browsers and Node.js from version 0.12 
and above. 

### Installation

You can install Virgil SDK from npm

```sh
npm install virgil-sdk --save
```

Or get it from CDN
```html
<script 
src="https://cdn.virgilsecurity.com/packages/javascript/sdk/4.0.0/virgil-sdk.min.js"
crossorigin="anonymous"></script>
```

## User and App Credentials

To start using Virgil Services you first have to create an account at [Virgil 
Developer Portal](https://developer.virgilsecurity.com/account/signup).

After you create an account, or if you already have an account, sign in and 
create a new application. Make sure you save the *private key* that is 
generated for your application at this point as you will need it later. 
After your application is ready, create a *token* that your app will 
use to make authenticated requests to Virgil Services. One more thing that 
you're going to need is your application's *app id* which is an identifier 
of your application's Virgil Card.

## Usage

Now that you have your account and application in place you can start making 
requests to Virgil Services.

### Initializing an API Client

To initialize the client, you need the *access token* that you created for 
your application on [Virgil Developer Portal](https://developer.virgilsecurity.com/)

```javascript
// var virgil = require('virgil-sdk');
// or just use virgil if you've added virgil sdk via <script> tag
 
var client = virgil.client("[YOUR_ACCESS_TOKEN_HERE]");
```

## Let's Get Started

In a Twilio Programmable Chat application, a Channel is where all the action happens. Whether it's between two users or two hundred, a Channel is where Messages are sent, received, and archived for later viewing by offline clients.

Let's dive into a few of the key techniques you'll need to employ while working with Channels and Messages in your application. Let's also apply end-to-end encryption using Virgil Security's infrastructure.

First of all, you need to generate Public/Private key pair and publish a Public key to the Virgil Services where it is available in an open access for other chat members (e.g. recipient) to verify and encrypt the data for the key owner. See more about publishing Public keys [here](https://github.com/VirgilSecurity/virgil-sdk-javascript#creating-virgil-cards)

Let's start with generating Public/Private keys.

### Generate a New Key Pair
Generate a new Public/Private key pair for end-to-end encryption

```js
var alice = virgil.crypto.generateKeys();

var exportedPublicKey = virgil.crypto.exportPublicKey(alice.publicKey);
var exportedPrivateKey = virgil.crypto.exportPrivateKey(alice.privateKey);

console.log(exportedPublicKey.toString('utf8'));
console.log(exportedPrivateKey.toString('utf8'));
```
*Output:*

```
-----BEGIN PUBLIC KEY-----
MFswFQYHKoZIzj0CAQYKKwYBBAGXVQEFAQNCAAQO8ohmBRyclmcfQ38Lwmvv4Cau
jyX6vWn8kJrR0RRfFQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
-----END PUBLIC KEY-----

-----BEGIN EC PRIVATE KEY-----
MHkCAQEEIFB+lOUvbb4WX+e3zLkAcYpvZR3qpQI8Ru/tcnciCMkIoAwGCisGAQQB
l1UBBQGhRANCAAQO8ohmBRyclmcfQ38Lwmvv4CaujyX6vWn8kJrR0RRfFQAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
-----END EC PRIVATE KEY-----
```

### Prepare request

Let's move on, the next step is to create `PublishCardRequest`. The `PublishCardRequest` is used to define a Virgil Card and publish it on Virgil Security services.

> Virgil Card is representing the main entity at Virgil Security services, it includes the user's Public key and identity information.

```js
var publishRequest = virgil.publishCardRequest({
      identity: "alice",
      identity_type: "chat_member",
      public_key: exportedPublicKey.toString('base64')
    });
```

Once you've created the `PublishCardRequest`, you need to sign it using your Private key, we need this in order to confirm, that you are the owner of the Private key, as well as with another side, this guarantees you that the information about identity and Public key will never be modified with third parties.

```js
var requestSigner = virgil.requestSigner(virgil.crypto);
requestSigner.selfSign(publishRequest, alice.privateKey);
```

Well done, we almost ready with the client side. Now we need to send this request to the servers side (Application Side) where this request will be signed with AppKey, and published to the Virgil Security Services.

Here how it works:

```js
var exportedRequest = publishRequest.export();
```

The `exportedRequest` is a base64 string that represents a `PublishCardRequest`. You can easily transmit it to the server side using your application transport.

### Publish Virgil Card
Once you received the `exportedRequest` on server side, you need to import it and then sign it using your Application Private key (AppKey).

```js
var alicePublishRequest = virgil.publishCardRequest.import(exportedRequest);

// prepare application credentials

var APP_ID = "[YOUR_APP_ID_HERE]";
var APP_KEY_PASSWORD = "[YOUR_APP_KEY_PASSWORD_HERE]";

// this can either be a Buffer object or a base64-encoded string with the 
// private key bytes
var appPrivateKeyMaterial = "[YOUR_BASE64_ENCODED_APP_KEY_HERE]";
var appPrivateKey = virgil.crypto.importPrivateKey(
        appPrivateKeyMaterial, APP_KEY_PASSWORD);
        
// appPrivateKey is an object that is a handle to the private and 
// does not hold the Private key value

requestSigner.authoritySign(alicePublishRequest, APP_ID, appPrivateKey);
```

After you sign the request object you can send it to Virgil Services to conclude the card creation process.

```js
client.publishCard(alicePublishRequest)
.then(function (aliceCard) {
  console.log(aliceCard);
});
```

*Output:*

```json
{
    "id": "bb5db5084dab511135ec24c2fdc5ce2bca8f7bf6b0b83a7fa4c3cbdcdc740a59",
    "content_snapshot":"eyJwdWJsaWNfa2V5IjoiTFMwdExTMUNSVWRKVGlCUVZVSk1...",
    "meta": {
        "created_at": "2015-12-22T07:03:42+0000",
        "card_version": "4.0",
        "signs": {
            "bb5db5084dab511135ec24c2fdc5ce2bca8f7bf6b0b83a7fa4c3cbdcdc740a59":"MIGaMA0GCWCGSAFlAwQCAgUABIGIMI...",
            "767b6b12702df1a873f42628498f32b5f31abb9ab12ac09af6799a2f263330ad":"MIGaMA0GCWCGSAFlAwQCAgUABIGIMI...",
            "ab799a2f26333c09af6628496b12702df1a80ad767b73f42b9ab12a8f32b5f31":"MIGaMA0GCWCGSAFlAwQCAgUABf7bdC..."
        }
    }
}
```

### Create a Channel
Before you can start sending Messages, you first need a Channel. Here is how you create a Channel.

```js
// Create a Channel
twilioClient.createChannel({ friendlyName: 'general' }).then(function(channel) {
    generalChannel = channel;
});
```

### Send Encrypted Messages
Once you're a member of a Channel, you can send a Message to it. A Message is a bit of data that is sent first to the Twilio backend, where it is stored for later access by members of the Channel, and then pushed out in real time to all currently online Channel members. Only users subscribed to your Channel will receive your Messages.

```js
// Receive the list of Channel's recipients
Promise.all(generalChannel.getMembers().map(function(member) {
    // Search for the member’s cards on Virgil Cards service
    return client.searchCards({ identities: [ member.identity ], type: 'chat_member' })
        .then(function(cards){
            return virgil.crypto.importPublicKey(cards[0].publicKey)
        }
    });
}).then(function(recipients) {
    var message = $('#chat-input').val();
    var encryptedMessage = virgil.crypto.encrypt(message, recipients);
        
    generalChannel.sendMessage(encryptedMessage);    
    console.log(encryptedMessage);
});
```
*Output:*

```
MIIDBQIBADCCAv4GCSqGSIb3DQEHA6CCAu8wggLrAgECMYICvDCCAVoCAQKgJgQkMDg3YjgwYmMtMzNjYi00MTI1LWI4YTgtYTE
3OTEwM2Y3ZjRkMBUGByqGSM49AgEGCisGAQQBl1UBBQEEggEUMIIBEAIBADBbMBUGByqGSM49AgEGCisGAQQBl1UBBQEDQgAEcd
8fhKqYlZxvcmmodg7Z3PNhE1LXLJqobouEcRfZaRMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAYBgcogYxxAgUCM
A0GCWCGSAFlAwQCAgUAMEEwDQYJYIZIAWUDBAICBQAEMEaJMAvX7S+52BpI5hYyFOc0noIc+qdFFrQanNAtNGBAX/Pxeg5yJ2iA
JijyZ8ut9zBRMB0GCWCGSAFlAwQBKgQQ81bklcNOyU/QTatCigSzoAQwHnAcbXk0daExIIS+sr6aIvVuF/o6j+1Rs5bvq2WVN41
k/Oir5x7KZTSR7v3nx+fTMIIBWgIBAqAmBCRmNzM4YTUwNi1hMDYwLTQ1MDgtYTJkYS04NjY1NjZlYzg0ODMwFQYHKoZIzj0CAQ
YKKwYBBAGXVQEFAQSCARQwggEQAgEAMFswFQYHKoZIzj0CAQYKKwYBBAGXVQEFAQNCAARJ5C3hsYuI2Sf14k60Dz5Mv5yD/AsVA
zPfsmlreGTC2gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMBgGByiBjHECBQIwDQYJYIZIAWUDBAICBQAwQTANBglg
hkgBZQMEAgIFAAQwhu7WM1rff9RYsQ+dmfX9Os3Irwm4cm5bIvUlcGXlCfmEsrjTyTg5MGjYLtxbYtL9MFEwHQYJYIZIAWUDBAE
qBBCfKdP/gZnkVwJvv4Hdf2eWBDC3czBjV/yPGeGTqBIilHSsrqwK7lVMTBuKR+mR3eNdh+yBIAcOk4rveSUbDuWagDIwJgYJKo
ZIhvcNAQcBMBkGCWCGSAFlAwQBLgQMfjkCvK3UgXdorcYUmtCHHuSm4yfBacMsniMADAeos7qN7OmNsFU1
```

Today, a Message is just a string of text. In the future, this may expand to include other media types such as images and binary data. For now, in addition to text Messages, you might get crafty and use JSON serialized text to send rich data over the wire in your application.

### Receive Encrypted Messages
You can also be notified of any new incoming Messages with an event handler. This is likely where you would handle updating your user interface to display new Messages.

```js
// Listen for new Messages sent to a Channel
generalChannel.on('messageAdded', function(message) {
    
    // Decrypt the Message using card id and private key values.
    var decryptedMessage = virgil.crypto.decrypt(
        message.body, 
        alice.privateKey
    );
        
    console.log(message.author + ': ' + decryptedMessage);
});
```

*Output:*
```
Darth Vader: Luke. I am your father!
```
