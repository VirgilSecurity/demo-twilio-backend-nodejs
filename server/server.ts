import * as express from "express";
import {
    JwtGenerator,
    CardManager,
    VirgilCardVerifier,
    GeneratorJwtProvider,
    RawSignedModel
} from "virgil-sdk";
import { VirgilCrypto, VirgilAccessTokenSigner, VirgilCardCrypto } from "virgil-crypto";
import { jwt } from "twilio";
import { VirgilPublicKey } from "virgil-crypto/dist/types/VirgilCrypto";

let config;

try {
    config = require("../config.json");
} catch (e) {
    if (!config) {
        throw Error("You need to put config.json from Virgil Dashboard file in project directory");
    }
}

// Check config json params
const params = [
    "APP_ID",
    "API_KEY_ID",
    "API_KEY",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_API_KEY",
    "TWILIO_API_SECRET",
    "TWILIO_SERVICE_SID"
];

params.forEach(param => {
    if (!config[param]) throw Error(param + " is missing in config.json");
});

const errorHandler: express.ErrorRequestHandler = (err, req, res, next) => {
    res.status(500);
    res.render("error", { error: err });
};

const validateParam = (param: string): express.RequestHandler => (req, res, next) => {
    if (!req.body || !req.body[param]) {
        return res.status(400).send(param + " param is required");
    }
    next();
};

const app = express();

app.use(errorHandler);
app.use(express.json());

// Virgil SDK configure
const virgilCrypto = new VirgilCrypto();
const cardCrypto = new VirgilCardCrypto();
const cardVerifier = new VirgilCardVerifier(cardCrypto);

const generator = new JwtGenerator({
    appId: config.APP_ID,
    apiKeyId: config.API_KEY_ID,
    apiKey: virgilCrypto.importPrivateKey(config.API_KEY),
    accessTokenSigner: new VirgilAccessTokenSigner(virgilCrypto)
});

const cardManager = new CardManager({
    cardCrypto: cardCrypto,
    cardVerifier: cardVerifier,
    accessTokenProvider: new GeneratorJwtProvider(generator),
    retryOnUnauthorized: true
});

// We are expect Authentication Header which represent cardId of user, timestamp and signature
// of this data which truly identify user as the owner of this card
const validateAuth: express.RequestHandler = (req, res, next) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
        console.error(
            "Token wasn't passed as a Bearer token in the Authorization header.",
            "Make sure you authorize your request by providing the following HTTP header:",
            "Authorization: Bearer cardId.unixTimestamp.signature(cardId.unixTimestamp)>"
        );
        res.status(401).send("Unauthorized");
        return;
    }

    const [cardId, timestamp, signature] = req.headers.authorization.split("Bearer ")[1].split(".");
    cardManager
        .getCard(cardId)
        .then(card => {
            const message = cardId + "." + timestamp;
            // client send us his cardId and timestamp which signed with his private key
            // so we can check that he is the owner of that token
            // and if token was compromised it will be valid for 30 minutes
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const expireDate = currentTimestamp - 30 * 60;
            if (+timestamp < expireDate) {
                return res.status(401).send("Token max TTL 30 minutes");
            }
            const isAuthenticated = virgilCrypto.verifySignature(
                message,
                signature,
                card.publicKey as VirgilPublicKey
            );
            if (isAuthenticated) return next();
            return res.status(401).send("Unauthorized");
        })
        .catch(error => {
            console.error("Error while verifying token:", error);
            return res.status(401).send("Unauthorized");
        });
};

app.post("/signup", validateParam("rawCard"), (req, res) => {
    let resCard = req.body.rawCard;
    if (typeof req.body.rawCard === "string") {
        // if card sent in JSON string representation
        resCard = JSON.parse(resCard);
    }
    // we can publish rawCard created on client and than client can use his
    // private key to sign and encrypt information
    const rawCard = RawSignedModel.fromJson(resCard);
    const identity = JSON.parse(rawCard.contentSnapshot.toString()).identity;

    // at first we search cards with this identity to ensure it is not taken
    return cardManager
        .searchCards(identity)
        .then(cards => {
            if (cards.length > 0) {
                return res.status(400).send("Card with this identity already exists");
            }
            // then we publish it and return to client as JSON
            return cardManager.publishRawCard(rawCard).then(card =>
                res.json({
                    virgil_card: cardManager.exportCardAsJson(card)
                })
            );
        })
        .catch(() => res.status(500));
});

app.post("/signin", validateParam("identity"), (req, res) => {
    return cardManager
        .searchCards(req.body.identity)
        .then(cards => {
            if (!cards.length) {
                return res.status(400).send("Card with this identity don't exists");
            }
            if (cards.length > 1) {
                return res.status(400).send("There are more then one card with this identity");
            }
            res.json({
                virgil_card: cardManager.exportCardAsJson(cards[0])
            })
        })
});


app.post("/get-virgil-jwt", validateAuth, validateParam("identity"), (req, res) => {
    res.json({ token: generator.generateToken(req.body.identity).toString() });
});

// twilio sdk configure
const AccessToken = jwt.AccessToken;
const ChatGrant = AccessToken.ChatGrant;
const chatGrant = new ChatGrant({
    serviceSid: config.TWILIO_SERVICE_SID
});

app.post("/get-twilio-jwt", validateAuth, validateParam("identity"), (req, res) => {
    const token = new AccessToken(
        config.TWILIO_ACCOUNT_SID,
        config.TWILIO_API_KEY,
        config.TWILIO_API_SECRET
    );

    token.identity = req.body.identity;
    token.addGrant(chatGrant);

    res.json({ token: token.toJwt() });
});

app.listen(3000, () => console.log("server listening on http://localhost:3000/"));

export default app;
