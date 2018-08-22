# Demo Virgil & Twilio E2EE Chat - Backend

Follow these instructions to install a sample Node backend for Virgil Security's end-to-end encrypted messaging SDK for Twilio's Programmable Chat API. This sample backend is necessary for the client/mobile apps to work: it generates user tokens for Twilio's and Virgil's APIs.

> Client/mobile apps: [ios](https://github.com/VirgilSecurity/chat-twilio-ios/tree/sample-v5) and [android](https://github.com/VirgilSecurity/demo-twilio-chat-android).


## Clone & Configure

Clone the repository from GitHub.

```
$ git clone https://github.com/VirgilSecurity/demo-twilio-chat-js.git
```

## Download your Virgil app config

If you don't yet have a Virgil account, [sign up for one](https://VirgilSecurity.com/getstarted).

Create a new app, download the app's ```config.json``` file from the app's page and copy it into the root of this node sample.

## Add your Twilio account data to config.json

| Variable Name                     | Description                    |
|-----------------------------------|--------------------------------|
| APP_ID                   | This is your Virgil app's ID - no need to touch it |
| API_KEY                  | This is your Virgil API key - no need to touch it |
| API_KEY_ID               | This is your Virgil API key ID - no need to touch it |
| TWILIO_ACCOUNT_SID                | Your primary Twilio account identifier - [find this in the console here.](https://www.twilio.com/console)        |
| TWILIO_API_KEY                    | SID of Twilio Api Key. Used for authentication on twilio services. Generated with TWILIO_API_SECRET|
| TWILIO_API_SECRET                 | Twilio API key secret: [generate one here](https://www.twilio.com/console/chat/runtime/api-keys) |
| TWILIO_SERVICE_SID            | A service instance where all the data for our application is stored and scoped. [Generate one in the console here.](https://www.twilio.com/console/chat/dashboard) |

## Install dependencies and run the app

```
$ npm install
$ npm run interactive
```
