import { Injectable } from '@angular/core'

declare var Twilio: any;

@Injectable()
export class TwilioService {  
    
    private accessManager;
    public client;
        
    initialize(accessToken:string){
        this.accessManager = new Twilio.AccessManager(accessToken);
        this.client = new Twilio.IPMessaging.Client(this.accessManager);
        
        console.log('Twilio IP Messaging client has been successfully initialized.');
    }
}