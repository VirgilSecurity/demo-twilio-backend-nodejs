import { Component, OnInit } from '@angular/core';
import { Routes, Router, ROUTER_DIRECTIVES, ROUTER_PROVIDERS } from '@angular/router';
import { LoginComponent } from './login.component';
import { ChatComponent } from './chat.component';

import { ApplicationContext } from '../services/account.service'

@Component({
    selector: 'body',
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
                private context: ApplicationContext) { }
            
    ngOnInit(){
        
        if (this.context.hasAccount()){
            this.router.navigate(['/chat']);
            return;
        }
        
        this.router.navigate(['/login']);    
    }   
}