import { Injectable } from '@angular/core'

declare var virgil: any;

@Injectable()
export class VirgilService {   
    
    public crypto:any;
    public client:any;

    initialize(accessToken: string) {
        this.client = virgil.client(accessToken);
        this.crypto = virgil.crypto;
        this.client.setCardValidator(virgil.cardValidator(virgil.crypto));
    }

    public static get VirgilSDK(): any {
        return virgil;
    }
    
    public static get Crypto(): any {
        return virgil.crypto;
    } 
}