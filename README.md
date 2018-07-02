# Demo Virgil & Twilio E2EE Chat - Backend

With these instructions, you'll learn how to install and integrate the Virgil Security to Twilio Programmable Chat API.

> This demo contains only node.js server. For the client-side you can check our [ios](https://github.com/VirgilSecurity/chat-twilio-ios/tree/sample-v5) and [android](https://github.com/VirgilSecurity/demo-twilio-chat-android) repos.


## Clone & Configurate

Clone the repository from our GitHub.

```
$ git clone https://github.com/VirgilSecurity/demo-twilio-chat-js.git
```

## Install & Start

Put configuration file ```config.json``` from dashboard if you downloaded one or skip this step if you haven't.

Install all the package dependencies and start the application using next commands:

```
$ npm install
$ npm run interactive
```

## config.json content


| Variable Name                     | Description                    |
|-----------------------------------|--------------------------------|
| APP_ID                   | Used to specify uniqueness and identifies your application in Virgil Security services. |
| API_KEY                  | Generated string that allows you to create JWT needed for access to Virgil Security Services. You can [create one here](https://dashboard.virgilsecurity.com/api-keys). **Remember, you will be able to save it only after creation of Api Key.** |
| API_KEY_ID               | Api Key Id from Virgil Security Dashboard |
| TWILIO_ACCOUNT_SID                | Your primary Twilio account identifier - [find this in the console here.](https://www.twilio.com/console)        |
| TWILIO_API_KEY                    | SID of Twilio Api Key. Used for authentication on twilio services. Generated with TWILIO_API_SECRET|
| TWILIO_API_SECRET                 | Private part of Api Key. **Available only after creation** - [you can generate one here](https://www.twilio.com/console/chat/runtime/api-keys). |
| TWILIO_SERVICE_SID            | A service instance where all the data for our application is stored and scoped. [Generate one in the console here.](https://www.twilio.com/console/chat/dashboard) |
