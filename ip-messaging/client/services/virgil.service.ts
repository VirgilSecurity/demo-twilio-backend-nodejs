import { Injectable } from '@angular/core'

export declare var VirgilSDK: any;

@Injectable()
export class VirgilService {   
    
    public crypto:any;
    public sdk:any;

    initialize(accessToken: string) {
        this.sdk = new VirgilSDK(accessToken);
        this.crypto = this.sdk.crypto;
    }
    
    public static get Crypto(): any {
        return new VirgilSDK('NONE').crypto;
    } 
}