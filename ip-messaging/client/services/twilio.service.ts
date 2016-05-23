import { Injectable } from '@angular/core'

import { BackendService } from './backend.service'

declare var Twilio: any;

@Injectable()
export class TwilioService {  
    
    private accessManager;
    public client;
    
    constructor(private backend: BackendService) { }
        
    initialize(identity:string): Promise<any> {
        return this.backend.getTwilioToken(identity, 'web')
            .then((data) => {
                this.accessManager = new Twilio.AccessManager(data.twilio_token);
                this.client = new Twilio.IPMessaging.Client(this.accessManager);
                return;
            });
    }
}