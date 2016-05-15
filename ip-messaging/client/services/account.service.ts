import { Injectable } from '@angular/core'

export class Account {
    constructor(public id: string,
                public nickname: string) { }
                    
    static fromJson(json: string){
        var accountObject = JSON.parse(json);
        return new Account(accountObject.id, accountObject.nickname);
    }
}

@Injectable()
export class AccountService {
    public currentAccount: Account;
    
    constructor() {
        this.currentAccount = null;
    }
    
    isLoggedIn(){
        return this.currentAccount != null;
    }
    
    login(id: string, name: string, keyPair){
        
    }
    
    private getAccount(){
                
        var accountJsonString: string = localStorage.getItem('account');
        if (accountJsonString == null){
            return null;
        }
                
        return Account.fromJson(accountJsonString);
    }
} 