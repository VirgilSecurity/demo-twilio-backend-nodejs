import { Injectable } from '@angular/core'

declare var VirgilSDK: any;

@Injectable()
export class VirgilService {   
    
    public crypto;
    public sdk;
    
    initialize(accessToken:string){
        this.sdk = new VirgilSDK(accessToken);
        this.crypto = this.sdk.crypto;
    }
}