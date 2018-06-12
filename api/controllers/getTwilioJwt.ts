import { generateTwilioJwt } from './../services/twilio';
import express from 'express';

export const getTwilioJwt: express.RequestHandler = function signIn(req, res) {
    const token = generateTwilioJwt(req.body.identity);
    res.json({ token: token.toJwt() })
}
