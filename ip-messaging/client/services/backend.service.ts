import { Injectable } from '@angular/core'
import { Http, Response, Headers, RequestOptions } from '@angular/http'
import { VirgilService } from './virgil.service'
import * as _ from 'lodash'

@Injectable()
export class BackendService {
        
    private appPublicKey: string; 
        
    constructor(
        private http: Http) {}
    
    /**
     * Gets a validation token for Virgil services.
     */
    public auth(identity: string, publicKey?: string): Promise<any> {
        let body = JSON.stringify({ identity: identity, public_key: publicKey });
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        
        return this.http.post("/auth/login", body, options)
            .toPromise().then(r => this.verifyAndMapToJson(r));        
    }

    /**
     * Gets an access token for Twilio service.
    * */
    public getTwilioToken(identity: string, device: string): Promise<any> {
        return this.http.get(`/auth/twilio-token?identity=${identity}&deviceId=${device}`)
            .toPromise().then(r => this.verifyAndMapToJson(r));   
    }

    /**
     * Gets an access token for Virgil services.
     * */
    public getVirgilToken(): Promise<any> {
        return this.http.get('/auth/virgil-token')
            .toPromise()
            .then(r => Promise.resolve(r.json()));   
    }
    
    /**
     * Gets decrypted history with current accoount's private key. 
     */
    public getHistory(identity:string, channelSid: string): Promise<any> {
        return this.http.get(`/history?identity=${identity}&channelSid=${channelSid}`)
            .toPromise().then(r => this.verifyAndMapToJson(r));   
    }

    /**
     * Sets the Application Public Key, uses to prevent men-in-the-middle attacs.
     */
    public setAppPublicKey(publicKey: string) {
        this.appPublicKey = publicKey;
    }

    /**
     * Gets an application's Public Key. 
     */
    public get AppPublicKey(): string {
        return this.appPublicKey;
    } 

    /**
     * Verifies resoponse using application's Public Key.
     */
    private verifyAndMapToJson(response:Response): Promise<any>{        
        
        let virgilCrypto = VirgilService.Crypto;
        
        let responseSign = new virgilCrypto.Buffer(response.headers.get('x-ipm-response-sign'), 'base64');
        let isValid = virgilCrypto.verify(response.text(), this.appPublicKey, responseSign);
        if (!isValid){
            throw "Response signature is not valid."
        }
        
        return Promise.resolve(response.json());
    }
}