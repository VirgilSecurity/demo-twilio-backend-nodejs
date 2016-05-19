import { Component, OnInit, ChangeDetectorRef } from '@angular/core'
import { NgClass } from '@angular/common'

import { TwilioService }  from '../services/twilio.service'
import { BackendService } from '../services/backend.service'
import { AccountService } from '../services/account.service'
import { VirgilService }  from '../services/virgil.service'
import { FromNowPipe }  from '../pipes/from-now.pipe'

import * as _ from 'lodash';
import * as moment from 'moment'

@Component({
    selector: 'ipm-chat',
    templateUrl: './assets/views/chat.component.html',
    directives: [NgClass],
    pipes: [FromNowPipe]
})
export class ChatComponent implements OnInit {
    
    public messages = [];
    public channels = [];    
    public channelMembers = [];        
    public currentChannel: any;    
    
    public isBusy:boolean = false;
    
    public newChannelName: string;
    public isChannelCreating: boolean;
    
    constructor (
        private twilio: TwilioService,
        private backend: BackendService,
        private account: AccountService,
        private virgil: VirgilService,
        private cd: ChangeDetectorRef){
    }
    
    public ngOnInit(){
        this.loadChannels();
    }
        
    /** 
     * Createa a new channel by name. 
     */
    public createChannel(){
        
        this.isChannelCreating = true;        
        this.virgil.sdk.cards.search({ value: "twilio_chat_admin" }).then((result) => {
           
            let latestCard: any = _.last(_.sortBy(result, 'created_at'));           
            
            let options = { 
                friendlyName: this.newChannelName,
                attributes: {
                    virgil_card_id: latestCard.id,
                    virgil_public_key: latestCard.public_key.public_key
                } 
            };
            
            return this.twilio.client.createChannel(options);   
        })
        .then(function (channel) {
            this.isChannelCreating = false;
            this.onChannelAdded(channel);
            this.setCurrentChannel(channel);
            
            //self.channels.push(channel);
            //self.setChannel(channel);
        })
        .catch(this.handleError);
    }
        
    /**
     * Sets the current channel for chatting.
     */
    public setCurrentChannel(channel: any){
        
        if (channel == this.currentChannel) {
            return;
        }        
        
        this.isBusy = true; 
        this.cd.detectChanges();
                
        if (this.currentChannel != null){
                        
            this.currentChannel.removeListener('memberJoined', this.onMemberJoined);
            this.currentChannel.removeListener('memberLeft', this.onMemberLeft);
            this.currentChannel.removeListener('messageAdded', this.onMessageAdded);
            
            this.currentChannel.leave()
                .then(() => this.initializeChannel(channel));
                            
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
        .catch(this.handleError);
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
        .catch(this.handleError);     
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
        
        if (_.any(this.channels, it => it.sid == channel.sid)){
            return;
        }
        
        this.channels.push(channel);        
    }
    
    /**
     * Fired when a Channel is no longer visible to the Client.
     */
    private onChannelRemoved(channel:any): void{
    }
    
    /**
     * Handles an chat errors.
     */
    private handleError(error): void{     
        this.isBusy = false;
        this.cd.detectChanges();    
        
        console.error(error);    
    }   
}