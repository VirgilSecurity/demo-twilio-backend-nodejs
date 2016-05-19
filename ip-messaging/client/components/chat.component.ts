import { Component, OnInit, ChangeDetectorRef } from '@angular/core'
import { NgClass } from '@angular/common'

import * as _ from 'lodash';

import { TwilioService }  from '../services/twilio.service'
import { BackendService } from '../services/backend.service'
import { AccountService } from '../services/account.service'
import { VirgilService }  from '../services/virgil.service'
import { FromNowPipe }  from '../pipes/from-now.pipe'

import * as moment from 'moment'

@Component({
    selector: 'ipm-chat',
    templateUrl: './assets/views/chat.component.html',
    directives: [NgClass],
    pipes: [FromNowPipe]
})
export class ChatComponent implements OnInit {
    
    messages = [];
    channels = [];
    channelMembers = [];    
    currentChannel: any;
    
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
        
    /** */
    public createChannel(channelName: string){
        
    }
        
    /**
     * Sets the current channel for chatting.
     */
    public setCurrentChannel(channel: any){        
                
        if (this.currentChannel != null){
                        
            this.currentChannel.removeListener('memberJoined', this.onMemberJoined);
            this.currentChannel.removeListener('memberLeft', this.onMemberLeft);
            this.currentChannel.removeListener('messageAdded', this.onMessageAdded);
            
            this.isBusy = true;
            
            this.currentChannel.leave().then(() => this.initializeChannel(channel));            
            return;
        }
        
        this.initializeChannel(channel);
    }
    
    /**
     * Initializes the currently selected channel.
     */
    public initializeChannel(channel: any){
                        
        channel.join().then(() => {                       
            channel.on('memberJoined', this.onMemberJoined);
            channel.on('memberLeft', this.onMemberLeft);
            channel.on('messageAdded', this.onMessageAdded);       
            
            return Promise.all([
                channel.getAttributes(),
                channel.getMembers(),
                channel.getMessages()
            ]);
        })
        .then(bunch => {       
            this.channelMembers = bunch[1];
            this.messages = bunch[2];
            
            this.currentChannel = channel;
            this.isBusy = false;
            this.cd.detectChanges();
        })
        .catch(() => {
            this.isBusy = false;
            this.cd.detectChanges();
        });
    }
            
    /**
     * Loads the current list of all Channels the Client knows about.
     */
    private loadChannels(): void{
        
        this.isBusy = true; 
        this.cd.detectChanges();
        
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
        console.log(message);
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
    }
    
    /**
     * Fired when a Channel is no longer visible to the Client.
     */
    private onChannelRemoved(channel:any): void{
    }   
}