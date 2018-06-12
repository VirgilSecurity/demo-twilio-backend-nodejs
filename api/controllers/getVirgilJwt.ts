import { RequestHandler } from "express";
import { generator } from "../services/virgil";

export const getVirgilJwt: RequestHandler = (req, res) => {
    res.json({ token: generator.generateToken(req.body.identity).toString() });
}
