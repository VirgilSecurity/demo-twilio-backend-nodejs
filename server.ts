/// <reference path="./typings/index.d.ts" />
/*
This application should give you a ready-made starting point for writing your own end-to-end 
encrypted messaging apps with Virgil Security & Twilio IP Messaging. Before we begin, we need 
to collect all the config values we need to run the application:

TWILIO_ACCOUNT_SID=
TWILIO_API_KEY=
TWILIO_API_SECRET=
TWILIO_IPM_SERVICE_SID=

VIRGIL_ACCESS_TOKEN=
VIRGIL_APP_KEY_PATH=
VIRGIL_APP_KEY_PASSWORD=
*/

import fs = require('fs');
import bodyParser = require('body-parser');
import express = require('express');
import path = require('path');
import http = require('http');
import _ = require('lodash');

let virgil = require('virgil-sdk');
let Twilio = require('twilio');


/**
 * The application Server.
 * 
 * @class Server 
 */
class Server {

    private app: any;
    private appPrivateKey: any;
    private chatAdminPrivateKey: any;
    private virgilClient: any;
    private ipMessaging: any;

    private rootDir: string;

    /**
     * Creates a new @Server instance.
     */
    public static bootstrap(): Server {
        return new Server();
    }
   
    /**
     * Initialized a new instance of @Server class.
     */
    constructor() {        
        this.app = express();
        
        this.config();
        this.routes();        
    }
    
    /**
     * Starts the HTTP server on specified port.
     */
    public start(port:number): void {
        http.createServer(this.app).listen(port);
    }
    
    /**
     * Configures the application services.
     */
    private config(): void {        
        require('dotenv').load();         

        var appKeyData = fs.readFileSync(process.env.VIRGIL_APP_KEY_PATH);
        this.appPrivateKey = virgil.crypto.importPrivateKey(appKeyData, process.env.VIRGIL_APP_KEY_PASSWORD);

        this.chatAdminPrivateKey = virgil.crypto.importPrivateKey(
            process.env.APP_CHANNEL_ADMIN_PRIVATE_KEY);

        this.app.disable("x-powered-by");
        this.rootDir = path.resolve(__dirname); 
 
        this.virgilClient = virgil.client(process.env.VIRGIL_ACCESS_TOKEN);
        this.virgilClient.setCardValidator(virgil.cardValidator(virgil.crypto));

        var client = new Twilio.IpMessagingClient(process.env.TWILIO_API_KEY, process.env.TWILIO_API_SECRET);
        this.ipMessaging = client.services(process.env.TWILIO_IPM_SERVICE_SID);
    }
    
    /**
     * Configures the application routes.
     */
    private routes(): void {
        this.app.use(express.static(this.rootDir + '/public/'));
        this.app.use('/assets/', express.static(this.rootDir + '/node_modules/'));
        this.app.use(bodyParser.json())
        
        //register routes
        this.app.post("/auth/login", (req, res, next) => this.authLoginHandler(req, res, next));
        this.app.get("/auth/virgil-token", (req, res, next) => this.authVirgilTokenHandler(req, res, next));
        this.app.get("/auth/twilio-token", (req, res, next) => this.authTwilioTokenHandler(req, res, next));
        this.app.get("/history", (req, res, next) => this.historyHandler(req, res, next));
        this.app.post("/virgil-card", (req, res, next) => this.createVirgilCardHandler(req, res, next));
        this.app.get("/", (req, res, next) => this.indexHandler(req, res, next));
    }

    /**
     * Handles requests for default HTML page.
     */
    private indexHandler(request: express.Request, response: express.Response, next: express.NextFunction){   
        fs.readFile(this.rootDir + '/index.html', 'utf8', (err, data) => { 
            response.writeHead(200, {'Content-Type': 'text/html'});
            var indexData = data.replace(/{{ APP_BUNDLE_ID }}/g, process.env.VIRGIL_APP_ID);
            response.write(indexData);
            response.end();
        });
    }

    /**
     * Handles requests for member login to the application.
     */
    private authLoginHandler(request: express.Request, response: express.Response, next: express.NextFunction) {

        // TODO: add here your own authentication mechanism.

        let identity = request.body.identity;
        
        let applicationSign = this.signTextUsingAppPrivateKey(request.body.public_key);
            
        this.signAndSend(response, {
            identity: identity,        
            application_sign: applicationSign
        });
    }

