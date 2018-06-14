import express from 'express';
import { cardManager } from '../services/virgil';

export const signIn: express.RequestHandler = (req, res) => {
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
}
