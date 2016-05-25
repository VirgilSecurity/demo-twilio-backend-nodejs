import { Injectable } from '@angular/core'
import { BackendService } from './backend.service'

declare var VirgilSDK: any;
declare var VirgilCrypto: any;

@Injectable()
export class VirgilService {   
    
    public crypto:any;
    public sdk:any;

    constructor(private backend: BackendService) { }

    initialize(): Promise<any> {
        return this.backend.getVirgilToken()
            .then(data => {
                this.sdk = new VirgilSDK(data.virgil_token);
                this.crypto = this.sdk.crypto;
                return;
            });
    }
    
    public static get Crypto(): any {
        return new VirgilSDK('NONE').crypto;
    }
}