# Twilio quick start guide adjustments for end-to-end encryption using Virgil Security services

As a next step let’s apply Virgil Security security layer to the chat application to make all the data end-to-end encrypted.

### Register Virgil developer's account
As a first step, you’ll need to create a development account on https://virgilsecurity.com/account/signin to receive 
an access token to perform calls to Virgil API services. The access token looks like `45fd8a505f50243fa8400594ba0b2b29` 
and will be used to instantiate Virgil SDK client in the code below.

### Include Virgil Security JavaScript SDK
Then you’ll need to include the Virgil Keys JavaScript SDK to the script from the previous step:
```
<script src="//media.twiliocdn.com/sdk/rtc/js/ip-messaging/v0.8/twilio-ip-messaging.min.js"></script>
<script src="https://cdn.virgilsecurity.com/data/js/virgil-sdk-keys-public/latest/virgil-sdk-keys-public.min.js"></script>
<script src="//ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
```

### Adjust the code to add end-to-end encryption
At last you can add adjust the code from the previous step to add end-to-end encryption.
```js
// Global references to key objects
var messagingClient; // handle for Twilio.IPMessaging.Client instance
var identity; // the current user's unique ID, like an email or username
var currentChannel; // the current IP Messaging channel
// Instantiate Virgil Keys services SDK client with the access token
// obtained on https://virgilsecurity.com/account/signin page and Virgilc Crypto helper
var vsKeysService = new VirgilSDK.PublicKeysService("45fd8a505f50243fa8400594ba0b2b29");
var vsCryptoHelper = new VirgilSDK.Crypto();
// Global variables that contain Public Key ID and Private Key value for the
// current client. It’s highly recommended to use some storage for them and
// not to keep them without hashing/encryption
var currentUserPublicKeyId;
var currentUserPrivateKey;
 
// Initialize application on window load
$(function() {
    identity = prompt('Please enter a username:', 'alice').trim();
 
    // After identity entered, fetch capability token from server
    $.getJSON('/token.php', {
        identity: identity,
        deviceId: 'browser' // Ideally, this would be a unique device ID
    }, function(data) {
        // Initialize Twilio IP Messaging Client
        messagingClient = new Twilio.IPMessaging.Client(data.token);

        createVsKeyPair()
            .then(pushUserPublicKeyToTheVsKeysService)
            .then(function() {
                // Create a default channel
                return messagingClient.createChannel({
                    friendlyName: identity + "'s Channel"
                })
            .then(function(channel) {
                // Join the channel
                channel.join();
                // Setup event listeners on the channel
                setupChannelListeners(channel);
                // put the channel in the global scope
                currentChannel = channel;
                info('Signed in as "' + identity + '".');
            });
        });
    });
 
    // Post new chat message
    $('form').on('submit', function(e) {
        e.preventDefault();
        var msg = $('input').val();
        // Encrypt the message for all channel recipients
        encryptMessage(msg)
		.then(function(encryptedMsg) {
                $('input').val('');
                currentChannel.sendMessage(encryptedMsg);
            });
    });
});
 
// Configure UI and event callbacks for a channel
function setupChannelListeners(channel) {
 
    channel.getMessages().then(function (messages) {
        for (msg in messages) {
            chat(channel.sid, messages[msg].author, messages[msg].body)
        }
    })
 
    // Set up listener for new messages on channel
    channel.on('messageAdded', function(message) {
        // add message to the chat box
        chat(channel.sid, message.author, message.body);
    });
}
 
function append(html) {
    var $messages = $('#messages');
    $messages.append(html);
    $messages.animate({
        scrollTop: $messages[0].scrollHeight
    }, 200);
}
 
function chat(sid, user, encryptedMessage) {
    // Instantiate new Crypto object and decrypt the message using global
    // public key id and private key values.
    var decryptedMessage = vsCryptoHelper.decryptWithKey(
        encryptedMessage,
        currentUserPublicKeyId,
        currentUserPrivateKey
    );
    var m = '<div class="chat"><span>' + user + ': </span>' + decryptedMessage + '</div>';
    append(m); 
}
 
function info(msg) {
    var m = '<div class="info">' + msg + '</div>';
    append(m);
}


/**
 * Creates new key pair for the user
 * @returns {Object}
 */
function createVsKeyPair() {
    return vsCryptoHelper.generateKeysAsync('', 'KEYS_PASSWORD_GOES_HERE')
        .then(function(keys) {
            var keyPair = {
                publicKey: keys.publicKey,
                privateKey: keys.privateKey
            };
}


/**
 * Persists user’s public key to the Virgil Security Keys service
 * @param {Object} keyPair
 * @param {String} keyPair.public_key
 * @param {String} keyPair.privateKey
 */
function pushUserPublicKeyToTheVsKeysService(keyPair) {
    // Special identity descriptor that is used to match public key with user identity
    var userIdentityDescriptor = [{
        'class': 'user_id',
        'type': 'username',
        'value': identity
    }];

    var virgilPublicKey = new VirgilSDK.PublicKey(keyPair.publicKey, userIdentityDescriptor);
    var virgilPrivateKey = new VirgilSDK.PrivateKey(keyPair.privateKey);

    vsKeysService.addKey(virgilPublicKey, virgilPrivateKey.KeyBase64).then(
        function(response) {
            // Save public and private keys values to the global variables
            currentUserPublicKeyId = response.id.public_key_id;
            virgilPrivateKey = keyPair.privateKey;
        })
    ));
}


/**
 * Encrypts the message for all channel members
 * @param {String} message - the message to be encrypted
 * @returns {Promise<String>}
 */
function encryptMessage(message) {
	return getChannelMembersPublicKeys(currentChannel)
          .then(function(recipients() {
	        return vsCryptoHelper.encryptWithKeyMultiRecipientsAsync(message, recipients);
          }));
}


/**
 * Returns public keys list for all participants in the channel
 * @param {Object} channel - The Twilio channel object
 * @returns {Promise <Object[]>}
 */
function getChannelMembersPublicKeys(channel) {
    var recipients = [];
    // Iterate through all channel members
    return channel.getMembers()
        .each(function(member){
            return vsKeysService
                       // Search for the member’s key on Virgil Keys service
                      .searchKey(member.identity)
                      .then(function(result) {
                          // Compose the recipient’s object from the Virgil Keys service
                          // response
                          recipients.push({
                              public_key_id : result.id.public_key_id,
                              public_key: result.public_key
                          });
                      });
             })
         .then(function() {
             return recipients;
         })
}
```
