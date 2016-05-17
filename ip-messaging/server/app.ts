/// <reference path="../typings/main.d.ts" />
/*
Load Twilio & Virgil configuration from .env config file - the following environment
variables should be set:

process.env.TWILIO_ACCOUNT_SID
process.env.TWILIO_API_KEY
process.env.TWILIO_API_SECRET
process.env.TWILIO_IPM_SERVICE_SID

*/
require("dotenv").load();

import * as express from "express";
import * as http from "http";

let VirgilSDK = require('virgil-sdk');
var virgil = new VirgilSDK(process.env.VIRGIL_ACCESS_TOKEN);

let AccessToken = require('twilio').AccessToken;
let IpMessagingGrant = AccessToken.IpMessagingGrant;

const app: express.Application = express();
app.disable("x-powered-by");

app.use(express.static("./public"));
app.use('/assets/', express.static('./node_modules/'));

/*
Authenticate a chat member by generating an Access tokens. One for Virgil SDK and the 
second one for Twilio IP messaging client.
*/
app.get('/auth', function (request, response) {    
    var appName = 'VIRGIL_CHAT';
    var identity = request.query.identity;
    var deviceId = request.query.device;

    // Create a unique ID for the client on their current device
    var endpointId = appName + ':' + identity + ':' + deviceId;

    // Create a "grant" which enables a client to use IPM as a given user,
    // on a given device
    var ipmGrant = new IpMessagingGrant({
        serviceSid: process.env.TWILIO_IPM_SERVICE_SID,
        endpointId: endpointId
    });

    // Create an access token which we will sign and return to the client,
    // containing the grant we just created
    var token = new AccessToken(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_API_KEY,
        process.env.TWILIO_API_SECRET
    );
    token.addGrant(ipmGrant);
    token.identity = identity;
    
    var privateKey = new Buffer(process.env.VIRGIL_APP_PRIVATE_KEY).toString('utf8'); 
    
    // This validation token is generated using app’s Private Key created on 
    // Virgil Developer portal.
    var validationToken = virgil.utils.generateValidationToken(identity, 
        'nickname', privateKey, process.env.VIRGIL_APP_PRIVATE_KEY_PASSWORD);

    response.send({
        identity: identity,        
        validation_token: validationToken,
        virgil_token: process.env.VIRGIL_ACCESS_TOKEN,
        twilio_token: token.toJwt()
    });
});

app.listen(3000, function () {
    
});