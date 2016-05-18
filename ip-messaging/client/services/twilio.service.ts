import { Injectable } from '@angular/core'

declare var Twilio: any;

export class Message {    
}

export class Channel {    
}

@Injectable()
export class TwilioService {  
    
    private accessManager;
    public client;
        
    initialize(accessToken:string): void {
        this.accessManager = new Twilio.AccessManager(accessToken);
        this.client = new Twilio.IPMessaging.Client(this.accessManager);
        
        this.client.on('tokenExpired', this.onTokenExpired)
        
        console.log('Twilio IP Messaging client has been successfully initialized.');
    }
    
    private onTokenExpired(): void{
        alert('Your session has been expired!');
    }
}