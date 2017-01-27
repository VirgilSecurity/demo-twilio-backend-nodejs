# Virgil & Twilio Programmable Chat

With these instructions, you'll learn how to install and integrate the Virgil Security to Twilio Programmable Chat API.


- [Quickstart Guide](/docs)
- [Live Demo](https://demo-ip-messaging.virgilsecurity.com/)

## Publish

There are only few steps required to setup Virgil History service :)

```
$ git clone git@github.com:VirgilSecurity/virgil-demo-twilio.git
$ cd ./virgil-demo-twilio

$ npm install
$ npm start
```

Use url [http://localhost:8080](http://localhost:8080) to open your Demo Chat

## Configuration

```
$ cp ./.env.example ./.env
```
Set Twilio & Virgil environment variables declared in `.env` file.

| Variable Name                     | Description                    |
|-----------------------------------|--------------------------------|
| TWILIO_ACCOUNT_SID                | Your primary Twilio account identifier - [find this in the console here.](https://www.twilio.com/user/account/ip-messaging)        |
| TWILIO_API_KEY                    | Used to authenticate - [generate one here](https://www.twilio.com/user/account/ip-messaging/dev-tools/api-keys). |
| TWILIO_API_SECRET                 | Used to authenticate - just like the above, [you'll get one here.](https://www.twilio.com/user/account/ip-messaging/dev-tools/api-keys) |
| TWILIO_IPM_SERVICE_SID            | A service instance where all the data for our application is stored and scoped. [Generate one in the console here.](https://www.twilio.com/user/account/ip-messaging/services) |
| VIRGIL_ACCESS_TOKEN               | The access token provides authenticated secure access to Virgil Keys Services and is passed with each API call. The access token also allows the API to associate your app’s requests with your Virgil Security developer's account. |
| VIRGIL_APP_ID               | uniquely identifies your application in Virgil Security services, it is also used to identify the Public key generated in a pair with (AppKey) |
| VIRGIL_APP_KEY_PATH               | The path to your application Private key (AppKey) file. This file had to be saved as (*.virgilkey) on your machine during create application wizard. |
| VIRGIL_APP_KEY_PASSWORD   | The password you used to protect you AppKey. |
| APP_CHANNEL_ADMIN_PRIVATE_KEY | Optional. This parameter is admin's Private key that is used to perform decryption for history merssages. In order to support history in your application you need to manually create a new Virgil Card with identity `twilio_chat_admin` and publish it to Virgil Security Services. The Card's related Private key encoded in base64 has to be provided in current property.  |