    /**
     * Handles requests for Virgil Access Token.
     */
    private authVirgilTokenHandler(request: express.Request, response: express.Response, next: express.NextFunction) {
        var virgilToken = process.env.VIRGIL_ACCESS_TOKEN;
        this.signAndSend(response, { virgil_token: virgilToken });
    }

    /**
     * Handles requests for Twilio IP Messaging Token. 
     */
    private authTwilioTokenHandler(request: express.Request, response: express.Response, next: express.NextFunction){
        var appName = 'VIRGIL_CHAT';
        var identity = request.query.identity;
        var deviceId = request.query.device;
                
        // create a unique ID for the client on their current device
        var endpointId = appName + ':' + identity + ':' + deviceId;

        // create a "grant" which enables a client to use IPM as a given user,
        // on a given device
        var ipmGrant = new Twilio.AccessToken.IpMessagingGrant({
            serviceSid: process.env.TWILIO_IPM_SERVICE_SID,
            endpointId: endpointId
        });

        // create an access token which we will sign and return to the client,
        // containing the grant we just created
        var token = new Twilio.AccessToken(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_API_KEY,
            process.env.TWILIO_API_SECRET
        );

        token.addGrant(ipmGrant);
        token.identity = identity;

        this.signAndSend(response, { twilio_token: token.toJwt() });
    }

    /**
     * Handles requests for channel's message history.
     */
    private historyHandler(request: express.Request, response: express.Response, next: express.NextFunction) {

        let identity = request.query.identity;
        let channelSid = request.query.channelSid;   
                            
        Promise.all([
            this.searchChannelMemberCard(identity),
            this.ipMessaging.channels(channelSid).messages.list()
        ])
        .then(results => {
            let recipientCard: any = results[0];
            let messages: Array<any> = results[1].messages;
                    
            _.forEach(messages, m => {           
                let decryptedBody = this.decryptTextForChannelAdmin(m.body);                        
                let encryptedBody = virgil.crypto.encrypt(
                    decryptedBody,
                    virgil.crypto.importPublicKey(recipientCard.publicKey));
                            
                m.body = encryptedBody.toString('base64');
            });
                     
            this.signAndSend(response, messages);
            next();        
        })
        .catch(next);
    }

    private createVirgilCardHandler(request: express.Request, response: express.Response, next: express.NextFunction) {
        let cardCreateRequest = virgil.publishCardRequest.import(request.body.exported_card_request);
        let signer = virgil.requestSigner(virgil.crypto);

        signer.authoritySign(cardCreateRequest, process.env.VIRGIL_APP_ID, this.appPrivateKey);

        this.virgilClient.publishCard(cardCreateRequest)
            .then((card) => {
                this.signAndSend(response, card);
                next();
            })
            .catch((err) => {
                console.log(err);
                if (err.invalidCards) {
                    response.status(400).json({ error: err.message });
                }
                next();
            });
    }
     
     /**
      * Decrypts a message using channel admin's Private Key.  
      */
     private decryptTextForChannelAdmin(encryptedText: string): any {

         try {
             return virgil.crypto.decrypt(encryptedText, this.chatAdminPrivateKey);
         } catch (err) {
             console.log(err);
             return Buffer.from(JSON.stringify({ body: 'failed to decrypt', date: Date.now(), id: '123' }));
         }

     }

    /**
     * Loads latest member's Public Key from Virgil Services.
     */
    private searchChannelMemberCard(member: string) {
        return this.virgilClient.searchCards({
            identities: [ member ],
            identity_type: 'chat_member'
        }).then(cards => {
            return _.last(_.sortBy(cards, 'createdAt'));
        });
    }

    /**
     * Sends a response to the client with the signed body, to prevent MitM attacks.
     */
    private signAndSend(response: express.Response, data: any) {
        
        let responseBody = JSON.stringify(data);        
        let responseSign = this.signTextUsingAppPrivateKey(responseBody);
                        
        response.setHeader('x-ipm-response-sign', responseSign);
        response.send(responseBody);
    }

    /**
     * Signs a text using application Private Key defined in .env file.
     */
    private signTextUsingAppPrivateKey(text: string) {
        return virgil.crypto.sign(text, this.appPrivateKey).toString('base64');
    }
}

let server = Server.bootstrap();
server.start(8080); 