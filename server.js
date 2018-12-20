const express = require('express');
const cors = require('cors');

const { requireAuthHeader } = require('./api/userValidation');
const { authenticate } = require('./api/authenticate');
const { generateVirgilJwt } = require('./api/virgilToken');
const { generateTwilioJwt } = require('./api/twilioToken');

const app = express();

app.use(cors({ origin: true, methods: 'OPTIONS,POST,GET', }));
app.use(express.json());

app.post('/authenticate', authenticate);
app.get('/virgil-jwt', requireAuthHeader, generateVirgilJwt);
app.get('/twilio-jwt', requireAuthHeader, generateTwilioJwt);
app.use(express.static('./public/'));

module.exports = app;
