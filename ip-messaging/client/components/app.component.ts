import { Component, OnInit } from '@angular/core';
import { Routes, Router, ROUTER_DIRECTIVES } from '@angular/router';
import { LoginComponent } from './login.component';
import { ChatComponent } from './chat.component';

import { AccountService } from '../services/account.service'

@Component({
    selector: 'body',
    templateUrl: './assets/views/app.component.html',
    styleUrls: ['./assets/views/app.component.css'],
    directives: [ ROUTER_DIRECTIVES ]
})

@Routes([
    { path: '/login', component: LoginComponent },
    { path: '/chat', component: ChatComponent }
])

export class AppComponent implements OnInit { 
    
    constructor(private router: Router,
                private accountService: AccountService) { }
            
    ngOnInit(){
        
        if (this.accountService.isLoggedIn()){
            this.router.navigate(['/chat']);
            return;
        }
        
        this.router.navigate(['/login']);    
    }   
}