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
String deviceId = Settings.Secure.getString(mContext.getContentResolver(),
        Settings.Secure.ANDROID_ID);

Response<TwilioToken> response =
        mService.getTwilioToken(mIdentity, deviceId).execute();

if (response.isSuccessful()) {
    String twilioToken = response.body().getTwilioToken();
    // Save token
} else {
    // Token couldn't be obtained
}
// ...
// Create a Twilio Access Manager with provided token
mAccessManager = TwilioAccessManagerFactory.createAccessManager(twilioToken,
        mAccessManagerListener);

TwilioIPMessagingClient.Properties props =
        new TwilioIPMessagingClient.Properties(
            TwilioIPMessagingClient.SynchronizationStrategy.ALL, 500);

// Initialize Twilio IP Messaging Client
mMessagingClient = TwilioIPMessagingSDK.createClient(mAccessManager, props,
        mMessagingClientCallback);
```

You can find more information about the Twilio setup for Android [here](https://www.twilio.com/docs/api/ip-messaging/guides/quickstart-android).

When Twilio IP Messaging Client is initialized, it notifies its listener with a call of `onClientSynchronization(TwilioIPMessagingClient.SynchronizationStatus synchronizationStatus)`. The example app uses this call to get a list of existing chat channels and present them to the user:

###### Java

```java
// ...
public void onClientSynchronization(
        TwilioIPMessagingClient.SynchronizationStatus synchronizationStatus) {
    updateChannels();
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
        mCurrentChannel.setListener(mChannelListener);

        // Update UI
        // ...
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
mMessagingClient.getChannels().createChannel(channelProps, new Constants.CreateChannelListener() {
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
    }
});
```

### Sending Encrypted Message to the Channel

The application uses Virgil SDK to encrypt a plain text message entered by the user and then sends that encrypted message with Twilio SDK. 

Encrypt the plain user text:

###### Java

```java
// Build message
ChannelMessage message = new ChannelMessage();
message.setBody(messageBody);
message.setAuthor(mIdentity);
message.setDate(new Date().getTime());
message.setId(UUID.randomUUID().toString());

// Show message at chat immediatelly
//...

// Sent message with Twilio
            twilioFacade.sendMessage(mGson.toJson(message));

//...
/// Encrypt data for all channel participants
String encryptedMessage = message;
Map<String, PublicKey> recipientsMap = new HashMap<>();
for (String identity : recipients) {
    try {
        MessageRecipient recipient = getRecipient(identity);
        recipientsMap.put(recipient.getCardId(), recipient.getPublicKey());
    }
    catch (RecipientNotFoundException e) {
        Log.e(TAG, "Recipient not found: " + identity);
    }
    // Encode message body
    if (!recipientsMap.isEmpty()) {
        try {
            encryptedMessage = CryptoHelper.encrypt(message, recipientsMap);
        } catch (Exception e) {
            Log.e(TAG, "Can't encrypt message");
        }
    }
}
//...
```

For the sake of simplicity, the actual message is just a string of text. But it may be easily expanded to include other data types such as images and binary data.

Now send the encrypted message via Twilio SDK:

###### Java

```java
// Sent message with Twilio channel
com.twilio.ipmessaging.Message message = mActiveChannel.getMessages().createMessage(encryptedMessage);

mActiveChannel.getMessages().sendMessage(message, new Constants.StatusListener() {
        @Override
        public void onSuccess() {
            Log.d(TAG, "Message sent succesfully");
        }

        @Override
        public void onError(ErrorInfo errorInfo) {
            Log.e(TAG, "Error sending message: " + errorInfo.getErrorText());
        }
});

///...
```

### Receiving and Decrypting a Message

When a new message arrives to the channel, `ChannelListener.onMessageAdd` method called. In this callback function the application can decode Twilio `Message` and convert it into any kind of the object it wants to use further locally.

###### Java

```java
private ChannelListener mChannelListener = new ChannelListener() {
//...

    public void onMessageAdd(final com.twilio.ipmessaging.Message message) {
        Log.d(TAG, "Message added");

        mMessageProcessor.decodeMessage(message.getMessageBody(), new MessageProcessor.MessageProcessingListener() {
                @Override
                public void onSuccess(String result) {
                    Bundle b = new Bundle();
                    b.putString(DECRYPTED_MESSAGE, result);
                    
                    // Notify UI about new message received
                    //...
                }

                @Override
                public void onFail() {
                    Log.e(TAG, "Can't add message");
                }
        });
    }
//...
};
```

To decrypt the message received from Twilio Channel the application uses the private key of currently set up user:

###### Java

```java
String decodedMessage = "";
try {
    decodedMessage = CryptoHelper.decrypt(message, mCardId, mPrivateKey);
} catch (Exception e) {
    Log.e(TAG, "Can't decrypt message");
}
//...
```

## See also

* [Virgil Quickstart](https://github.com/VirgilSecurity/virgil-sdk-x/blob/v3/Docs/quickstart.md)
* [Tutorial Virgil Foundation](https://github.com/VirgilSecurity/virgil-foundation-x/blob/master/README.md)
* [Tutorial Virgil SDK](https://github.com/VirgilSecurity/virgil-sdk-x/blob/v3/Docs/tutorial-sdk.md)
* [Virgil SDK API Reference](http://virgilsecurity.github.io/virgil-sdk-x/)
* [Twilio IP Messaging iOS Quickstart](https://www.twilio.com/docs/api/ip-messaging/guides/quickstart-ios)
* [Virgil + Twilio Chat Server](https://demo-ip-messaging.virgilsecurity.com/)
