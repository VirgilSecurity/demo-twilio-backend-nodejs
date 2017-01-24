# Virgil & Twilio IP Messaging

With these instructions, you'll learn how to install and integrate the Virgil Security to Twilio IP messaging API.


- [Quickstart Guide](https://github.com/VirgilSecurity/virgil-demo-twilio/tree/master/ip-messaging)
- [iOS Client](https://github.com/VirgilSecurity/virgil-demo-twilio/tree/master/ip-messaging/client-ios)
- [Live Demo](https://demo-ip-messaging.virgilsecurity.com/)

## Publish

There are only few steps required to setup Virgil History service :)

```
$ git clone https://github.com/VirgilSecurity/virgil-demo-twilio.git
$ cd ./ip-messaging

$ npm install
$ npm start
```

Use url [http://localhost:8080](http://localhost:8080) to open your IP Messaging Chat

## Configuration

```
$ cp ./server/.env.example ./server/.env
```
Set Twilio & Virgil environment variables declared in `.env` file.

| Variable Name                     | Description                    |
|-----------------------------------|--------------------------------|
| TWILIO_ACCOUNT_SID                | Your primary Twilio account identifier - [find this in the console here.](https://www.twilio.com/user/account/ip-messaging)        |
| TWILIO_API_KEY                    | Used to authenticate - [generate one here](https://www.twilio.com/user/account/ip-messaging/dev-tools/api-keys). |
| TWILIO_API_SECRET                 | Used to authenticate - just like the above, [you'll get one here.](https://www.twilio.com/user/account/ip-messaging/dev-tools/api-keys) |
| TWILIO_IPM_SERVICE_SID            | A service instance where all the data for our application is stored and scoped. [Generate one in the console here.](https://www.twilio.com/user/account/ip-messaging/services) |
| VIRGIL_ACCESS_TOKEN               | The access token provides authenticated secure access to Virgil Keys Services and is passed with each API call. The access token also allows the API to associate your app’s requests with your Virgil Security developer's account. |
| VIRGIL_APP_ID               |  |
| VIRGIL_APP_KEY_PATH               | The path to your application Private key (AppKey) file. This file had to be saved as (*.virgilkey) on your machine during create application wizard. |
| VIRGIL_APP_KEY_PASSWORD   | The password you used to protect you AppKey. |
| APP_CHANNEL_ADMIN_CARD_ID | Optional for chat history. Used to identify an admin's Card. See details [here](#setup-channel-admin). |
| APP_CHANNEL_ADMIN_PRIVATE_KEY | Optional for chat history. Used to perform decryption for history merssages. See details [here](#setup-channel-admin). |

## Setup channel admin

Generate a new Public/Private key pair using virgil.crypto

```js
var keyPair = virgil.crypto.generateKeyPair();
var channelAdminPrivateKey = new virgil.crypto.Buffer(keyPair.privateKey);

console.log('APP_CHANNEL_ADMIN_PRIVATE_KEY:' + channelAdminPrivateKey.toString('Base64'));
```

Register a new channel admin Card using SDK client

```js
var appKey = fs.readFileSync(process.env.VIRGIL_APP_KEY_PATH);

var identity = 'twilio_chat_admin';
var identityType = 'chat_member';

var validationToken = VirgilSDK.utils.generateValidationToken(identity, 
  identityType, appKey, process.env.VIRGIL_APP_KEY_PASSWORD);

var channelAdminCardDetails = {
     public_key: keyPair.publicKey,
     private_key: keyPair.privateKey,
     identity: {
         type: identityType,
         value: identity,
         validation_token: validationToken
     }
};

virgil.cards.create(channelAdminCardDetails).then(function (card){
    console.log('APP_CHANNEL_ADMIN_CARD_ID:' + card.id);
});
```

