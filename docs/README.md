# Quickstart: Adding End-to-End Encryption to Twilio Programmable Chat

## Introduction

With these instructions, you'll learn how to integrate the Virgil Services API with 
Twilio Programmable Chat to build an end-to-end encrypted chat application.

## How it Works - Basics
![IPMessaging](https://github.com/VirgilSecurity/virgil-demo-twilio/blob/master/Images/how-it-works.png)

## Setting up your project

To complete this guide you will need the following:

- Twilio account. ([Sign up here](https://www.twilio.com/try-twilio))
- Virgil Security developer account. ([Sign up here](https://developer.virgilsecurity.com/account/signup))
- Node.js and npm installed. [Download here](https://nodejs.org/en/download/)
(**Important!** The Node.js version must be less than 7, because the Virgil JS SDK is not currently compatible 
with version 7.)
- Be familiar with the [Twilio Programmable Chat](https://www.twilio.com/docs/api/chat) API.
- Basic chat application built using the Twilio Programmable Chat JS SDK. 
[This project](https://github.com/twilio/twilio-chat-demo-js) would be a good starting point.


### Create an application in the Virgil Developer portal

[Sign in](https://developer.virgilsecurity.com/account/signin) to your Virgil Security developer
account and create a new application. Make sure you save the *private key* that is 
generated for your application, you will need it later. After your application is ready, 
create a *token* that your application will use to make authenticated requests to Virgil Services. 
One more thing that you will need is your application's *app id* which is an identifier 
of your application's Virgil Card.


Now when you have the application ready for use, you can start using Virgil Services.

### Download and install the SDK

You can install from npm:
```shell
npm install virgil-sdk --save
```

For browser you can download the source from CDN:

```html
<script 
src="https://cdn.virgilsecurity.com/packages/javascript/sdk/4.0.2/virgil-sdk.min.js"
crossorigin="anonymous"></script>
```

## Usage

### Initialize an API Client

To initialize the client, you need the *access token* that you created for 
your application in the [Virgil Developer Portal](https://developer.virgilsecurity.com/)

```javascript
// var virgil = require('virgil-sdk');
// or just use virgil if you've added virgil sdk via <script> tag
 
var client = virgil.client("[YOUR_ACCESS_TOKEN_HERE]");
```

### Get Started

First of all, for every chat user you will need to perform the following steps:

1. Generate a Public/Private key pair.
2. Publish the Public key (i.e. Virgil Card) in the Virgil Services where it will be available 
for other chat users to use to verify and encrypt data for the key owner.
3. Store the Private key in a secure location on the client side. 

See more about publishing Public keys [here](https://github.com/VirgilSecurity/virgil-sdk-javascript#creating-virgil-cards)

Let's start with generating the keys.

### Generate a New Key Pair

```js
var userKeys = virgil.crypto.generateKeys();

var exportedPublicKey = virgil.crypto.exportPublicKey(userKeys.publicKey); 
var exportedPrivateKey = virgil.crypto.exportPrivateKey(userKeys.privateKey);

// exportedPublicKey and exportedPrivateKey are Node.js Buffer objects

console.log(exportedPublicKey.toString('base64'));
console.log(exportedPrivateKey.toString('base64'));
```
*Output:*

```
MCowBQYDK2VwAyEAW94Hddf0mVNNP8Ffb5BSPee6ajf9h44I/eX7NP1qtLc=

MC4CAQAwBQYDK2VwBCIEIEt6ZTkZm/WjGpguk6iAQqw1u77NG37lefziAXUnXExK
```

### Prepare request to publish the Virgil Card

The next step is to create a `PublishCardRequest`. The `PublishCardRequest` is used to define 
a Virgil Card's properties and publish it in Virgil Security services.

> Virgil Card is representing the main entity at Virgil Security services, it includes the user's 
Public key and identity information.

```js
var publishRequest = virgil.publishCardRequest({
      identity: "alice",
      identity_type: "chat_member",
      public_key: exportedPublicKey.toString('base64')
    });
```

Once you've created the `PublishCardRequest`, you need to sign it using the generated Private key.
This is necessary in order to confirm the ownership of the Private key, as well as provide the card's 
data integrity guarantee.

```js
var requestSigner = virgil.requestSigner(virgil.crypto);
requestSigner.selfSign(publishRequest, userKeys.privateKey);
```

You're almost done with the client side of the process. Now you need to send this request to the 
server side of your application where it has to be signed with your application's private key (AppKey), 
and finally published in the Virgil Security Services.

The `PublishCardRequest` object has a convenience method called `export` that will return the 
base64-encoded string representation of the request suitable for transfer:

```js
var exportedRequest = publishRequest.export();
```

Now you just send the `exportedRequest` to your app's server side using your transport method.

### Publish Virgil Card

Once you receive the `exportedRequest` on the server side, you need to transform it back to the 
`PublishCardRequest` object using another convenience method called `publishCardRequest.import`, 
and then sign it using your application's private key (AppKey).

```js
var publishRequest = virgil.publishCardRequest.import(exportedRequest);

// prepare application credentials

var APP_ID = "[YOUR_APP_ID_HERE]";
var APP_KEY_PASSWORD = "[YOUR_APP_KEY_PASSWORD_HERE]";

// this can either be a Buffer object or a base64-encoded string with the 
// private key bytes
var appPrivateKeyMaterial = "[YOUR_BASE64_ENCODED_APP_KEY_HERE]";
var appPrivateKey = virgil.crypto.importPrivateKey(
        appPrivateKeyMaterial, APP_KEY_PASSWORD);
        
// appPrivateKey is an object that is a handle to the private key and 
// does not hold the Private key value

requestSigner.authoritySign(publishRequest, APP_ID, appPrivateKey);
```

After you sign the request object you can send it to the Virgil Services to conclude the card creation process.

```js
var client = virgil.client('[YOUR_VIRGIL_ACCESS_TOKEN_HERE]');
client.publishCard(publishRequest)
.then(function (memberCard) {
    console.log(memberCard);
    // the new chat user can now exchange encrypted messages with other users
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

### Private key storage

In the current version of the Virgil JS SDK, private key storage is left at the developer's discretion.
However, we strongly suggest you store them in encrypted form. The easiest way to do that is to 
use a password which you pass as a second argument to the `virgil.crypto.exportPrivateKey` method.

### Send Encrypted Messages

To encrypt the data for a chat user, you need their public key which you can get from their Virgil Card. 
You can find a card for a user using the `client.serchCards` method and passing it a list of identities
to search for. A good place to search for cards would be the twilio's `channel.getMembers()` method callback 
or a `'memberJoined'` event handler:

```javascript
// Search for recipient's Virgil Card
channel.getMembers()
.then(function (members) {
    return client.searchCards({ 
        identities: members.map(function (member) { return member.identity; }), 
        type: 'chat_member' 
    });
})
.then(function (cards) {
    // associate the public key from the card with the member
    // don't forget to call virgil.crypto.importPublicKey() before using it
});
```

When you ready to send a message to the channel, you need to get the public keys of channel members
and pass them to `virgil.crypto.encrypt` method along with the message body to get the encrypted
message:

```javascript
var body = $('#message-body-input').val();

// assuming channelMembers is an array of current channel members,
// and a member.publicKey property references an object returned by
// the virgil.crypto.importPublicKey method
var recipients = channelMembers.map(function (member) { return member.publicKey });

var encryptedBody = virgil.crypto.encrypt(message, recipients).toString('base64');
        
channel.sendMessage(encryptedMessage);    
console.log(encryptedMessage);
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

### Receive Encrypted Messages

Now that the messages are sent encrypted, you need to decrypt them with the user's private key
before displaying them on the screen. In your `'messageAdded'` event handler add the following
code:

```javascript
// assuming user is an object and its privateKeyProperty references an object
// returned by the virgil.crypto.importPrivateKey method
var decryptedMessage = virgil.crypto.decrypt(message.body, user.privateKey);
// decryptedMessage is a Buffer object, so you need to convert it to string
// using its toString method
console.log(decryptedMessage.toString());
// display the message
```

*Output:*
```
Darth Vader: Luke. I am your father!
```

Congratulations! Now you have built a basic end-to-end encrypted chat application. 
