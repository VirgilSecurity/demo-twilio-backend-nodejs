import { Component } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { Router } from '@angular/router';
import * as _ from 'lodash';

import { AccountService, Account } from '../services/account.service'
import { VirgilService } from '../services/virgil.service'
import { TwilioService } from '../services/twilio.service'

@Component({
    selector: 'login',
    templateUrl: './assets/views/login.component.html'
})

export class LoginComponent{    
    constructor (private http: Http,
                 private account: AccountService,
                 private virgil: VirgilService,
                 private twilio: TwilioService,
                 private router: Router) { }
    
    public nickName: string;    
    public isBusy: boolean;
    
    onLogin(){        
        this.isBusy = true;
        
        let validationToken: string;
                
        this.http.get('/auth?identity=' + this.nickName + '&deviceId=web').toPromise()
            .then((response:Response) => { 
                let authData = response.json();
                
                validationToken = authData.validation_token;
                
                // initialize virgil SDK using token generated on backend.
                this.virgil.initialize(authData.virgil_token);
                
                // initialize twilio client using token generated on backend.
                this.twilio.initialize(authData.twilio_token);
                
                // search for public key for current user nickname              
                return this.virgil.sdk.cards.search({ value: authData.identity }); 
            })
            .then(cards => {      
                
                console.log("Found " + cards.length + " cards");                
                                
                if (cards.length == 0) {
                    return this.publish(this.nickName, validationToken);            
                }
                
                let card =  _.last(_.sortBy(cards, 'created_at'));                
                return this.download(card, validationToken);
            })
            .then(keysBundle => {
                this.isBusy = false;
            })
            .catch((error) => {
                throw error;
            });
    }
    
    private download(card: any, validationToken: string) : Promise<any> {
        
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
                    card: card, 
                    privateKey: response.private_key 
                };                   
            });
    } 
    
    private publish(identity: string, validationToken: string) : Promise<any> {
               
        let keyPair: any = null;
        
        return this.virgil.crypto.generateKeyPairAsync()
            .then(generatedKeyPair => {
                                
                keyPair = generatedKeyPair;                
                let cardInfo = {
                    public_key: keyPair.publicKey,
                    private_key: keyPair.privateKey,
                    identity: {
                        type: 'nickname',
                        value: identity,
                        validation_token: validationToken
                    }
                }
                                
                return this.virgil.sdk.cards.create(cardInfo);
            })
            .then(createdCard => {                
                return { 
                    card: createdCard, 
                    privateKey: keyPair.privateKey 
                };                
            });
    }
}