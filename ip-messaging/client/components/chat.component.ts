import { Component, OnInit } from '@angular/core'
import { NgClass } from '@angular/common'
import { OnActivate, RouteSegment } from '@angular/router'
import { TwilioService, Message, Channel } from '../services/twilio.service'

import * as _ from 'lodash';

@Component({
    selector: 'ipm-chat',
    templateUrl: './assets/views/chat.component.html',
    directives: [NgClass]
})
export class ChatComponent implements OnInit, OnActivate {
    
    // messages = [];
    // channels = [];
    // currentChannel: any; 
    
    isBusy:boolean = false;
    
    constructor (private twilio: TwilioService){
        // this.twilio.client.on('channelAdded', this.onChannelAdded);
        // this.twilio.client.on('channelRemoved', this.onChannelRemoved);
        //console.log('pipka');
        //this.loadChannels();
        //this.isBusy = true;
    }
    
    public ngOnInit(){
        console.log('pipka');
        //this.loadChannels();
    }
    
    public routerOnActivate(){
        console.log('pipka1');
        this.isBusy = true;
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
        // this.cd.markForCheck();    
        
        // this.twilio.client.getChannels().then(channels => {
        //         channels.forEach(channel => {
        //             this.onChannelAdded(channel);                        
        //         });  
                    
        //         this.isBusy = false;   
        //         // this.cd.markForCheck();           
        //         this.cd.detectChanges();     
        //     })
        //     .catch(error => this.do(() => {
        //         this.isBusy = false;                
        //         console.error(error);
        //     }));     
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
        //this.channels.push(channel);        
        //console.log('Channel '+ channel.friendlyName + ' has been added.');
    }
    
    /**
     * Fired when a Channel is no longer visible to the Client.
     */
    private onChannelRemoved(channel:any): void{
    }   
}