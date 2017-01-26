import * as _ from 'lodash';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

import { VirgilService } from '../services/virgil.service'
import { TwilioService } from '../services/twilio.service'
import { BackendService } from '../services/backend.service'
import { LoginComponent } from './login.component';
import { ChatComponent } from './chat.component';
import { Account, AccountService } from '../services/account.service'

declare var APP_BUNDLE_ID: any;

@Component({
    selector: 'ipm-app',
    templateUrl: './assets/views/app.component.html',   
    directives: [LoginComponent, ChatComponent]
})
export class AppComponent implements OnInit {
    
    public loginCallback: Function;
    public logoutCallback: Function;
    
    constructor(private virgil: VirgilService,
                private twilio: TwilioService,
                private account: AccountService,
                private backend: BackendService,
                private cd: ChangeDetectorRef) {
        this.loginCallback = this.onLogin.bind(this);
        this.logoutCallback = this.onLogout.bind(this);
    }
    
    isReady:boolean = false;
    isLoggedIn:boolean = false;
            
    ngOnInit() {
        if (this.account.hasAccount()) {            
                     
            this.initializeServices(this.account.current.identity)
                .then(() => {
                    this.isLoggedIn = true;   
                    this.isReady = true;
                    this.cd.detectChanges();
                });
                
             return;
        }
        
        this.isReady = true;
        this.isLoggedIn = false;
        this.cd.detectChanges();
    }

    authenticate(nickName: string): Promise<any> {
        return this.initializeServices(nickName)
        .then(() => this.createCard(nickName))
        .then(keysBundle => {
            var userAccount = new Account(
                keysBundle.id,
                keysBundle.identity,
                'chat_member',
                keysBundle.publicKey,
                keysBundle.privateKey);

            console.log('CURRENT ACCOUNT: ');
            console.log(userAccount);    
            return this.account.setCurrentAccount(userAccount);
        })
        .catch((error) => {
            throw error;
        });
    }

    initializeServices(identity:string): Promise<any> {
        
        return this.backend.getVirgilToken()
            .then(data => {
                this.virgil.initialize(data.virgil_token);
                return this.virgil.client.getCard(APP_BUNDLE_ID);              
            })
            .then(appCard => {
                var appPublicKeyBuffer = VirgilService.VirgilSDK.Buffer.from(appCard.publicKey);
                this.backend.setAppPublicKey(this.virgil.crypto.importPublicKey(appPublicKeyBuffer));
                
                return this.backend.getTwilioToken(identity, 'web');
            })
            .then(data => {
                this.twilio.initialize(data.twilio_token);
                this.twilio.client.on('tokenExpired', this.onLogout.bind(this));

                console.log('Services have been successfully initialized.');
            });
    }
    
    onLogin(nickName: string): void {
        this.authenticate(nickName).then(() => {
            this.isReady = true;
            this.isLoggedIn = true;
            this.cd.detectChanges();
        });
    }
    
    onLogout(): void {
        this.account.logout();
        window.location.reload();
    }
    
    private createCard(username: string) : Promise<any> {
        
        let keyPair = this.virgil.crypto.generateKeys();
        let rawPublicKey = this.virgil.crypto.exportPublicKey(keyPair.publicKey);
    
        let request = VirgilService.VirgilSDK.publishCardRequest({
            identity: username,
            identity_type: 'chat_member',
            public_key: rawPublicKey.toString('base64')
        });
    
        let signer = VirgilService.VirgilSDK.requestSigner(this.virgil.crypto);
        signer.selfSign(request, keyPair.privateKey);

        var requestBody = { exported_card_request: request.export() };
        
        return this.backend.createVirgilCard(requestBody)
            .then((card) => {
                return _.assign({}, card, keyPair);
            });
    }

}