# Virgil & Twilio Programmable Chat

With these instructions, you'll learn how to install and integrate the Virgil Security to Twilio Programmable Chat API.


- [Quickstart Guide](/docs)
- [Live Demo](https://demo-ip-messaging.virgilsecurity.com/)

## Clone & Configurate

Clone the repository from our GitHub.

```
$ git clone git@github.com:VirgilSecurity/virgil-demo-twilio.git
```

Then, rename a configuration file ```.env``` file using next command:

```
$ cd ./virgil-demo-twilio
$ cp ./.env.example ./.env
```

Set Twilio & Virgil environment variables declared in `.env` file.

| Variable Name                     | Description                    |
|-----------------------------------|--------------------------------|
| TWILIO_ACCOUNT_SID                | Your primary Twilio account identifier - [find this in the console here.](https://www.twilio.com/user/account/ip-messaging)        |
| TWILIO_API_KEY                    | Used to authenticate to Twilio - [generate one here](https://www.twilio.com/user/account/ip-messaging/dev-tools/api-keys). |
| TWILIO_API_SECRET                 | Used to authenticate to Twilio - just like the above, [you'll get one here.](https://www.twilio.com/user/account/ip-messaging/dev-tools/api-keys) |
| TWILIO_IPM_SERVICE_SID            | A service instance where all the data for our application is stored and scoped. [Generate one in the console here.](https://www.twilio.com/user/account/ip-messaging/services) |
| VIRGIL_ACCESS_TOKEN               | The access token provides authenticated secure access to Virgil Keys Services and is passed with each API call. The access token also allows the API to associate your app’s requests with your Virgil Security developer's account. |
| VIRGIL_APP_ID               | Used to specify uniqueness and identifies your application in Virgil Security services, it is also used to identify the Public key generated in a pair with AppKey |
| VIRGIL_APP_KEY_PATH               | The path to file with Private key (AppKey) of your application. This file will be saved on your machine when you create your application. |
| VIRGIL_APP_KEY_PASSWORD   | The password you used to protect your AppKey. |
| APP_CHANNEL_ADMIN_PRIVATE_KEY | Optional. This variable is admin's Private key that is used to perform decryption of messages history. In order to support history in your application you need to create a new Virgil Card manually with `identity: 'twilio_chat_admin'`, publish it in Virgil Security Services, encode the private key of that Card in base64 string and set that string as the value of this variable. [This example](#setup-channel-admin) shows how to create admin's Virgil Card and generate Private key. |

## Install & Start

Install all the package dependencies and start the application using next commands:

> **IMPORTANT** Make sure you set the variables in `.env` before you try to start the server. It won't work without these. 

```
$ npm install
$ npm start
```

Use url [http://localhost:8080](http://localhost:8080) to open your Demo Chat

### Setup Channel Admin

This example shows how to generate an admin's Public/Private keys and publish their Virgil Card in Virgil Security Services.

```js
var virgil = require('virgil-sdk');
var fs = require('fs');

var APP_ID = "[YOUR_APP_ID_HERE]";
var APP_KEY_PASSWORD = "[YOUR_APP_KEY_PASSWORD_HERE]";

// this can either be a Buffer object or a base64-encoded string with the 
// private key bytes
var appPrivateKeyMaterial = fs.readFileSync("[YOUR_APP_KEY_PATH_HERE]");
// var appPrivateKeyMaterial = "[YOUR_BASE64_ENCODED_APP_KEY_HERE]";

var appPrivateKey = virgil.crypto.importPrivateKey(
        appPrivateKeyMaterial, APP_KEY_PASSWORD);

// generate a new Public/Private key pair for channel admin
var adminKeys = virgil.crypto.generateKeys();

var exportedPrivateKey = virgil.crypto.exportPublicKey(adminKeys.privateKey);

console.log('APP_CHANNEL_ADMIN_PRIVATE_KEY: ' + exportedPrivateKey.toString('base64'));

var exportedPublicKey = virgil.crypto.exportPublicKey(adminKeys.publicKey);
var publishRequest = virgil.publishCardRequest({
      identity: "twilio_chat_admin",
      identity_type: "chat_member",
      public_key: exportedPublicKey.toString('base64')
    });

// sign request using Admin's and Application Private keys.
var requestSigner = virgil.requestSigner(virgil.crypto);

requestSigner.selfSign(publishRequest, adminKeys.privateKey);
requestSigner.authoritySign(publishRequest, APP_ID, appPrivateKey);

// initialize client 
var client = virgil.client("[YOUR_ACCESS_TOKEN_HERE]");

client.publishCard(publishRequest)
.then(function (adminCard) {
  console.log(adminCard);
});
```

