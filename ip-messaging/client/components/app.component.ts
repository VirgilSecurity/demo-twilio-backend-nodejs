import { Component, OnInit } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Routes, Router, ROUTER_DIRECTIVES, ROUTER_PROVIDERS } from '@angular/router';
import { VirgilService } from '../services/virgil.service'
import { TwilioService } from '../services/twilio.service'

import { LoginComponent } from './login.component';
import { ChatComponent } from './chat.component';

import { AccountService } from '../services/account.service'

@Component({
    selector: 'ipm-app',
    templateUrl: './assets/views/app.component.html',
    directives: [ ROUTER_DIRECTIVES ],
    providers: [ ROUTER_PROVIDERS ]
})
@Routes([
    { path: '/login', component: LoginComponent },
    { path: '/chat', component: ChatComponent }
])
export class AppComponent implements OnInit { 
    
    constructor(private router: Router,
                private http: Http,
                private virgil: VirgilService,
                private twilio: TwilioService,
                private account: AccountService) { }
            
    ngOnInit(){
        
        // if (this.account.hasAccount()){
            
        //     this.http.get('/auth?identity=' + this.account.current.identity + '&deviceId=web').toPromise()
        //         .then((response:Response) => {                    
        //             let authData = response.json();
                                        
        //             this.virgil.initialize(authData.virgil_token);
        //             this.twilio.initialize(authData.twilio_token);
                    
        //             this.router.navigate(['/chat']);                    
        //         });              
            
        //     return;
        // }
        
        // this.router.navigate(['/login']);    
    }   
}