# Secure Chat with Virgil


## Terms

- **AppKey** - a Private key, generated at time of creation of Application on Virgil developer's dashboard. The *AppKey* used to authenticate a user's *ClientCard*. 
- **ClientKey** - a Private key, generated at registration time. The *ClientKey* is creating in pair with Public key that is used as *ClientCard*. The *ClientKey* never live the device and stores in secure place which is defined by platform.
- **ClientCard** - A Public key (and information about user/device), generated in pair with *ClientKey* that represents a user's device on Virgil service.
- **OrgKey** - A Private key, generated at time of application server setup. The **OrgKey** uses to provide messages history backup.
- **OrgCard** - A Public key (and information about Organization), generated in pair with *OrgKey* and represents an Organization on Virgil service;

## Client Registration

During registration, on the client-side is generated a new pair of Public/Private keys, where Private key is stored as *ClientKey* on the local device, the Public key with additional information about the user and the device is sent to the server as *ClientCard* (with the signature of the owner - *ClientKey*). On the server, all client *ClientCard*s are validated and signed by the AppKey, whereupon *ClientCard* (with two signatures - *ClientKey*, *AppKey*) will be registered on the Virgil server.

> The Server or other side don't have access to *ClientKey* under any circumstances. The *ClientKey* is stored only on the device where it was generated.

By using this mechanism, User can register several devices, where for each device generates its own pair of *ClientKey* and *ClientCard*. Thus, each user can have several registered *ClientCard*s in the application.

## Exchanging Messages

After successful registration the client is ready to exchange messages with other clients of the application.

> Exchanging Messages within an application is carried by means of the application itself or such services as Twilio, etc.

The exchange of encrypted Messages between users of application:

1. *User1* sends message to *User2* (who works in organization):
  `EncMsg = Enc(Msg, Card-12, Card-21, Card-22)`
2. *User2* decrypts message using one of his device: `Msg = Dec(EncMsg, User2Key)`
3. Optional: *User2* re-encrypts message for Organization to do backup: `OrgEncMsg = Enc(Msg, OrgCard)`.
4. Optional: *User2* sends re-encrypted message to the service.

> Setps 3 and 4 does have to be performed in case of Organization takes a part in message history synchronization.

![IPMessaging](https://github.com/VirgilSecurity/virgil-demo-twilio/blob/master/Images/exchanging_messages_new.png)

History sync can be done by either:

1. Storing and re-sending EncMsg when needed
2. Re-encrypting OrgEncMsg (if server has one) and sending to User1/User2

## Message Encryption

1. The Sender searches for all recipients on Virgil Service and receives a list of their *ClientCard*s (considering all devices). 
2. The Sender generates a digital signature for the message using *ClientKey*. 
3. The Sender encrypts the message and the digital signature using the Public keys of recipients, that were extracted from *ClientCard*s. 
4. Sending of the encrypted messages to the recipients. 
5. The Recipient searches for the sender on Virgil Service and receives his *ClientCard*
6. The Recipient decrypts message, received from the sender, using Recipient’s *ClientKey*. 
7. The Recipient extracts the digital signature from the decrypted message and verifies it using the sender's *ClientCard*.

## Verifying Cards

The clients on the both sides automatically verify the *VirgilCard*s of the other clients with whom they are communicating so that they are able to confirm that an unauthorized third party has not initiated a man-in-the-middle attack.




