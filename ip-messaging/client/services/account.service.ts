import { Injectable } from '@angular/core'

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
export class ApplicationContext {   
    
    constructor (){
        this._account = this.loadAccount();
    }
        
    private _account: Account;
    get account(): Account {
        return this._account;
    }    
    
    public hasAccount(){
        return this._account != null;
    }
    
    public setCurrentAccount(account:Account){
        this._account = account;        
        this.storeAccount(account);
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