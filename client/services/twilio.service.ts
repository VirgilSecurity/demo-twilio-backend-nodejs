import { Injectable } from '@angular/core'
import { BackendService } from './backend.service'

declare var Twilio: any;

@Injectable()
export class TwilioService {  
    
    private accessManager;
    public client;
    
    constructor(private backend: BackendService) { }
        
    initialize(accessToken: string) {
        this.accessManager = new Twilio.AccessManager(accessToken);
        this.client = new Twilio.IPMessaging.Client(this.accessManager);
    }
}