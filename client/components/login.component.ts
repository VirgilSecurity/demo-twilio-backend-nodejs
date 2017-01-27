import { Component, Input } from '@angular/core';

@Component({
    selector: 'ipm-login',
    templateUrl: './assets/views/login.component.html'
})

export class LoginComponent{
    
    @Input() public login: Function;
    
    constructor () { }

    public nickName: string;
    public isBusy: boolean;
    
    public onLogin(): void {
        this.isBusy = true;
        this.login(this.nickName);
    }
}