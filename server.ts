import * as express from "express";
import { JwtGenerator, CardManager, VirgilCardVerifier, GeneratorJwtProvider, RawSignedModel } from "virgil-sdk";
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

const validateParam = (param: string) : express.RequestHandler => (req, res, next) => {
    if (!req.body || !req.body[param]) {
        return res.status(400).send("identity param is required");
    }
    next();
};

const virgilCrypto = new VirgilCrypto();
const cardCrypto = new VirgilCardCrypto();
const cardVerifier = new VirgilCardVerifier(cardCrypto);

const generator = new JwtGenerator({
    appId: APP_ID,
    apiKeyId: API_KEY_ID,
    apiKey: virgilCrypto.importPrivateKey(API_KEY),
    accessTokenSigner: new VirgilAccessTokenSigner(virgilCrypto)
});

const cardManager = new CardManager({
    cardCrypto: cardCrypto,
    cardVerifier: cardVerifier,
    accessTokenProvider: new GeneratorJwtProvider(generator),
    retryOnUnauthorized: true
});

app.post("/signup", validateParam('rawCard'), (req, res) => {
    const rawCard = RawSignedModel.fromJson(req.body.rawCard);
    cardManager.publishRawCard(rawCard).then((card) => res.json(card));
});

app.post("/get-virgil-jwt", validateParam('identity'), (req, res) => {
    res.json({ token: generator.generateToken(req.body.identity).toString() });
});

// twilio sdk configure
const AccessToken = jwt.AccessToken;
const ChatGrant = AccessToken.ChatGrant;
const chatGrant = new ChatGrant({
    serviceSid: SERVICE_SID
});

app.post("/get-twilio-jwt", validateParam('identity'), (req, res) => {
    const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET);

    token.identity = req.body.identity;
    token.addGrant(chatGrant);

    res.json({ token: token.toJwt() });
});

app.listen(3000, () => console.log("server listening on http://localhost:3000/"));
