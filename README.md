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
| VIRGIL_APP_KEY_PATH               | The path to your Private Key(*.vkeys) file, you generated for your application  |
| VIRGIL_APP_KEY_PASSWORD   | The application's Private Key password.  |
