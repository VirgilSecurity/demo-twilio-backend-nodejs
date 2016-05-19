import { Component, OnInit, ChangeDetectorRef } from '@angular/core'
import { NgClass } from '@angular/common'

import * as _ from 'lodash';

import { TwilioService } from '../services/twilio.service'
import { BackendService } from '../services/backend.service'
import { AccountService } from '../services/account.service'
import { VirgilService } from '../services/virgil.service'

@Component({
    selector: 'ipm-chat',
    templateUrl: './assets/views/chat.component.html',
    directives: [NgClass]
})
export class ChatComponent implements OnInit {
    
    // messages = [];
    channels = [];
    // currentChannel: any; 
    
    isBusy:boolean = false;
    
    constructor (
        private twilio: TwilioService,
        private backend: BackendService,
        private account: AccountService,
        private virgil: VirgilService,
        private cd: ChangeDetectorRef){
            
        // this.twilio.client.on('channelAdded', this.onChannelAdded);
        // this.twilio.client.on('channelRemoved', this.onChannelRemoved);
         console.log('pipka0');
         this.cd.markForCheck();
        // this.loadChannels();
        // this.isBusy = true;
    }
    
    ngOnChanges(){
        console.log('pipka-1');
    }
    
    public ngOnInit(){
        
        console.log('pipka');
                
        this.backend.auth(this.account.current.identity)
                .then(authData => {
                    this.virgil.initialize(authData.virgil_token);
                    this.twilio.initialize(authData.twilio_token);
                    
                    this.loadChannels();
                })
                .catch(error => {
                    alert(error);
                });
            
            return;
    }
    
    public routerOnActivate(){
        //this.loadChannels();
    }
        
    /**
     * Sets the current channel for chatting.
     */
    public setCurrentChannel(channel: any){
        
        // if (this.currentChannel != null){
        //     this.currentChannel.removeListener('memberJoined', this.onMemberJoined);
        //     this.currentChannel.removeListener('memberLeft', this.onMemberLeft);
        //     this.currentChannel.removeListener('messageAdded', this.onMessageAdded);
        // }
        
        // this.currentChannel = channel;
        
        // this.currentChannel.on('memberJoined', this.onMemberJoined);
        // this.currentChannel.on('memberLeft', this.onMemberLeft);
        // this.currentChannel.on('messageAdded', this.onMessageAdded);
    }
            
    /**
     * Loads the current list of all Channels the Client knows about.
     */
    private loadChannels(): void{
        
        this.isBusy = true; 
        
        this.twilio.client.getChannels().then(channels => {
                channels.forEach(channel => {
                    this.onChannelAdded(channel);                        
                });  
                    
                this.isBusy = false;
                this.cd.detectChanges();     
            })
            .catch(error => {                
                console.error(error);
            });     
    }
    
    /**
     * Fired when a new Message has been added to the Channel.
     */
    private onMessageAdded(message: any): void{        
    }    
    
    /**
     * Fired when a Member has joined the Channel. 
     */
    private onMemberJoined(member: any): void{        
    }
    
    /**
     * Fired when a Member has left the Channel.
     */
    private onMemberLeft(member: any): void{        
    }
    
    /**
     * Fired when a Channel becomes visible to the Client.
     */
    private onChannelAdded(channel:any): void{
        this.channels.push(channel);        
        console.log('Channel '+ channel.friendlyName + ' has been added.');
    }
    
    /**
     * Fired when a Channel is no longer visible to the Client.
     */
    private onChannelRemoved(channel:any): void{
    }   
}