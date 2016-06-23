/// <reference path="../typings/index.d.ts" />
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

import * as fs from 'fs'
import * as parser from 'body-parser'
import * as express from 'express'
import * as path from 'path'
import * as http from 'http'
import * as _ from 'lodash'

let VirgilSDK = require('virgil-sdk');
let Twilio = require('twilio');

/**
 * The application Server.
 * 
 * @class Server 
 */
class Server {

    private app: any;   
    private virgilAppPass: any; 
    private virgil: any;
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
     * Configurates an application services.
     */
    private config(): void {        
        require('dotenv').load();         

        let fileText = fs.readFileSync(process.env.VIRGIL_APP_KEY_PATH);
        this.virgilAppPass = JSON.parse(fileText.toString());

        this.app.disable("x-powered-by");
        this.rootDir = path.resolve(__dirname + '/../'); 
 
        this.virgil = new VirgilSDK(process.env.VIRGIL_ACCESS_TOKEN);

        var client = new Twilio.IpMessagingClient(process.env.TWILIO_API_KEY, process.env.TWILIO_API_SECRET);
        this.ipMessaging = client.services(process.env.TWILIO_IPM_SERVICE_SID);
    }
    
    /**
     * Configurates an application routes.
     */
    private routes(): void {
        //this.app.use(express.static(this.rootDir));
        this.app.use(express.static(this.rootDir + '/public/'));
        this.app.use('/assets/', express.static(this.rootDir + '/node_modules/'));
        this.app.use(parser.json())
        
        //register routes
        this.app.post("/auth/login", (req, res, next) => this.authLoginHandler(req, res, next));
        this.app.get("/auth/virgil-token", (req, res, next) => this.authVirgilTokenHandler(req, res, next));
        this.app.get("/auth/twilio-token", (req, res, next) => this.authTwilioTokenHandler(req, res, next));
        this.app.get("/history", (req, res, next) => this.historyHandler(req, res, next));
        this.app.get("/", (req, res, next) => this.indexHandler(req, res, next));
    }

    /**
     * Handles requests for default HTML page.
     */
    private indexHandler(request: express.Request, response: express.Response, next: express.NextFunction){   
        fs.readFile(this.rootDir + '/server/index.html', 'utf8', (err, data) => { 
            response.writeHead(200, {'Content-Type': 'text/html'});
            var indexData = data.replace(/{{ APP_BUNDLE_ID }}/g, this.virgilAppPass.card.identity.value);
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
        let validationToken = this.generateValidationToken(identity);
            
        this.signAndSend(response, {
            identity: identity,        
            application_sign: applicationSign,
            validation_token: validationToken
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
        .then(bundle => {                
            let recipientCard: any = bundle[0];                
            let messages: Array<any> = bundle[1].messages;                   
                    
            _.forEach(messages, m => {           
                let decryptedBody = this.decryptTextForChannelAdmin(m.body);                        
                let encryptedBody = this.virgil.crypto.encryptStringToBase64(
                    decryptedBody, recipientCard.id, recipientCard.public_key.public_key);
                            
                m.body = encryptedBody;
            });
                     
            this.signAndSend(response, messages);
            next();        
        })
        .catch(next);
    }
     
     /**
      * Decrypts a message using channel admin's Private Key.  
      */
     private decryptTextForChannelAdmin(encryptedText: string): string {
         
         let chatAdminPrivateKey = new Buffer(process.env.APP_CHANNEL_ADMIN_PRIVATE_KEY, 'base64').toString();   
         
         return this.virgil.crypto.decryptStringFromBase64(
             encryptedText, 
             process.env.APP_CHANNEL_ADMIN_CARD_ID, 
             chatAdminPrivateKey);
     }

    /**
     * Loads latest member's Public Key from Virgil Services.
     */
    private searchChannelMemberCard(member: string) {
        return this.virgil.cards.search({ value: member, type: 'chat_member' }).then(cards => {
            let latestCard: any = _.last(_.sortBy(cards, 'created_at'));
            return latestCard;
        })
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
    private signTextUsingAppPrivateKey(text: string){                  
        let signBase64 = this.virgil.crypto.sign(text, this.virgilAppPass.privateKey, 
            process.env.VIRGIL_APP_KEY_PASSWORD).toString('base64');         
         
        return signBase64;
    }

    /**
     * Generates a Validation Token for specified identity.
     */
    private generateValidationToken(identity) {
        
        // this validation token is generated using app’s Private Key created on
        // Virgil Developer portal.
        
        var validationToken = VirgilSDK.utils.generateValidationToken(identity, 
            'chat_member', this.virgilAppPass.privateKey, process.env.VIRGIL_APP_KEY_PASSWORD);

        return validationToken;
    }
}

let server = Server.bootstrap();
server.start(8080); 