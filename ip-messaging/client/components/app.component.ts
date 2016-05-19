import { Component, OnInit, NgZone } from '@angular/core';

import { VirgilService } from '../services/virgil.service'
import { TwilioService } from '../services/twilio.service'
import { BackendService } from '../services/backend.service'

import { LoginComponent } from './login.component';
import { ChatComponent } from './chat.component';

import { AccountService } from '../services/account.service'

@Component({
    selector: 'ipm-app',
    templateUrl: './assets/views/app.component.html',   
    directives: [LoginComponent, ChatComponent]
})
export class AppComponent {
    
    public loginCallback: Function;
    
    constructor(private virgil: VirgilService,
                private twilio: TwilioService,
                private account: AccountService,
                private backend: BackendService,
                private zone: NgZone) { 
                    
                    console.log(zone);
                    
        this.loginCallback = this.onLogin.bind(this);    
    }
    
    isLoggedIn:boolean = false;    
            
    ngAfterViewInit(){        
        this.isLoggedIn = this.account.hasAccount();
        console.log(this.isLoggedIn);
    }
    
    onLogin() {
        
        this.zone.run(() => this.isLoggedIn = true);
    }
}