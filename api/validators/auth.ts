import express from 'express';
import { cardManager, virgilCrypto } from '../services/virgil';
import { VirgilPublicKey } from 'virgil-crypto';

export const validateAuth: express.RequestHandler = (req, res, next) => {
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
}
