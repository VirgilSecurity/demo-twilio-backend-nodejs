import * as express from 'express'
import { BaseRoute } from './base-route'

import { VirgilService } from '../services/virgil-service'

module Routes {
        
    export class AuthRoute extends BaseRoute {
        
        constructor(rootDir: string, virgil: VirgilService){
            super(rootDir, virgil);
        }
        
        public virgilToken(req: express.Request, res: express.Response, next: express.NextFunction){            
            var virgilToken = process.env.VIRGIL_ACCESS_TOKEN;
            super.signAndSend(res, { virgil_token: virgilToken });
        }
        
        public twilioToken(req: express.Request, res: express.Response, next: express.NextFunction){     
            var appName = 'VIRGIL_CHAT';
            var identity = req.query.identity;
            var deviceId = req.query.device;
                
            // Create a unique ID for the client on their current device
            var endpointId = appName + ':' + identity + ':' + deviceId;

            // Create a "grant" which enables a client to use IPM as a given user,
            // on a given device
            var ipmGrant = new this.twilio.IpMessagingGrant({
                serviceSid: process.env.TWILIO_IPM_SERVICE_SID,
                endpointId: endpointId
            });

            // Create an access token which we will sign and return to the client,
            // containing the grant we just created
            var token = new this.twilio.AccessToken(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_API_KEY,
                process.env.TWILIO_API_SECRET
            );

            token.addGrant(ipmGrant);
            token.identity = identity;

            super.signAndSend(res, { twilio_token: token.toJwt() });
        }
        
        public login(req: express.Request, res: express.Response, next: express.NextFunction){         
               
            let appSign = this.virgil.signWithAppKey(req.body.public_key);
                
            var identity = req.body.identity;
            var validationToken = this.getValidationToken(identity);
            
            super.signAndSend(res, {
                identity: identity,        
                application_sign: appSign,
                validation_token: validationToken
            });
        }
        
        private getValidationToken(identity) {
            var privateKey = new Buffer(process.env.VIRGIL_APP_PRIVATE_KEY, 'base64').toString();

            // This validation token is generated using app’s Private Key created on
            // Virgil Developer portal.
            var validationToken = VirgilService.Utils.generateValidationToken(identity,
                'chat_member',
                privateKey,
                process.env.VIRGIL_APP_PRIVATE_KEY_PASSWORD);

            return validationToken;
        }
    }
}

export = Routes;