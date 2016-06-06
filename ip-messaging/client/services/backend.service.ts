import { Injectable } from '@angular/core'
import { Http, Response, Headers, RequestOptions } from '@angular/http'
import { VirgilService } from './virgil.service'
import * as _ from 'lodash'

@Injectable()
export class BackendService {
    
    // hardcoded application's Public Key, uses to prevent 
    // men-in-the-middle attacs.
    
    public static AppPublicKey: string = 
        "-----BEGIN PUBLIC KEY-----"+
        "\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEQLTCR+NkPokcgHPTWi6kwSPByatN" + 
        "\ns5TT38K9QXqEyM/pqQtbwPQ35W0iv/wgG9+jk1dPMklnBIeK3RlXsRu8sg==\n" + 
        "-----END PUBLIC KEY-----"; 
        
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
            .toPromise().then(r => this.verifyAndMapToJson(r));   
    }
    
    /**
     * Gets decrypted history with current accoount's private key. 
     */
    public getHistory(identity:string, channelSid: string): Promise<any> {
        return this.http.get(`/history?identity=${identity}&channelSid=${channelSid}`)
            .toPromise().then(r => this.verifyAndMapToJson(r));   
    }
    
    /**
     * Verifies resoponse using application's Public Key.
     */
    private verifyAndMapToJson(response:Response): Promise<any>{        
        
        let virgilCrypto = VirgilService.Crypto;
        
        let responseSign = new virgilCrypto.Buffer(response.headers.get('x-ipm-response-sign'), 'base64');
        let isValid = virgilCrypto.verify(response.text(), BackendService.AppPublicKey, responseSign);
        if (!isValid){
            throw "Response signature is not valid."
        }
        
        return Promise.resolve(response.json());
    }
}