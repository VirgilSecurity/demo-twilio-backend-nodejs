# Twilio Sample Backend for Node.js

This repository contains a sample backend code that demonstrates how to combine Virgil and Twilio JWT generation, which are used for authentication with the Virgil and Twilio services.

> Do not use this authentication in production. Requests to a /virgil-jwt and /twilio-jwt endpoints must be allowed for authenticated users. Use your application authorization strategy.

## Prerequisites
- [NodeJS from 6 to 11](https://nodejs.org)

## Clone

Clone the repository from GitHub.

```
$ git clone https://github.com/VirgilSecurity/twilio-sample-backend-nodejs.git
```

## Get Virgil and Twilio Credentials

If you don't have an account yet, [sign up for one](https://dashboard.virgilsecurity.com/signup) using your email.

To generate a Virgil JWT the following values are required:

| Variable Name                     | Description                    |
|-----------------------------------|--------------------------------|
| VIRGIL_API_PRIVATE_KEY          | Private key of your Virgil API key that is used to sign the JWTs. |
| VIRGIL_API_KEY_ID               | ID of your Virgil API key. A unique string value that identifies your account in the Virgil Cloud. |
| VIRGIL_APP_ID                   | ID of your Virgil Application. |

To generate a Twilio JWT the following values are required:

| Variable Name                     | Description                    |
|-----------------------------------|--------------------------------|
| TWILIO_ACCOUNT_SID                | Your primary Twilio account identifier - [find this in the console here.](https://www.twilio.com/console)        |
| TWILIO_API_KEY                    | SID of Twilio Api Key. Used for authentication on Twilio services. Generated with TWILIO_API_SECRET|
| TWILIO_API_SECRET                 | Twilio API key secret: [generate one here](https://www.twilio.com/console/chat/runtime/api-keys) |
| TWILIO_SERVICE_SID            | A service instance where all the data for our application is stored and scoped. [Generate one in the console here.](https://www.twilio.com/console/chat/dashboard) |

## Add Credentials to .env

- open the project folder
- create a `.env` file
- fill it with your account credentials (take a look at the `.env.example` file to find out how to setup your own `.env` file)
- save the `.env` file


## Install Dependencies and Run the Server

```
$ npm install
$ npm run start
```
Now, use your client code to make a request to get a JWT from the sample backend that is working on http://localhost:3000.

## Specification

### /authenticate endpoint
This endpoint is an example of users authentication. It takes user `identity` and responds with unique token.

```http
POST https://localhost:3000/authenticate HTTP/1.1
Content-type: application/json;

{
    "identity": "string"
}

Response:

{
    "authToken": "string"
}
```

### /virgil-jwt endpoint
This endpoint checks whether a request is authenticated by an authorization header. It takes user's `authToken`, finds related user identity and generates a `virgilToken` (which is [JSON Web Token](https://jwt.io/)) with this `identity` in a payload. Use this token to make authorized API calls to Virgil Cloud.

```http
GET https://localhost:3000/virgil-jwt HTTP/1.1
Content-type: application/json;
Authorization: Bearer <authToken>

Response:

{
    "virgilToken": "string"
}
```

### /twilio-jwt endpoint
Same as Virgil token endpoint Twilio endpoint should be protected and responds with `twilioToken`.

```http
GET https://localhost:3000/twilio-jwt HTTP/1.1
Content-type: application/json;
Authorization: Bearer <authToken>

Response:

{
    "twilioToken": "string"
}
```

## Virgil JWT Generation
To generate a Virgil JWT, you need to use the `JwtGenerator` class from the Virgil SDK.

```js
const virgilCrypto = new VirgilCrypto();

const generator = new JwtGenerator({
  appId: process.env.APP_ID,
  apiKeyId: process.env.API_KEY_ID,
  apiKey: virgilCrypto.importPrivateKey(process.env.API_PRIVATE_KEY),
  accessTokenSigner: new VirgilAccessTokenSigner(virgilCrypto)
});

```

Then you need to provide an HTTP endpoint which will return the JWT with the user's identity as a JSON.

For more details take a look at the [virgilToken.js](api/virgilToken.js) file.

## Demo Twilio backend

If you use Demo Twilio Chat [Android](https://github.com/VirgilSecurity/demo-twilio-chat-android) or [iOS](https://github.com/VirgilSecurity/chat-twilio-ios/tree/sample-v5) and you looking for its backend, you can find it here: https://github.com/VirgilSecurity/twilio-sample-backend-nodejs/tree/v5-demo-backend

## License

This library is released under the [3-clause BSD License](LICENSE.md).

## Support

Our developer support team is here to help you. Find out more information on our [Help Center](https://help.virgilsecurity.com/).

You can find us on [Twitter](https://twitter.com/VirgilSecurity) or send us email support@VirgilSecurity.com.

Also, get extra help from our support team on [Slack](https://virgilsecurity.slack.com/join/shared_invite/enQtMjg4MDE4ODM3ODA4LTc2OWQwOTQ3YjNhNTQ0ZjJiZDc2NjkzYjYxNTI0YzhmNTY2ZDliMGJjYWQ5YmZiOGU5ZWEzNmJiMWZhYWVmYTM).
