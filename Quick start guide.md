# Channels and Messages (with Virgil Security on board)

In an IP Messaging application, a Channel is where all the action happens. Whether it's between two users or two hundred, a Channel is where messages are sent, received, and archived for later viewing by offline clients. Let's dive into a few of the key techniques you'll need to employ while working with channels and messages in your application. We will also apply the end-to-end encryption using Virgil Security insfractructure.

Create Virgil Security key
Create a channel
Join a channel
Send encrypted messages to a channel
Receive encrypted messages on a channel and decrypt them
Invite other users to a channel
Accept an invitation to a channel
Get a list of channels
Subscribe for channel events
Delete a channel
Note: All of these samples assume you have created your authenticated IP Messaging client. Read more about Identity and Tokens.

## Create Virgil Security key
### Register Virgil developer's account
As a first step, you’ll need to create a development account on https://virgilsecurity.com/account/signin to receive 
an access token to perform calls to Virgil API services. The access token looks like `45fd8a505f50243fa8400594ba0b2b29` 
and will be used to instantiate Virgil SDK client in the code below.

### Generate new key pair for end-to-end encryption
```javascript
var generateKeyPair = Virgil.Crypto.generateKeysAsync('', 'KEYS_PASSWORD_GOES_HERE');
```

### Push the public key to the Virgil Keys service
```javascript
// Global variables to store public key id and private key valu
var currentUserPublicKeyId;
var currentUserPrivateKey;

// Special identity descriptor that is used to match a public key with a user identity
var userIdentity = [{
    'class': 'user_id',
    'type': 'username',
    'value': 'User nickname'
}];

generateKeyPair.then(function(keyPair) {
    var vsKeysService = new Virgil.PublicKeysService('45fd8a505f50243fa8400594ba0b2b29');
    
    vsKeysService.publish(keyPair, userIdentity).then(
        function(response) {
            // Save public and private keys values to the global variables
            currentUserPublicKeyId = response.id.public_key_id;
            currentUserPrivateKey = keyPair.privateKey;
        })
    )); 
});
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

## Join a channel

Once you've created a channel, you must join it to begin receiving or sending messages on that channel.

```javascript
// Join a previously created channel
myChannel.join().then(function(channel) {
    console.log('Joined channel' + channel.friendlyName) 
});
```

## Send messages to a channel

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
        var encryptedMsg = vsCrypto.encrypt(message, recipients);
        myChannel.sendMessage(encryptedMsg);    
    });
```

Today, a message is just a string of text. In the future, this may expand to include other media types, like images and binary data. For now, in addition to text messages, you might get crafty and use JSON serialized text to send rich data over the wire in your application.


## Receive messages on a channel

With a channel object in hand, you can access a list of all previous messages that have been sent to the channel.

```javascript
// Get Messages for a previously created channel
myChannel.getMessages().then(function(messages) {
  var totalMessages = messages.length;
  for (i=0; i<messages.length; i++) {
    var message = messages[i];
    console.log('Author:' + message.author);
  }
  console.log('Total Messages:' + totalMessages);
});
```

You can also be notified of any new incoming messages with an event handler. This is likely where you would handle updating your user interface to display new messages.

```javascript
// Listen for new messages sent to a channel
myChannel.on('messageAdded', function(message) {
    // Instantiate new Crypto object and decrypt the message using global
    // public key id and private key values.
    var decryptedMessage = vsCrypto.decryptWithKey(
        message.body,
        currentUserPublicKeyId,
        currentUserPrivateKey
    );
    
    console.log(message.author, decryptedMessage);
});
```

## Invite other users to a channel

Sometimes you might feel lonely in a channel. Rather than sending messages to yourself, you could invite a friend to come and chat! It doesn't matter if the channel is public or private, you are always able to invite another user to any channel you own.

```javascript
// Invite another member to your channel
myChannel.invite('elmo').then(function() {
  console.log('Your friend has been invited!');
});
```
Accept an invitation to a channel

Social acceptance is a great feeling. Accepting an invite to a channel means you too can partake in glorious banter with other channel members.

## Accepting an Invite
```javascript
// Listen for new invitations to your Client
messagingClient.on('channelInvited', function(channel) {
  console.log('Invited to channel ' + channel.friendlyName);
  // Join the channel that you were invited to
  channel.join();
});
```
## Get a list of channels

Retrieving channels lets you perform actions on them as a user (e.g join, display, etc.) You'll only be able to view public channels and any private channels your user can access.

```javascript
// Get Messages for a previously created channel
messagingClient.getChannels().then(function(channels) {
  for (i=0; i<channels.length; i++) {
    var channel = channels[i];
    console.log('Channel: ' + channel.friendlyName);
  }
});
```
## Subscribe for channel events

Channels are a flurry of activity. Members join and leave, messages are sent and received, and channel states change. As a member of a channel, you'll want to know the status of the channel. You might want to receive a notification if the channel has been deleted or changed. Channel event listeners help you do just that.

These event listeners will notify your app when a channel's state changes. Once it does, you can perform the necessary actions in your app to react to it.

Handle Channel Events
```javascript
// A channel has become visible to the Client
messagingClient.on('channelAdded', function(channel) {
  console.log('Channel added: ' + channel.friendlyName);
});
// A channel is no longer visible to the Client
messagingClient.on('channelRemoved', function(channel) {
  console.log('Channel removed: ' + channel.friendlyName);
});
// A channel's attributes or metadata have changed.
messagingClient.on('channelUpdated', function(channel) {
  console.log('Channel updates: ' + channel.sid);
});
```
These event listeners will notify your app when channel members perform some sort of action. Namely when they leave, join, change, or start/stop typing.

Handle Member
```javascript
// Listen for members joining a channel
myChannel.on('memberJoined', function(member) {
  console.log(member.identity + 'has joined the channel.');
});
// Listen for members joining a channel
myChannel.on('memberLeft', function(member) {
  console.log(member.identity + 'has left the channel.');
});
// Listen for members typing
myChannel.on('typingStarted', function(member) {
  console.log(member.identity + 'is currently typing.');
});
// Listen for members typing
myChannel.on('typingEnded', function(member) {
  console.log(member.identity + 'has stopped typing.');
});
```

## Delete a Channel

Deleting a channel both deletes the message history and removes all members from it.

Delete a Channel
```javascript
// Delete a previously created Channel
myChannel.delete().then(function(channel) {
  console.log("Deleted channel: " + channel.sid);
})
```javascript
You can only delete channels that you have permissions to delete and deleting a channel means it cannot be retrieved at a later date for any reason. Do so carefully!

Now that you know all there is to know about channels, might we suggest learning more about the REST API? With the REST API, you can execute many of these same actions from your server-side code as well.
