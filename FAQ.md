# Virgil IP Messaging FAQ

This document answers Frequently Asked Questions regarding integration of the Twilio IP Messaging with Virgil's end-to-end encryption and verification.

## Quick start guide
To review the changes required to use Virgil Security's security infrastructure with Twilio IP Messaging please visit [this document](./Quick%20start%20guide.md).

## What does Virgil provide to enable end-to-end encryption, authentication, and verification of data?
Virgil consists of an open-source encryption library which implements Cryptographic Message Syntax (CMS) and Elliptic Curve Integrated Encryption Scheme (ECIES) (including RSA schema), a Key Management API, and a cloud-based Key Management Service (Virgil Keys). The Virgil Keys Service consists of a public key service and a private key escrow service. See our Technical Specifications for the up-to-date list of programming languages and platforms supported by our library. Generally all modern platforms and programming languages are supported. 

## Who controls private keys?
Developers have full control over how private keys are generated, stored, and synced on end-client devices. Virgil provides Private Key Escrow Service which can help backup and sync private keys. 

Generally most users are given 3 options:

- Easy: In this mode the Virgil Private Key API is used to store private keys associated with the user/app combo. Virgil stores key in encrypted (not hashed) format; however, we also maintain a hashed "password" that is used to decrypt the private Key Bundle. This mode is the least secure and requires end-users to trust Virgil.  It also allows Virgil the ability to reset a user's Key Bundle password.

- Normal: End users are given an option to store an encrypted private Key Bundle for backup and device synchronization purposes. Virgil cannot reset this password and cannot recover the private key bundle should the user forget the string used to encrypt the bundle.

- Enterprise: In this mode the developer runs their own Private Key Escrow instance or end-users manage their private keys manually. There is nothing stored by Virgil except the corresponding public key for each private key.

## How many public/private key pairs can each user have?
At this time there is no limit. Depending on the application you can and sometimes should generate a new public/private key pair as often as "per session".

## Does Virgil use standard encryption?
Yes. Additional details can be found in our Technical Specification.

## How can I add history to my Twilio IP Messaging channel and maintain end-to-end encryption?
Virgil provides sample application services for Twilio IP Messaging that, at the developer's discretion, run a history service for each channel where this behavior is appropriate. This service effectively re-encrypts the history for each user who is authorized to see this information.

## Do I have to pick a specific configuration? For example, if I pick NSA Suite B compliance, will this break compartibility with other users?
No. Virgil uses Crypgraphic Agility which allows different users, platforms, and even individual files or chat sessions to have individually selected cryptographic parameters. Our library automatically detects which parameters were used and uses appropriate settings to decrypt content. Developers have full control over this funtionality; however, we recommend sticking with the defaults selected by Virgil as we continuously evaluate and update best practices. Current defaults can be found in our Technical Specifications.





