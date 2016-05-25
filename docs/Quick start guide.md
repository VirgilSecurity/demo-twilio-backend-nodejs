# Changes required to use Virgil Security's security infrastructure with Twilio IP Messaging

In a Twilio IP Messaging application, a Channel is where all the action happens. Whether it's between two users or two hundred, a Channel is where Messages are sent, received, and archived for later viewing by offline clients.

Let's dive into a few of the key techniques you'll need to employ while working with Channels and Messages in your application. Let's also apply end-to-end encryption using Virgil Security's infrastructure.

* [Virgil Security Changes](#user-content-virgil-security-changes)
  * [Register a Virgil Security developer's account](#user-content-register-a-virgil-security-developers-account)
  * [Install and Initialize](#install-and-initialize)
  * [Generate a new public / private key pair for end-to-end encryption](#user-content-generate-a-new-public-private-key-pair-for-end-to-end-encryption)
  * [Publish a Public Key to Virgil Keys Service](#publish-a-public-key-to-virgil-keys-service)
  * [Create a Channel](#user-content-create-a-channel)
  * [Send encrypted Messages to a Channel](#user-content-send-encrypted-messages-to-a-channel)
  * [Receive encrypted Messages on a Channel and decrypt them](#user-content-receive-encrypted-messages-on-a-channel-and-decrypt-them)

Note: All of these samples assume you have created your authenticated IP Messaging client. [Read more]( https://github.com/VirgilSecurity/virgil/blob/master/javascript/keys-sdk/readme.md#identities) about Identity and Tokens.

## Virgil Security Changes
### Register a Virgil Security developer's account
As a first step, you’ll need to create a developer's account on https://developer.virgilsecurity.com/account/signin to receive 
an access token to perform calls to Virgil API services. The access token looks like `45fd8a505f50243fa8400594ba0b2b29...` 
and will be used to instantiate Virgil SDK client [in the code below](#code).

### Install and Initialize

##### NPM
```
npm install virgil-sdk
```
##### Bower
```
bower install virgil-sdk

```
##### CDN
```html
<script 
src="https://cdn.virgilsecurity.com/packages/javascript/sdk/1.4.1/virgil-sdk.min.js" 
integrity="sha256-oa5PdJUfmpmSk0q08WejIusp7epaht49i8NKSf6uoJo="
crossorigin="anonymous"></script>
```

Use code below to initialize global variable of VirgilSDK.
<a name="code"></a>
```js
var virgil = new VirgilSDK("%ACCESS_TOKEN%");
```

### Generate a new public private key pair for end-to-end encryption
```js
var keyPair = virgil.crypto.generateKeyPair('KEYS_PASSWORD_GOES_HERE');
console.log('Generated key pair:');
console.log(keyPair);
```

### Publish a Public Key to Virgil Keys Service

See how to obtain an **ValidationToken** [here...](https://virgilsecurity.com/api-docs/javascript/keys-sdk#obtaining-a-private-validationtoken).

```js
var myCard;
var validationToken = '%VALIDATION_TOKEN%';

// Send confirmation request and get temporary validation token. 
virgil.cards.create({ 
        public_key: keyPair.publicKey,
        private_key: keyPair.privateKey,
        identity: {
            type: 'member',
            value: 'chat_user',
            validation_token: validationToken
        }
    });
}).then(function (createdCard){
    myCard = createdCard;
});
```

## Create a Channel

Before you can start sending Messages, you first need a Channel. Here is how you create a Channel.

```js
// Create a Channel
messagingClient.createChannel({
    uniqueName: 'general',
    friendlyName: 'General Chat Channel'
}).then(function(channel) {
    console.log('Created general channel:');
    console.log(channel);
});
```

## Send encrypted Messages to a Channel

Once you're a member of a Channel, you can send a Message to it. A Message is a bit of data that is sent first to the Twilio backend, where it is stored for later access by members of the Channel, and then pushed out in real time to all currently online Channel members. Only users subscribed to your Channel will receive your Messages.

```javascript
// Receive the list of Channel's recipients
myChannel.getMembers().map(function(member) {
    // Search for the member’s cards on Virgil Keys service
    return virgil.cards.search({ 
        value: member.identity 
    }).then(function(cards){
        return { recipientId: cards[0].id, publicKey: cards[0].public_key.public };
    })
}).then(function(recipients) {
    var msg = $('#chat-input').val();
    var encryptedMsg = virgil.crypto.encryptStringToBase64(msg, recipients);
    myChannel.sendMessage(encryptedMsg);    
});
```

Today, a Message is just a string of text. In the future, this may expand to include other media types such as images and binary data. For now, in addition to text Messages, you might get crafty and use JSON serialized text to send rich data over the wire in your application.


## Receive encrypted Messages on a Channel and decrypt them

You can also be notified of any new incoming Messages with an event handler. This is likely where you would handle updating your user interface to display new Messages.

```javascript
// Listen for new Messages sent to a Channel
myChannel.on('messageAdded', function(message) {
    // Decrypt the Message using global public key id and private key values.
    var decryptedMessage = virgil.crypto.decryptStringFromBase64(message.body, myCard.id, keyPair.privateKey);
    console.log(message.author, decryptedMessage);
});
```
