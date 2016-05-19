import { Injectable } from '@angular/core'
import { VirgilService } from './virgil.service'
import { TwilioService } from './twilio.service'

export class Account {
    constructor(public id: string,
                public identity: string,
                public publicKey: string,
                public privateKey: string) { }
                    
    static fromJson(json: string){
        var accountObject = JSON.parse(json);
        
        return new Account(
            accountObject.id, 
            accountObject.identity, 
            accountObject.publicKey, 
            accountObject.privateKey
        );
    }
}

@Injectable()
export class AccountService {   
        
    constructor (private virgil:VirgilService,
                 private twilio:TwilioService){
        this.currentAccount = this.loadAccount();
    }
        
    private currentAccount: Account;
    get current(): Account {
        return this.currentAccount;
    }    
    
    public hasAccount(){
        return this.currentAccount != null;
    }
        
    public setCurrentAccount(account:Account){
        this.currentAccount = account;        
        this.storeAccount(account);
    }

    public logout(): void {
        localStorage.removeItem('account');
    }
    
    private storeAccount(storeAccount:Account){
        localStorage.setItem('account', JSON.stringify(storeAccount))
    }
    
    private loadAccount():Account{
                
        let accountJsonString = localStorage.getItem('account');
        if (accountJsonString == null){
            return null;
        }
                
        return Account.fromJson(accountJsonString);
    }
} 