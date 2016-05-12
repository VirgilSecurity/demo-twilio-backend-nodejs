import { Component } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs/Rx';
import { Router } from '@angular/router';

import { AccountService } from '../services/account.service'
import { VirgilService } from '../services/virgil.service'

@Component({
    selector: 'login',
    templateUrl: './assets/views/login.component.html'
})

export class LoginComponent{    
    constructor (private http: Http,
                 private account: AccountService,
                 private virgil: VirgilService,
                 private router: Router) { }
    
    public memberName: string;    
    public isBusy: boolean;
    
    onLogin(){
        console.log('Login');
        this.isBusy = true;
        
        this.http.get("/login-it?name=" + this.memberName)
            .map((res:Response) => res.json())
            .subscribe(
                data => {  },
                err => {  },
                () => this.isBusy = false
            );
        
        //this.router.navigate(['/chat'])
    }
}