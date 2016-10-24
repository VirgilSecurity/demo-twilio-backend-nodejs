import { Injectable } from '@angular/core'
import { VirgilService } from './virgil.service';

const Buffer = VirgilService.VirgilSDK.Buffer;

export class Account {
    constructor(public id: string,
                public identity: string,
                public identityType: string,
                public publicKey: Object,
                public privateKey: Object) { }

    public toJSON(): string {
        var obj = {
            id: this.id,
            identity: this.identity,
            identityType: this.identityType,
            publicKey: VirgilService.Crypto.exportPublicKey(this.publicKey).toString('base64'),
            privateKey: VirgilService.Crypto.exportPrivateKey(this.privateKey).toString('base64')
        };

        return JSON.stringify(obj);
    }
                    
    static fromJson(json: string) {
        var accountObject = JSON.parse(json);
        
        return new Account(
            accountObject.id, 
            accountObject.identity, 
            accountObject.identityType,
            VirgilService.Crypto.importPublicKey(new Buffer(accountObject.publicKey, 'base64')),
            VirgilService.Crypto.importPrivateKey(new Buffer(accountObject.privateKey, 'base64'))
        );
    }
}

@Injectable()
export class AccountService {   
        
    constructor () {
        this.currentAccount = this.loadAccount();
    }
        
    private currentAccount: Account;
    get current(): Account {
        return this.currentAccount;
    }    
    
    public hasAccount(){
        return this.currentAccount != null && this.currentAccount.identityType;
    }
        
    public setCurrentAccount(account:Account){
        this.currentAccount = account;        
        this.storeAccount(account);
    }

    public logout(): void {
        localStorage.removeItem('account');
    }
        
    private storeAccount(storeAccount:Account){
        localStorage.setItem('account', storeAccount.toJSON())
    }
    
    private loadAccount():Account{
                
        let accountJsonString = localStorage.getItem('account');
        if (accountJsonString == null){
            return null;
        }
                
        return Account.fromJson(accountJsonString);
    }
} 