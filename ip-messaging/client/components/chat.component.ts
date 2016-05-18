import { Component } from '@angular/core'
import { Observable } from 'rxjs/Observable';
import { TwilioService, Message, Channel } from '../services/twilio.service'
import * as _ from 'lodash';

@Component({
    selector: 'ipm-chat',
    templateUrl: './assets/views/chat.component.html'
})

export class ChatComponent {
    
    public messages: Array<any> = new Array<any>();
    public channels: Array<any> = new Array<any>();
    public currentChannel: any; 
    
    public isBusy: boolean;
    
    constructor (private twilio: TwilioService){
        this.twilio.client.on('channelAdded', this.onChannelAdded);
        this.twilio.client.on('channelRemoved', this.onChannelRemoved);
        
        this.loadChannels();
    }
    
    /**
     * Sets the current channel for chatting.
     */
    public setCurrentChannel(channel: any){
        
        if (this.currentChannel != null){
            this.currentChannel.removeListener('memberJoined', this.onMemberJoined);
            this.currentChannel.removeListener('memberLeft', this.onMemberLeft);
            this.currentChannel.removeListener('messageAdded', this.onMessageAdded);
        }
        
        this.currentChannel = channel;
    }
            
    /**
     * Loads the current list of all Channels the Client knows about.
     */
    private loadChannels(): void{
        this.twilio.client.getChannels().then(channels => {                
                channels.forEach(channel => {
                    this.onChannelAdded(channel);
                });                                                   
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