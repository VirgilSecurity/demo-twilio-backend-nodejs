# Virgil & Twilio IP Messaging

With these instructions, you'll learn how to install and integrate the Virgil Security to Twilio IP messaging API.

## Publish

There are only few steps required to setup Virgil History service :)

```
$ cd ./ip-messaging

$ npm install
$ npm start
```

## Configuration

```
$ cp .env.example .env
```
Set Twilio & Virgil environment variables declared in `.env` file.

```
TWILIO_ACCOUNT_SID=
TWILIO_API_KEY=
TWILIO_API_SECRET=
TWILIO_IPM_SERVICE_SID=

VIRGIL_ACCESS_TOKEN=
VIRGIL_APP_PRIVATE_KEY=
VIRGIL_APP_PRIVATE_KEY_PASSWORD=

APP_CHANNEL_ADMIN_CARD_ID=
APP_CHANNEL_ADMIN_PRIVATE_KEY=
```

## Quick start guide
To review the changes required to use Virgil Security's security infrastructure with Twilio IP Messaging please visit [this document](https://github.com/VirgilSecurity/virgil-demo-twilio/tree/master/ip-messaging).
