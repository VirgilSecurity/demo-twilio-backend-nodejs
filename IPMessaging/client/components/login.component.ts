import { Component } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Router } from '@angular/router';

import { AccountService } from '../services/account.service'
import { VirgilService } from '../services/virgil.service'

@Component({
    templateUrl: './components/login.component.html'
})

export class LoginComponent{    
    constructor (private http: Http,
                 private account: AccountService,
                 private virgil: VirgilService,
                 private router: Router) { }
    
    public memberName: string;
    
    onLogin(){
        this.memberName = '';
                 
        //this.http.get("")
                
        this.router.navigate(['/chat'])
    }
}