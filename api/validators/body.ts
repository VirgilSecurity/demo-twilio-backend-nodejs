import express from 'express';

const validateBody = (param: string): express.RequestHandler => (req, res, next) => {
    if (!req.body || !req.body[param]) {
        return res.status(400).send(param + " param is required");
    }
    next();
};

export const validateIdentity = validateBody('identity');
export const validateRawCard = validateBody('rawCard');
