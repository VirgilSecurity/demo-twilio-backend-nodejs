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
import * as path from "path";
import * as http from "http";
import * as _ from "lodash";

let VirgilSDK = require('virgil-sdk');
let virgil = new VirgilSDK(process.env.VIRGIL_ACCESS_TOKEN);

let Twilio = require('twilio');
let AccessToken = Twilio.AccessToken;
let IpMessagingGrant = Twilio.AccessToken.IpMessagingGrant;

const root =  path.resolve('./public');
const app = express();

app.disable("x-powered-by");

app.use(express.static(root));
app.use('/assets/', express.static('./node_modules/'));

/*
Authenticate a chat member by generating an Access tokens. One for Virgil SDK and the 
second one for Twilio IP messaging client.
*/
app.get('/auth', (request, response) => {
    var identity = request.query.identity;
    var validationToken = getValidationToken(identity);

    response.send({
        identity: identity,        
        validation_token: validationToken
    });
});

app.get('/channel-admin', (request, response) => {
    
});

app.get('/twilio-token', (request, response) => {
    var appName = 'VIRGIL_CHAT';
    var identity = request.query.identity;
    var deviceId = request.query.device;
    var twilioToken = getTwilioToken(appName, identity, deviceId);

    response.send({ twilio_token: twilioToken.toJwt() });
});

app.get('/virgil-token', (request, response) => {
    var virgilToken = process.env.VIRGIL_ACCESS_TOKEN;
    response.send({ virgil_token: virgilToken });
});

app.get('/history', (request, response, next) => {
    
    let identity = request.query.identity;
    let channelSid = request.query.channelSid;   
         
    var client = new Twilio.IpMessagingClient(process.env.TWILIO_API_KEY, process.env.TWILIO_API_SECRET);
    let service = client.services(process.env.TWILIO_IPM_SERVICE_SID);
    
    Promise.all([
        virgil.cards.search({ value: identity, type: 'member' }),
        service.channels(channelSid).messages.list()
    ])
    .then(bundle => {
        let latestCard: any = _.last(_.sortBy(bundle[0], 'created_at'));
        let messages: Array<any> = bundle[1].messages;
        let chatAdminPrivateKey = new Buffer(process.env.APP_CHANNEL_ADMIN_PRIVATE_KEY, 'base64').toString();    
        
        _.forEach(messages, m => {           
            let decryptedBody = virgil.crypto.decryptStringFromBase64(
                m.body, 
                process.env.APP_CHANNEL_ADMIN_CARD_ID, 
                chatAdminPrivateKey);
            
            let reEncryptedBody = virgil.crypto.encryptStringToBase64(
                decryptedBody,
                latestCard.id, 
                latestCard.public_key.public_key);
                
            m.body = reEncryptedBody;
        });
        
        response.send(messages);
        next();        
    })
    .catch(next);
});

app.get('*', function (req, res, next) {
    if (req.accepts('html')) {
        res.sendFile(root + '/index.html');
    }
    else {
        next();
    }
});

http.createServer(app).listen(8080);

/**
 * Grabs a channel's admin public/private keypair. 
 */
function grabChannelAdminKeys(): Promise<any> {
    return null;
}

function getTwilioToken(appName, identity, deviceId) {

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

    return token;
}

function getValidationToken(identity) {
    var privateKey = new Buffer(process.env.VIRGIL_APP_PRIVATE_KEY, 'base64').toString();

    // This validation token is generated using app’s Private Key created on
    // Virgil Developer portal.
    var validationToken = VirgilSDK.utils.generateValidationToken(identity,
        'member',
        privateKey,
        process.env.VIRGIL_APP_PRIVATE_KEY_PASSWORD);

    return validationToken;
}