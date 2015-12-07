# Virgil IP Messaging FAQ

This FAQ is intended to answer frequently asked questions regarding integration of Twilio IP Messaging
with Virgil's end-to-end encryption and verification.

## Quick start guide
To review the changes required to use Virgil Security's security infrastructure with Twilio IP Messaging please visit [this document](./Quick%20start%20guide.md).

## Who controls private keys?
Developers have full control over how private keys are generated, stored and synced on end-client devices.
Virgil provides Private Key Escrow Service which can help backup and sync private keys. 
Generally most users are given 3 options:

- Easy: In this mode Virgil Private Key API is used to store private keys associated with the user/app combo. Virgil stores key in encrypted (not hashed) format however we still do maintain a hashed "password" that is used to decrypt
private key bundle. This mode is least secure and requires end-users to trust Virgil.

- Normal: End users are given an option to store encrypted private key bundle for backup and device sync purposes. Virgil cannot reset this password and cannot recover the private key bundle should user forget the string used to encrypt the bundle.

- Enterprise: In this mode developer runs their own instance of Private Key Escrow or end-users can manage their private keys manually. There is nothing stored by Virgil except the corresponding public key for each private key.

##How many public/provate key pair can each user have?
At this time there is no limit. Depending on the application you can and sometimes should generate a new public/private key pair as often as "per session".

## Does Virgil use standard encryption?
Yes. Additional details can be found in our technical specification.

## Do I have to pick specific configuration? For example if I pick NSA Suite B compliance. Will this
break compartibility with other users?
No. Virgil uses Crypgraphic Agility which allows different users, platforms and even individuals files or chat sessions to have individually selected crypgraphic parameters. Our library automatically detects which parameters
were used and uses appropriate settings to decrypt content. Developers have full control over this funtionality
however we generally recommend sticking to defaults selected by Virgil as we continuously evaluate and update
best practices. Current defaults can be found in our Technical Specifications.

## How can I add history my Twilio UP Messaging channel and maintain end-to-end encryption?
Virgil provides sample application services for Twilio IP Messaging that, at developers discretion, can run history service for each channel where this behavior is appropriate. This service effectively re-encrypts history for any user who is authrorized to see this
information.





