# Adding End-to-End Encryption to Twilio IP Messaging based iOS application.

- [Introduction](#introduction)
- [Install](#install)
- [Getting Started](#getting-started)
    - [Setup Vigil Infrastructure](#setup-virgil-infrastructure)
    - [Managing User Keys](#managing-user-keys)
    - [Chat Channels](#chat-channels)
    - [Sending Encrypted Message to the Channel](#sending-encrypted-message-to-the-channel)
    - [Receiving and Decrypting a Message](#receiving-and-decrypting-a-message)
    - [Verification of the Backend Server Signature](#verification-of-the-backend-server-signature)
- [See also](#see-also)

## Introduction

This application is an example of how to create a secure IP-messaging Android application using Twilio SDK as a transport layer and Virgil Services as a security layer on top of it.

## Install
 
To be able to run the application code you need to install [Android Studio](https://developer.android.com/studio/index.html):
 
## Getting Started

In a Twilio IP Messaging application, *a Channel* is where all the action happens. Whether it's between two users or two hundred, *the Channel* is where *Messages* are sent, received, and archived for later viewing by offline clients.

### Setup Virgil Infrastructure

When a user enters a nickname and presses 'Connect' button the application should first initialize Virgil SDK. To do this the application needs a Virgil Access Token:

###### Java
```
String mVirgilToken = prefs.getString(ApplicationConstants.Prefs.VIRGIL_TOKEN, "");
// ...
ClientFactory clientFactory = new ClientFactory(mVirgilToken);
```

Here the application requests the token from the backend server and the backend server takes it from the [Virgil Dashboard](https://developer.virgilsecurity.com/dashboard/). The access token provides authenticated secure access to Virgil Keys Services and is passed with each API call. The access token also allows the API to associate the app’s requests with a particular Virgil Security developer's account.

The backend server also sends all requests signed using its own private key. The example application will check the signatures of every single response to make sure that a particular response comes from this exact server. For [verification of the signature](#verification-of-the-backend-server-signature) the application needs correspondent public key:

###### Java
```
TDB
```

### Managing User Keys

To use IP-messaging securely each user needs to have his/her own private key (which might and in general have to be stored locally on a particular Android device) and a Virgil Card created in Virgil Keys Service.

When a user tries to connect to the chat using the example application, it searches for the Virgil Card of this particular user: 

###### Java

```java
// Find Public Key at Virgil Key service
SearchCriteria.Builder searchCriteriaBuilder = new SearchCriteria.Builder();
searchCriteriaBuilder
    .setType(ApplicationConstants.IDENTITY_TYPE)
    .setValue(mNickname);

List<VirgilCard> cards = clientFactory.getPublicKeyClient().search(searchCriteriaBuilder.build());
if (cards.isEmpty()) {
    // There is no Virgil Card found for the user.
    // The application will create one automatically for free and will use it.
    // ...
} else {
    // This user is already registered from other device. Show fail message
    // ...
}
```

When there are no user cards found in Virgil Keys Service, the application creates a new one for the user automatically.

###### Java

```java
// Generate new Key Pair
KeyPair keyPair = KeyPairGenerator.generate();
PublicKey publicKey = keyPair.getPublic();
PrivateKey privateKey = keyPair.getPrivate();

// Login Virgil IP Messaging service
LoginResponse loginResponse = login(publicKey.getAsString());

// Register new Virgil Card
ValidatedIdentity identity = new ValidatedIdentity(ApplicationConstants.IDENTITY_TYPE, mNickname);
identity.setToken(loginResponse.getValidationToken());

VirgilCardTemplate.Builder cardTemplateBuilder = new VirgilCardTemplate.Builder();
cardTemplateBuilder.addData("public_key_signature", loginResponse.getApplicationSign());
cardTemplateBuilder.setIdentity(identity);
cardTemplateBuilder.setPublicKey(publicKey);

VirgilCard registeredCard = clientFactory.getPublicKeyClient().createCard(cardTemplateBuilder.build(), privateKey);
String cardId = registeredCard.getId();

// Save identity data for future usage
// ...
```

One of the most important parts in the snippet above is obtaining a validation token. The validation token in general is not required for creating a Card in Virgil Keys Service. However if validation token has not been provided the Card is considered *unconfirmed*. Unconfirmed cards have usage limitations so it is strictly not recommended to use unconfirmed Cards in real life applications. The validation token lets Virgil Service know that this user has completed his/her identity verification by the third party verification system and so it might be trusted in terms of using his/her public key. In the example application the backend service provides correct validation tokens for the chat users. 


### Chat Channels

When user's setup is completed, that user can create a chat channel or join existing one. But first the application has to initialize Twilio SDK: 

###### Java

```java
// Backend server provides a token for Twilio services
mTwilioToken = obtainTwilioToken().getTwilioToken();
// ...
// Create a Twilio Access Manager with provided token
mAccessManager = TwilioAccessManagerFactory.createAccessManager(twilioToken,
        mAccessManagerListener);

TwilioIPMessagingClient.Properties props = new TwilioIPMessagingClient
        .Properties(TwilioIPMessagingClient.SynchronizationStrategy.ALL, 500);

// Initialize Twilio IP Messaging Client
mMessagingClient = TwilioIPMessagingSDK.createClient(mAccessManager, props,
        mMessagingClientCallback);
        
// Register IP Messaging client listener
mMessagingClient.setListener(new IPMessagingClientListener() {
    // ...
});
```

You can find more information about the Twilio setup for Android [here](https://www.twilio.com/docs/api/ip-messaging/guides/quickstart-android).

When Twilio IP Messaging Client is initialized, it notifies its listener with a call of `onClientSynchronization(TwilioIPMessagingClient.SynchronizationStatus synchronizationStatus)`. The example app uses this call to get a list of existing chat channels and present them to the user:

###### Java

```java
// ...
public void onClientSynchronization(
        TwilioIPMessagingClient.SynchronizationStatus synchronizationStatus) {
    loadChannels();
}
// ...
```

User can join one of the existing channels:

###### Java

```java
channel.join(new Constants.StatusListener() {
    @Override
    public void onSuccess() {
        mCurrentChannel = channel;
        
        // Update UI
        // ...

        mCurrentChannel.setListener(mChannelListener);
    }

    @Override
    public void onError(ErrorInfo errorInfo) {
        // Show error message
        // ...
    }
});
```

Or user can create a new channel:

###### Java

```java
Map<String, Object> channelProps = new HashMap<>();
channelProps.put(Constants.CHANNEL_FRIENDLY_NAME, name);
channelProps.put(Constants.CHANNEL_UNIQUE_NAME, name);
channelProps.put(Constants.CHANNEL_TYPE, Channel.ChannelType.CHANNEL_TYPE_PUBLIC);
mMessagingClient.getChannels().createChannel(channelProps,
        new Constants.CreateChannelListener() {
    @Override
    public void onCreated(final Channel channel) {
        if (channel != null) {
            // Channel created, update UI
            // ...
        }
    }

    @Override
    public void onError(ErrorInfo errorInfo) {
        // Show error message
        // ...
    }
});
```

### Sending Encrypted Message to the Channel

The application uses Virgil SDK to encrypt a plain text message entered by the user and then sends that encrypted message with Twilio SDK. 

Encrypt the plain user text:

###### Java

```java
/// ChatViewController.swift: -encryptMessage(:) (l: 105)
///...
/// Convert text to binary data
if let msg = body.dataUsingEncoding(NSUTF8StringEncoding, allowLossyConversion: false) {
    /// Create the Virgil Cryptor object
    let cryptor = VSSCryptor()
    /// Get the channel participants 
    /// (cause it is necessary to encrypt the message 
    /// for all the channel participants so they could decrypt and read it)
    let recipients = self.channel.members.allObjects()
    for member in recipients {
    /// Get the Virgil Card containing the public key 
    /// either from local cache or from the Virgil Keys Service
    if let card = AppState.sharedInstance.cardForIdentity(member.userInfo.identity) {
        do {
            /// Add the Card and the public key as a recipients for encryption 
            try cryptor.addKeyRecipient(card.Id, publicKey: card.publicKey.key, error: ())
        }
        catch let e as NSError {
            print("Error adding key recipient: \(e.localizedDescription)")
        }
    }
}
///...
/// Encrypt data for all channel participants 
if let data = try? cryptor.encryptData(msg, embedContentInfo: true, error: ()) {
    /// return encrypted binary data as a BASE64 string.
    return data.base64EncodedStringWithOptions(.Encoding64CharacterLineLength)
}
///...
```

For the sake of simplicity, the actual message is just a string of text. But it may be easily expanded to include other data types such as images and binary data.

Now send the encrypted message via Twilio SDK:

###### Java

```java
/// ChatViewController.swift: -didPressRightButton(:) (l: 141)
///...
/// `body` contains the encryped text in BASE64 format composed in the previous snippet.
let message = self.channel.messages.createMessageWithBody(body)
/// Twilio TWLChannel's API allows to send a new message to the channel 
self.channel.messages.sendMessage(message, completion: { (result) in
    /// Message sent.
})
///...
```

### Receiving and Decrypting a Message

When a new message arrives to the channel, Twilio IP Messaging Client informs its delegate by a call to `-ipMessagingClient(:, channel:, messageAdded:)`. In this callback function the application can convert `TWLMessage` into any kind of the object it wants to use further locally. The example app uses a Dictionary object, so it just saves a few fields enough for this simple example:

###### Java

```java
/// ChatViewController.swift: -ipMessagingClient(:, client:, messageAdded:) (l: 241)
///...
/// Convert TWMMessage to Dictionary
var mDict = Dictionary<String, AnyObject>()
mDict[Constants.Message.Id] = message.sid
mDict[Constants.Message.Author] = message.author
mDict[Constants.Message.Date] = message.dateUpdated
mDict[Constants.Message.Body] = message.body
        
/// Decrypt message with Virgil SDK and update the UI.
///...
```

To decrypt the message received from Twilio Channel the application uses the private key of currently set up user:

###### Java

```java
/// ChatViewController.swift: -decryptAndCacheMessages(:) (l: 85)
///...
/// For all messages received
for mCandidate in messages {
    /// Convert BASE64 text to binary data (which is actually encrypted message data)
    /// Get current user's Virgil Card object (either from local cache or from Virgil Keys Service) 
    if let mBody = mCandidate[Constants.Message.Body] as? String, 
        mData = NSData(base64EncodedString: mBody, options: .IgnoreUnknownCharacters), 
        card = AppState.sharedInstance.cardForIdentity(AppState.sharedInstance.identity) {
        /// Create Virgil Cryptor object for data decryption
        let decryptor = VSSCryptor()
        /// Try to decrypt the data using current user's private key.
        if let plainData = try? decryptor.decryptData(mData, recipientId: card.Id, privateKey: AppState.sharedInstance.privateKey.key, keyPassword: AppState.sharedInstance.privateKey.password, error: ()) {
            /// If encryption is successful
            /// Compose plain message object descriptor for caching it locally and showing it on the UI.
            var dict = Dictionary<String, AnyObject>()
            dict[Constants.Message.Id] = mCandidate[Constants.Message.Id]
            dict[Constants.Message.Author] = mCandidate[Constants.Message.Author]
            dict[Constants.Message.Date] = mCandidate[Constants.Message.Date]
            /// Decrypted binary data converted to readable string
            dict[Constants.Message.Body] = NSString(data: plainData, encoding: NSUTF8StringEncoding)
            /// Cache the message.
            self.messages.append(dict)
        }
        ///...
    }
    ///...
}
///...
```

### Verification of the Backend Server Signature

When any response is received from the backend server, the response contains a signature in the response headers. The example application verifies this signature before taking any actions on the response data.

###### Java

```java
/// Backend.swift: -verifySignature(:, data:) (l: 213)
///...
var ok = false
/// Convert signature from BASE64 to binary data
if let sigData = NSData(base64EncodedString: signature, options: .IgnoreUnknownCharacters) {
    /// Create a Virgil Signer object which allows to verify signatures.
    let verifier = VSSSigner()
    do {
        /// Try to verify the signature using the server's public key 
        /// which the application downloaded when set up Virgil infrastructure.
        try verifier.verifySignature(sigData, data: data, publicKey: AppState.sharedInstance.appCard.publicKey.key, error: ())
        ok = true
    }
    catch let e as NSError {
        print("Error signature verification: \(e.localizedDescription)")
        ok = false
    }
}
/// Return verification result
return ok
///...
```

In case when `ok` is `false` the response should not be used because it should not be trusted.

## See also

* [Virgil Quickstart](https://github.com/VirgilSecurity/virgil-sdk-x/blob/v3/Docs/quickstart.md)
* [Tutorial Virgil Foundation](https://github.com/VirgilSecurity/virgil-foundation-x/blob/master/README.md)
* [Tutorial Virgil SDK](https://github.com/VirgilSecurity/virgil-sdk-x/blob/v3/Docs/tutorial-sdk.md)
* [Virgil SDK API Reference](http://virgilsecurity.github.io/virgil-sdk-x/)
* [Twilio IP Messaging iOS Quickstart](https://www.twilio.com/docs/api/ip-messaging/guides/quickstart-ios)
* [Virgil + Twilio Chat Server](https://demo-ip-messaging.virgilsecurity.com/)
