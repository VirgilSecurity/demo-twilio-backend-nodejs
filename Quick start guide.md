# Channels and Messages with Virgil Security adjustments

In an IP Messaging application, a Channel is where all the action happens. Whether it's between two users or two hundred, a Channel is where messages are sent, received, and archived for later viewing by offline clients. Let's dive into a few of the key techniques you'll need to employ while working with channels and messages in your application. We will also apply the end-to-end encryption using Virgil Security insfractructure.

* [Virgil Security infrastructure adjustments](#user-content-virgil-security-infrastructure-adjustments)
  * [Register Virgil developer's account](#user-content-register-virgil-developers-account)
  * [Generate new key pair for end-to-end encryption](#user-content-generate-new-key-pair-for-end-to-end-encryption)
  * [Publish the public key to the Virgil Keys service](#user-content-publish-the-public-key-to-the-virgil-keys-service)
* [Create a channel](#user-content-create-a-channel)
* [Send encrypted messages to a channel](#user-content-send-encrypted-messages-to-a-channel)
* [Receive encrypted messages on a channel and decrypt them](#user-content-receive-encrypted-messages-on-a-channel-and-decrypt-them)

Note: All of these samples assume you have created your authenticated IP Messaging client. Read more about Identity and Tokens.

## Virgil Security infrastructure adjustments
### Register Virgil developer's account
As a first step, you’ll need to create a development account on https://virgilsecurity.com/account/signin to receive 
an access token to perform calls to Virgil API services. The access token looks like `45fd8a505f50243fa8400594ba0b2b29` 
and will be used to instantiate Virgil SDK client in the code below.

### Generate new key pair for end-to-end encryption
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

## Create a channel

Before you can start sending messages, you first need a Channel to send them to. Here is how you create a channel.

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

## Send encrypted messages to a channel

Once you're a member of a channel, you can send a message to it. A message is a bit of data that is sent first to the Twilio backend where it is stored for later access by members of the channel, and then pushed out in real time to all channel members that are currently online. Only users subscribed to your channel will receive your messages.

```javascript
// Receive the list of channel's recipients
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

Today, a message is just a string of text. In the future, this may expand to include other media types, like images and binary data. For now, in addition to text messages, you might get crafty and use JSON serialized text to send rich data over the wire in your application.


## Receive encrypted messages on a channel and decrypt them

You can also be notified of any new incoming messages with an event handler. This is likely where you would handle updating your user interface to display new messages.

```javascript
// Listen for new messages sent to a channel
myChannel.on('messageAdded', function(message) {
    // Decrypt the message using global public key id and private key values.
    var decryptedMessage = Virgil.Crypto.decrypt(message.body, keyPair);
    console.log(message.author, decryptedMessage);
});
```
