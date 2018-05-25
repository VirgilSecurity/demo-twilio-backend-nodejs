import * as express from "express";
import { JwtGenerator, CardManager } from "virgil-sdk";
import { VirgilCrypto, VirgilAccessTokenSigner, VirgilCardCrypto } from "virgil-crypto";
import { jwt } from "twilio";

const {
    APP_ID,
    API_KEY_ID,
    API_KEY,
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
    SERVICE_SID
} = require("./config.json");

const app = express();

app.use(express.json());

const validateAuth: express.RequestHandler = (req, res, next) => {
    console.log("HERE YOU CAN CHECK YOUR AUTHORIZATION WHICH IS OUT FROM DEMO SCOPE");
    next();
};

const validateIdentity: express.RequestHandler = (req, res, next) => {
    if (!req.body || !req.body.identity) {
        return res.status(400).send("identity param is required");
    }
    next();
};

const crypto = new VirgilCrypto();

const generator = new JwtGenerator({
    appId: APP_ID,
    apiKeyId: API_KEY_ID,
    apiKey: crypto.importPrivateKey(API_KEY),
    accessTokenSigner: new VirgilAccessTokenSigner(crypto)
});

app.post("/get-virgil-jwt", validateIdentity, (req, res) => {
    res.json({ token: generator.generateToken(req.body.identity).toString() });
});

// twilio sdk configure
const AccessToken = jwt.AccessToken;
const ChatGrant = AccessToken.ChatGrant;
const chatGrant = new ChatGrant({
    serviceSid: SERVICE_SID
});

app.post("/get-twilio-jwt", validateIdentity, (req, res) => {
    const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET);

    token.identity = req.body.identity;
    token.addGrant(chatGrant);

    res.json({ token: token.toJwt() });
});

app.listen(3000, () => console.log("server listening on http://localhost:3000/"));
