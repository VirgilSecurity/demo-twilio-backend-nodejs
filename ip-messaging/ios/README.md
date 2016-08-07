# Adding End-to-End Encryption to Twilio IP Messaging based iOS application.

- [Introduction](#introduction)
- [How It Works - Basics](#how-it-works-basics)
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

This application is an example how to create secure iP-messaging iOS applications using Twilio SDK as a transport layer and Virgil Services as a security layer on top of it.

## How It Works - Basics
![IPMessaging](https://github.com/VirgilSecurity/virgil-demo-twilio/blob/master/Images/how-it-works.png)

## Install
 
To be able to run the application code you need to install all required dependencies via [cocoapods](https://guides.cocoapods.org/using/getting-started.html):
 
###### Cocoapods
 
```cocoapods
pod install
```

## Getting Started

In a Twilio IP Messaging application, a Channel is where all the action happens. Whether it's between two users or two hundred, the Channel is where Messages are sent, received, and archived for later viewing by offline clients.

### Setup Virgil Infrastructure

When a user enters a nickname and presses 'Connect' button the application should first initialize Virgil SDK. To do this the application needs a Virgil Access Token:

###### Swift
```
/// AppState.swift: -initVirgil(:) (l: 40)
///...
let token = self.backend.getVirgilAuthToken()
self.virgil = VSSClient(applicationToken: token)
///...
```

Here the application requests the token from the backend server and the backend server takes it from the [Virgil Dashboard](https://developer.virgilsecurity.com/dashboard/). The access token provides authenticated secure access to Virgil Keys Services and is passed with each API call. The access token also allows the API to associate the app’s requests with a particulat Virgil Security developer's account.

The backend server also sends all requests signed using its own private key. The example application will check the signatures of every single response to make sure that a particular response comes from this exact server. For [verification the signature](#verification-of-the-backend-server-signature) the application needs correspondent public key:

###### Swift
```
/// AppState.swift: -getAppCard() (l: 96)
///...
/// Searching the card containing the public key for the backend server
self.virgil.searchAppCardWithIdentityValue(Constants.Backend.AppBundleId, completionHandler: { (cards, error) in
    if let err = error {
        print("Error searching for card: \(err.localizedDescription)")
        ///...
        return
    }
    if let candidates = cards where candidates.count > 0 {
        /// Cache the card locally for further usage.
        self.appCard = candidates[0]
    }
    ///...
})
///...
```

### Managing User Keys

To use ip-messaging securely each user needs to have his/her own private key (which might and in general have to be stored locally on a particular iOS device) and a Virgil Card created on the Virgil Keys Service.

When a user tries to connect to the chat using the example application, it searches for the Virgil Card of this particular user: 

###### Swift

```swift
/// SignInViewController.swift: -searchForExistingCard() (l: 60)
///...
AppState.sharedInstance.virgil.searchCardWithIdentityValue(self.tfNickname.text!, 
    type: Constants.Virgil.IdentityType, unauthorized: false) { (cards, error) in
        ///...
        /// If there is a Virgil Card found 
        /// There should be only one card in response.
        if let candidates = cards where candidates.count > 0 {
            /// Store the Virgil Card received from the service.
            let card = candidates[0]
            /// Cache the card for further usage.
            AppState.sharedInstance.cards[card.identity.value] = card
            /// Get the private key from the keychain:
            let keyChainValue = VSSKeychainValue(id: Constants.Virgil.PrivateKeyStorage, accessGroup: nil)  
            AppState.sharedInstance.privateKey = keyChainValue.objectForKey(card.identity.value) as? VSSPrivateKey
            ///...
        }
        else {
            /// There is no Virgil Cards found for the user.
            /// The application will create one automatically for free and will use it.
            ///...
        }
        ///...
    }
///...
```

When there is no user cards found on the Virgil Keys Service, the application creates a new one for the user automatically.

###### Swift

```swift
/// SignInViewController.swift: -createAndPublishNewCard() (l: 112)
///...
/// Generate the key pair:
let keyPair = VSSKeyPair()
/// Wrap the private key into the convenient wrapper object:
AppState.sharedInstance.privateKey = VSSPrivateKey(key: keyPair.privateKey(), password: nil)
/// Compose the identity info object for the future Virgil Card:
let identityInfo = VSSIdentityInfo(type: Constants.Virgil.IdentityType, value: AppState.sharedInstance.identity)
let validationToken = AppState.sharedInstance.backend.getValidationToken(AppState.sharedInstance.identity, publicKey: keyPair.publicKey())
identityInfo.validationToken = validationToken
AppState.sharedInstance.virgil.createCardWithPublicKey(keyPair.publicKey(), identityInfo: identityInfo, data: nil, privateKey: AppState.sharedInstance.privateKey) { (card, error) in
    if error != nil || card == nil {
        print("Error publishing the Virgil Card: \(error!.localizedDescription)")
        ///...
        return
    }
            
    /// Cache the Virgil Card
    AppState.sharedInstance.cards[card!.identity.value] = card
    /// Store the private key securely in the keychain on this device.
    let keyChainValue = VSSKeychainValue(id: Constants.Virgil.PrivateKeyStorage, accessGroup: nil)
    keyChainValue.setObject(AppState.sharedInstance.privateKey, forKey: card!.identity.value)
    ///...
}
///...
```

One of the most important parts in the snippet above is obtaining a validation token. The validation token in general is not required for creating a Card on the Virgil Keys Service. However if validation token has not been provided the Card is considered *unconfirmed*. Unconfirmed cards have usage limitations so it is strictly not recommended to use unconfirmed Cards in a real life applications. The validation token lets Virgil Service know that this user has completed his/her identity verification by the third party verification system and so it might be trusted in terms of using his/her public key. In the example applicaiton the backend service provides correct validation tokens for the chat users. 


### Chat Channels

When user's setup is completed that user can create a chat channel or join existing one. But first the application have to initialize Twilio SDK: 

###### Swift

```swift
/// AppState.swift: -initTwilio(:) (l: 50)
///...
/// Backend server provides a token for Twilio services
let token = self.backend.getTwilioToken(self.identity, device: UIDevice.currentDevice().identifierForVendor!.UUIDString)
/// Create a Twilio Access Manager with provided token
let accessManager = TwilioAccessManager.init(token: token, delegate: nil)
/// Initialize Twilio IP Messaging Client with access manager and delegate
self.twilio = TwilioIPMessagingClient.ipMessagingClientWithAccessManager(accessManager, properties: nil, delegate: delegate)
///...
```

You can find more information about the Twilio setup for iOS [here](https://www.twilio.com/docs/api/ip-messaging/guides/quickstart-ios).

When Twilio IP Messaging Client is initialized it notifies its delegate with a call to `-ipMessagingClient(:, synchronizationStatusChanged:)`. The example app uses this call to get a list of existing chat channels and present them to the user:

###### Swift

```swift
/// ChatViewController.swift: -prepareForSegue(:, sender:) (l: 68)
///...
/// Get an array of channel descriptor objects from Twilio SDK:
controller.channels = AppState.sharedInstance.twilio.channelsList().allObjects()
///...
```

User can join one of the existing channels:

###### Swift

```swift
/// ChatViewController.swift: -channelsViewController(:, didFinishWithChannel:) (l: 267)
///...
self.channel = channel
self.channel.joinWithCompletion { (result) in
    ///...
    /// Update the UI
}
///...
```

Or user can create a new channel:

###### Swift

```swift
/// ChatViewController.swift: -channelsViewController(:, didAddChannelWithName:) (l: 291)
///...
self.channel = channel
/// In this case we need to assign the unique name to the channel to be able to fetch it later by this unique name.
self.channel.setUniqueName(name, completion: { (result) in
    /// And join the channel in the same way as it was with existing channel.
    self.channel.joinWithCompletion({ (result) in
        ///...
    })
    ///...
})
///...
```

### Sending Encrypted Message to the Channel

The application uses Virgil SDK to encrypt a plain text message entered by the user and then sends that encrypted message with Twilio SDK. 

Encrypt the plain user text:

###### Swift

```swift
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

For the sake of simplicity the actual message is just a string of text. But it may be easily expanded to include other data types such as images and binary data.

Now send the encrypted message via Twilio SDK:

###### Swift

```swift
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

When a new message arrives to the channel Twilio IP Messaging Client informs its delegate by a call to `-ipMessagingClient(:, channel:, messageAdded:)`. In this callback function the application can convert TWLMessage into any kind of the object it wants to use further locally. The example app uses a Dictionary object, so it just saves a few fields enough for this simple example:

###### Swift

```swift
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

###### Swift

```swift
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

When any response received from the backend server, the response contains a signature in the response headers. The example application verifies this signature before taking any actions on the response data.

###### Swift

```swift
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

In case when `ok` is `false` the response should not be touched because it should not be trusted.

## See also

* [Virgil Quickstart](https://github.com/VirgilSecurity/virgil-sdk-x/blob/v3/Docs/quickstart.md)
* [Tutorial Virgil Foundation](https://github.com/VirgilSecurity/virgil-foundation-x/blob/master/README.md)
* [Tutorial Virgil SDK](https://github.com/VirgilSecurity/virgil-sdk-x/blob/v3/Docs/tutorial-sdk.md)
* [Virgil SDK API Reference](http://virgilsecurity.github.io/virgil-sdk-x/)
* [Twilio IP Messaging iOS Quickstart](https://www.twilio.com/docs/api/ip-messaging/guides/quickstart-ios)
* [Virgil + Twilio Chat Server](https://demo-ip-messaging.virgilsecurity.com/)