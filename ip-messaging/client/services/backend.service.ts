import { Injectable } from '@angular/core'
import { Http, Response } from '@angular/http'

@Injectable()
export class BackendService {
    
    constructor(
        private http: Http) {}
    
    /**
     * Gets a validation token for Virgil services.
     */
    public auth(identity: string): Promise<any> {
                
        return this.http.get(`/auth?identity=${identity}`)
            .map((response:Response) => response.json())
            .toPromise();        
    }

    /**
     * Gets an access token for Twilio service.
    * */
    public getTwilioToken(identity: string, device: string): Promise<any> {
        return this.http.get(`/twilio-token?identity=${identity}&deviceId=${device}`)
            .map((response:Response) => response.json())
            .toPromise();
    }

    /**
     * Gets an access token for Virgil services.
     * */
    public getVirgilToken(): Promise<any> {
        return this.http.get('/virgil-token')
            .map((response:Response) => response.json())
            .toPromise();
    }
    
    /**
     * Gets decrypted history with current accoount's private key. 
     */
    public getHistory(identity:string, channelSid: string): Promise<any> {
        return this.http.get(`/history?identity=${identity}&channelSid=${channelSid}`)
            .map((response:Response) => response.json())
            .toPromise();
    }
}