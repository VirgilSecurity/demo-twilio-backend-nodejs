# Virgil & Twilio Programmable Chat

With these instructions, you'll learn how to install and integrate the Virgil Security to Twilio Programmable Chat API.

## Clone & Configurate

Clone the repository from our GitHub.

```
$ git clone git@github.com:VirgilSecurity/demo-twilio-chat-js.git
```

Then, rename configuration file ```config.json``` file using next command:

```
$ cd ./demo-twilio-chat-js
$ cp ./config.example.json ./config.json
```

Set Twilio & Virgil environment variables declared in `config.json` file.

| Variable Name                     | Description                    |
|-----------------------------------|--------------------------------|
| APP_ID                   | Used to specify uniqueness and identifies your application in Virgil Security services. |
| API_KEY                  | Generated string that allows you to create JWT needed for access to Virgil Security Services. You can [create one here](https://dashboard.virgilsecurity.com/api-keys). **Remember, you will be able to save it only after creation of Api Key.** |
| API_KEY_ID               | Api Key Id from Virgil Security Dashboard |
| TWILIO_ACCOUNT_SID                | Your primary Twilio account identifier - [find this in the console here.](https://www.twilio.com/console)        |
| TWILIO_API_KEY                    | Used to authenticate to Twilio - [generate one here](https://www.twilio.com/console/chat/runtime/api-keys). |
| TWILIO_API_SECRET                 | Used to authenticate to Twilio - just like the above, [you'll get one here.](https://www.twilio.com/console/chat/runtime/api-keys) |
| TWILIO_SERVICE_SID            | A service instance where all the data for our application is stored and scoped. [Generate one in the console here.](https://www.twilio.com/console/chat/dashboard) |

## Install & Start

Install all the package dependencies and start the application using next commands:

> **IMPORTANT** Make sure you set the variables in `config.json` before you try to start the server. It won't work without these.

```
$ npm install
$ npm start
```
