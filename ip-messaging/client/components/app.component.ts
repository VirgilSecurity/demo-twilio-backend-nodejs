import { Component, OnInit, NgZone } from '@angular/core';

import * as _ from 'lodash';

import { VirgilService } from '../services/virgil.service'
import { TwilioService } from '../services/twilio.service'
import { BackendService } from '../services/backend.service'

import { LoginComponent } from './login.component';
import { ChatComponent } from './chat.component';

import { Account, AccountService } from '../services/account.service'

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
                private zone: NgZone) {
        this.loginCallback = this.onLogin.bind(this);
        this.logoutCallback = this.onLogout.bind(this);
    }
    
    isLoggedIn:boolean = false;
            
    ngOnInit() {
        if (this.account.hasAccount()) {
            this.initializeServices(this.account.current.identity)
                .then(() => {
                    this.isLoggedIn = true;
                });
        }
    }

    authenticate(nickName: string): Promise<any> {
        let validationToken: string;

        return this.initializeServices(nickName)
        .then(() => {
           return this.backend.auth(nickName)
        })
        .then(authData => {

            validationToken = authData.validation_token;

            // search for public key for current user nickname
            return this.virgil.sdk.cards.search({ value: authData.identity });
        })
        .then(cards => {

            if (cards.length == 0) {

                // publish new public key for current user

                return this.publish(nickName, validationToken);
            }

            // download keys from Virgil services in case when
            // user is already exists.

            let card =  _.last(_.sortBy(cards, 'created_at'));
            return this.download(card, validationToken);
        })
        .then(keysBundle => {

            var userAccount = new Account(keysBundle.id, keysBundle.identity,
                keysBundle.publicKey, keysBundle.privateKey);

            return this.account.setCurrentAccount(userAccount);
        })
        .catch((error) => {
            throw error;
        });
    }

    initializeServices(identity:string): Promise<any> {
        return Promise.all([this.virgil.initialize(), this.twilio.initialize(identity)]);
    }
    
    onLogin(nickName: string): void {
        this.authenticate(nickName).then(() => {
            this.zone.run(() => this.isLoggedIn = true);
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

    private publish(identity: string, validationToken: string) : Promise<any> {

        let keyPair: any = null;
        let card: any = null;

        // generating public/private keyPair for current user.
        return this.virgil.crypto.generateKeyPairAsync()
            .then(generatedKeyPair => {

                keyPair = generatedKeyPair;

                // prepare request for Card creation.
                let cardInfo = {
                    public_key: keyPair.publicKey,
                    private_key: keyPair.privateKey,
                    identity: {
                        type: 'nickname',
                        value: identity,
                        validation_token: validationToken
                    }
                };

                // create private card using application validation
                // token. See more about validation tokens here
                // https://virgilsecurity.com/api-docs/javascript/keys-sdk

                return this.virgil.sdk.cards.create(cardInfo);
            })
            .then(createdCard => {
                card = createdCard;

                // store private key in a safe storage which lets you
                // synchronize your private key between the devices and
                // applications.

                return this.virgil.sdk.privateKeys.stash({
                    virgil_card_id: createdCard.id,
                    private_key: keyPair.privateKey
                });
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
}