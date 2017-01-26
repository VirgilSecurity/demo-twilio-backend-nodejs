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

### Generate a New Key Pair
Generate a new public private key pair for end-to-end encryption

```js
var keyPair = virgil.crypto.generateKeyPair();

console.log(keyPair.publicKey);
console.log(keyPair.privateKey);
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

### Publish a Public Key

Publish a Public Key to the Virgil Keys Service where they are available in an open access for other users (e.g. recipient) to verify and encrypt the data for the key owner. See more about publishing Public Keys [here...](https://virgilsecurity.com/api-docs/javascript/keys-sdk#cards-and-public-keys)

`VALIDATION_TOKEN` - used to prevent an unauthorized cards registration. The **Validation Token** generates based on Application's Private Key and client Identity. See how you can generate it using SDK utilities [here...](https://virgilsecurity.com/api-docs/javascript/keys-sdk#obtaining-a-private-validationtoken)

```js
var options = {
     public_key: keyPair.publicKey,
     private_key: keyPair.privateKey,
     data: {
         public_key_signature: "%PUBLIC_KEY_SIGNATURE%"
     },
     identity: {
         type: 'member',
         value: 'Darth Vader',
         validation_token: '%VALIDATION_TOKEN%'
     }
};

virgil.cards.create(options).then(function (card){
    myCard = card;
    console.log(card);
});
```

*Output:*

```json
{  
   "id":"3e5a5d8b-e0b9-4be6-aa6b-66e3374c05b3",
   "authorized_by":"com.virgilsecurity.twilio-ip-messaging-demo",
   "hash":"QiWtZjZyIQhqZK7+3nZmIEWFBU+qI64EzSuqBcY+E7ZtKPwd4ZyU6gdfU/VzbTn6dHtfahCzHasN...",
   "data": {
      "public_key_signature": "MFcwDQYJYIZIAWUDBAICBQAERjBEAiBc3KaIF1EYzFZ+x4FzSwS4HBBJ..."
   },
   "created_at":"2016-05-03T14:34:08+0000",
   "public_key":{  
      "id":"359abe31-3344-453a-a292-fd98a83e500a",
      "public_key":"-----BEGIN PUBLIC KEY-----\nMFswFQYHKoZIzj0CAQYKKwYBBAGXVQEFAQNCAAQ...",
      "created_at":"2016-05-03T14:34:08+0000"
   },
   "identity":{  
      "id":"965ea277-ab78-442c-93fe-6bf1d70aeb4b",
      "type":"member",
      "value":"Darth Vader",
      "created_at":"2016-05-03T14:34:08+0000"
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
    // Search for the member’s cards on Virgil Keys service
    return virgil.cards.search({ value: member.identity, type: 'member' })
        .then(function(cards){
            return { 
                recipientId: cards[0].id, 
                publicKey: cards[0].public_key.public_key
            };
    });
}).then(function(recipients) {
    var message = $('#chat-input').val();
    var encryptedMessage = virgil.crypto.encryptStringToBase64(message, recipients);
        
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
    var decryptedMessage = virgil.crypto.decryptStringFromBase64(
        message.body, 
        myCard.id, 
        keyPair.privateKey
    );
        
    console.log(message.author + ': ' + decryptedMessage);
});
```

*Output:*
```
Darth Vader: Luke. I am your father!
```
