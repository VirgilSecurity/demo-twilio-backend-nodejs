import * as express from 'express'
import * as path from 'path'

import { VirgilService } from '../services/virgil-service'
import { TwilioService } from '../services/twilio-service'

export class BaseRoute {
    
    protected virgil: VirgilService;
    protected ipMessaging: any;
    protected twilio: any;
        
    constructor(protected rootDir: string, virgil: VirgilService){        
        this.virgil = virgil;
        this.twilio = TwilioService.getTwilioHub();
        this.ipMessaging = TwilioService.getIpMessagingInstance();
    }
        
    protected signAndSend(res: express.Response, data:any) {               
        
        console.log(this.virgil);
        
        let responseBody = JSON.stringify(data);        
        let responseSign = this.virgil.signWithAppKey(responseBody);
                        
        res.setHeader('x-ipm-response-sign', responseSign);
        res.send(responseBody);
    }
}    