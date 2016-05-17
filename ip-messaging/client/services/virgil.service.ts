import { Injectable } from '@angular/core'

declare var VirgilSDK: any;

@Injectable()
export class VirgilService {   
    
    public crypto:any;
    public sdk:any;
    
    initialize(accessToken:string){
        this.sdk = new VirgilSDK(accessToken);
        this.crypto = this.sdk.crypto;
        
        console.log('Virgil SDK has been successfully initialized.');
    }
}