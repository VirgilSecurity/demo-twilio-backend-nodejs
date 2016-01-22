# Changes required to use Virgil Security's security infrastructure with Twilio IP Messaging

In a Twilio IP Messaging application, a Channel is where all the action happens. Whether it's between two users or two hundred, a Channel is where Messages are sent, received, and archived for later viewing by offline clients.

Let's dive into a few of the key techniques you'll need to employ while working with Channels and Messages in your application. Let's also apply end-to-end encryption using Virgil Security's security infrastructure.

* [Virgil Security Changes](#user-content-virgil-security-changes)
  * [Register a Virgil Security developer's account](#user-content-register-a-virgil-security-developers-account)
  * [Install and Initialize](#install-and-initialize)
  * [Generate a new public / private key pair for end-to-end encryption](#user-content-generate-a-new-public-private-key-pair-for-end-to-end-encryption)
  * [Publish the public key to the Virgil Keys service](#user-content-publish-the-public-key-to-the-virgil-keys-service)
  * [Create a Channel](#user-content-create-a-channel)
  * [Send encrypted Messages to a Channel](#user-content-send-encrypted-messages-to-a-channel)
  * [Receive encrypted Messages on a Channel and decrypt them](#user-content-receive-encrypted-messages-on-a-channel-and-decrypt-them)

Note: All of these samples assume you have created your authenticated IP Messaging client. Read more about Identity and Tokens.

## Virgil Security Changes
### Register a Virgil Security developer's account
As a first step, you’ll need to create a development account on https://developer.virgilsecurity.com/account/signin to receive 
an access token to perform calls to Virgil API services. The access token looks like `45fd8a505f50243fa8400594ba0b2b29` 
and will be used to instantiate Virgil SDK client in the code below.

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
<script src="https://cdn.virgilsecurity.com/packages/javascript/sdk/latest/virgil-sdk.min.js"></script>
```

### Initialization
```js
var Virgil = window.VirgilSDK;
var virgil = new Virgil("%ACCESS_TOKEN%");
```

### Generate a new public private key pair for end-to-end encryption
```javascript
var keyPair = Virgil.Crypto.generateKeys('', 'KEYS_PASSWORD_GOES_HERE');

// Instantiate Virgil Keys client with developer's access token
var vsKeysService = new Virgil.PublicKeysService('45fd8a505f50243fa8400594ba0b2b29');
```

### Publish the public key to the Virgil Keys service
```javascript
// Global variables to store public key id and private key value
var currentUserPublicKeyId;
var currentUserPrivateKey;

// Special identity descriptor that is used to match a public key with a user identity
var userIdentity = [{
    'class': 'user_id',
    'type': 'username',
    'value': 'User nickname'
}];

// Publish the key to the Virgil Keys infrastructure to make available for other users
vsKeysService.publish(keyPair, userIdentity).then(
    function(response) {
        // Save public and private keys values to the global variables for further encryption / decryption
        currentUserPublicKeyId = response.id.public_key_id;
        currentUserPrivateKey = keyPair.privateKey;
    })
)); 
```

## Create a Channel

Before you can start sending Messages, you first need a Channel. Here is how you create a Channel.

```javascript
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
myChannel.getMembers()
    .map(function(member) {
        // Search for the member’s key on Virgil Keys service
        return vsKeysService.searchKey(member.identity)
    })
    .then(function(recipients) {
        var msg = $('#chat-input').val();
        var encryptedMsg = Virgil.Crypto.encrypt(message, recipients);
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
    var decryptedMessage = Virgil.Crypto.decrypt(message.body, keyPair);
    console.log(message.author, decryptedMessage);
});
```
