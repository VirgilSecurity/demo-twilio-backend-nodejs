import { Injectable } from '@angular/core';

declare var Twilio: any;

@Injectable()
export class TwilioService {  

    public client;
    public accessManager;
    
    constructor() { }
        
    initialize(accessToken: string): Promise<any> {
        this.client = new Twilio.Chat.Client(accessToken);
        this.accessManager = new Twilio.AccessManager(accessToken);
        return this.client.initialize();
    }
}