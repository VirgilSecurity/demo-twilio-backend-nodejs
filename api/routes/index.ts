import express from 'express'
import { validateRawCard } from './../validators/body';
import { signIn } from '../controllers/signIn';
import { signUp } from '../controllers/signUp';
import { getTwilioJwt } from '../controllers/getTwilioJwt';
import { getVirgilJwt } from '../controllers/getVirgilJwt';
import { validateAuth } from '../validators/auth';
import { validateIdentity } from '../validators/body';

const router = express.Router();

router.post('/signin', validateIdentity, signIn);
router.post('/signup', validateRawCard, signUp);
router.post('/get-virgil-jwt', validateAuth, validateIdentity, getVirgilJwt);
router.post('/get-twilio-jwt', validateAuth, validateIdentity, getTwilioJwt);

export default router;
