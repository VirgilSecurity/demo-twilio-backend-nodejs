import express from 'express';
import { cardManager } from '../services/virgil';
import { RawSignedModel } from 'virgil-sdk';

export const signUp: express.RequestHandler = (req, res) => {
    let reqCard = req.body.rawCard;
    if (typeof reqCard === "string") {
        // if card sent in JSON string representation
        reqCard = JSON.parse(reqCard);
    }
    // we can publish rawCard created on client and than client can use his
    // private key to sign and encrypt information
    const rawCard = RawSignedModel.fromJson(reqCard);
    const identity = JSON.parse(rawCard.contentSnapshot.toString()).identity;

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
}
