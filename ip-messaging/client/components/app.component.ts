import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

import * as _ from 'lodash';

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
        let keyPair: any;

        return this.initializeServices(nickName)
        .then(() => {
            
            // search for public key for current user nickname
            return this.virgil.sdk.cards.search({ 
                value: nickName, 
                type:'chat_member' 
            });
        })
        .then(cards => {
            if (cards.length == 0) {         
                return this.virgil.crypto.generateKeyPairAsync().then(generatedKeyPair => {
                    keyPair = generatedKeyPair;
                    return this.backend.auth(nickName, generatedKeyPair.publicKey);
                }).then(authData => {
                    return this.publish(nickName, authData.validation_token, keyPair, authData.application_sign);
                });     
            }
            else {
                let card: any =  _.last(_.sortBy(cards, 'created_at'));
                return this.backend.auth(card.identity.value, card.public_key.public_key).then(authData => {
                    return this.download(card, authData.validation_token);
                })
            }
        })
        .then(keysBundle => {
            var userAccount = new Account(keysBundle.id, keysBundle.identity, 'chat_member',
                keysBundle.publicKey, keysBundle.privateKey);
                
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

                return this.virgil.sdk.cards.searchGlobal({
                    value: APP_BUNDLE_ID,
                    type: VirgilService.VirgilSDK.IdentityTypes.application
                });              
            })
            .then(cards => {
                this.backend.setAppPublicKey(cards[0].public_key.public_key);
                return this.backend.getTwilioToken(identity, 'web');
            })
            .then(data => {
                this.twilio.initialize(data.twilio_token);
                this.twilio.client.on('tokenExpired', this.onLogout.bind(this));

                console.log('Services has been successfully initialized.');  
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

    private download(card: any, validationToken: string) : Promise<any> {

        // download your private key from Virgil services
        // using validation token received from application
        // server.

        return this.virgil.sdk.privateKeys.get({
                virgil_card_id: card.id,
                identity: {
                    type: card.identity.type,
                    value: card.identity.value,
                    validation_token: validationToken
                }
            })
            .then(response => {
                return {
                    id: card.id,
                    identity: card.identity.value,
                    publicKey: card.public_key.public_key,
                    privateKey: response.private_key
                };
            });
    }

    private publish(identity: string, validationToken: string, keyPair: any, applicationSign: string ) : Promise<any> {

        let card: any = null;
        
        // prepare request for Card creation.
        let cardInfo = {
            public_key: keyPair.publicKey,
            private_key: keyPair.privateKey,
            data: {
                public_key_signature: applicationSign,
            },
            identity: {
                type: 'chat_member',
                value: identity,
                validation_token: validationToken
            }
        };

        // create private card using application validation
        // token. See more about validation tokens here
        // https://virgilsecurity.com/api-docs/javascript/keys-sdk

        return this.virgil.sdk.cards.create(cardInfo).then(createdCard => {
            card = createdCard;

            // store private key in a safe storage which lets you
            // synchronize your private key between the devices and
            // applications.
            
            console.log(`Member's Public Key has been sucessfully registered!`, card);

            return this.virgil.sdk.privateKeys.stash({
                virgil_card_id: createdCard.id,
                private_key: keyPair.privateKey
            });
        }).then(response => {
            return {
                id: card.id,
                identity: card.identity.value,
                publicKey: keyPair.publicKey,
                privateKey: keyPair.privateKey
            };
        });
    }
}