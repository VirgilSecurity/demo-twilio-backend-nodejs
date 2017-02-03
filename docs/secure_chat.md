# End-to-End Encrypted Chat with Virgil and Twilio APIs


## Terms

- **AppKey** - public/private key is generated at the time of creation of your application on Virgil's Developer Dashboard. *AppKey* is used to sign a user's *ClientCard*. Public key associated with your app can later be used to validate users. 
- **ClientKey** - public/private key pair is generated per user per device after the user has been authenticated. The *ClientKey* never leaves the device and is stored in a secure place defined by the platform (iOS/Android/Yubikey etc).
- **ClientCard** - public key (and information about user/device) is generated at the same time as *ClientKey* and represents a users public identity card use to create end-to-end encrypted chat, send encrypted files, authenticate users without passwords.
- **OrgKey** - private key, is generated at the time of application server setup. The **OrgKey** is used to provide backup of messages history if this is enabled by the developer.
- **OrgCard** - public key (and information about Organization), is generated in pair with the *OrgKey* and represents an Organization on Virgil service;

## Client Registration

During registration client generates a new pair of public/private keys. Private key is stored as *ClientKey* on the local device. Public key with additional information about the user and the device is sent to the developer's server as *ClientCard* (with the signature of the owner - *ClientKey*). All *ClientCard*s are validated and signed by the AppKey, whereupon *ClientCard* (with two signatures - *ClientKey*, *AppKey*) are registered with the Virgil Key Management Service.

> Neither developer's server nor Virgil have access to *ClientKey*. The *ClientKey* is stored only on the device where it was generated and is never uploaded.

SDK allows registration of multiple devices per user. Each device generates its own pair of *ClientKey* and *ClientCard*. Virgil's key management and SDK will automatically handle encryption for the users with multiple devices.

## Message Exchange

After successful registration client is ready to exchange messages with other clients of the application.

> Messages Exchanging within an application is carried by means of the application itself or such services as Twilio, etc.

The exchange of encrypted Messages between users of application:

1. *User1* sends message to *User2* (who works in organization):
  `EncMsg = Enc(Msg, Card-X, Card-XY, Card-XYZ)`
2. *User2* decrypts message using one of his device: `Msg = Dec(EncMsg, User2Key)`
3. Optional: *User2* re-encrypts message for the Organization to do backup: `OrgEncMsg = Enc(Msg, OrgCard)`.
4. Optional: *User2* sends re-encrypted message to the service.

> Steps 3 and 4 should be performed if the Organization takes part in message history synchronization.

![IPMessaging](https://github.com/VirgilSecurity/virgil-demo-twilio/blob/master/Images/exchanging_messages_new.png)

History sync can be done by either:

1. Storing and re-sending EncMsg when it's needed
2. Re-encrypting OrgEncMsg (if server has one) and sending to User1/User2

## Message Encryption

1. The Sender searches for all recipients on Virgil Service and receives a list of their *ClientCard*s (considering all devices). 
2. The Sender generates a digital signature for the message using *ClientKey*. 
3. The Sender encrypts the message and the digital signature using the Public keys of recipients, that were extracted from *ClientCard*s. 
4. Sending of the encrypted messages to the recipients. 
5. The Recipient searches for the sender on Virgil Service and receives his *ClientCard*
6. The Recipient decrypts message, received from the sender, using Recipient’s *ClientKey*. 
7. The Recipient extracts the digital signature from the decrypted message and verifies it using the sender's *ClientCard*.

## Cards Verification 

The clients at the both sides automatically verify the *VirgilCard*s of the other clients with whom they are communicating so that they are able to confirm that an unauthorized third party has not initiated a man-in-the-middle attack.




