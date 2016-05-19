import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core'
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
    
    @Input() public logout: Function;
    
    public messages = [];
    public channels = [];    
    public channelMembers = [];        
    public currentChannel: any;    
    
    public isBusy:boolean = false;
    
    public newChannelName: string;
    public isChannelCreating: boolean;    
    
    public newMessage: string;
    
    private memberJoinedHandler: any;
    private memberLeftHandler: any;
    private messageAddedHandler: any;
    
    constructor (
        public account: AccountService,
        private twilio: TwilioService,
        private backend: BackendService,        
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
        .then((channel) => {
            this.isChannelCreating = false;
            this.onChannelAdded(channel);
            this.setCurrentChannel(channel);
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
                        
            this.currentChannel.removeListener('memberJoined', this.memberJoinedHandler);
            this.currentChannel.removeListener('memberLeft', this.memberLeftHandler);
            this.currentChannel.removeListener('messageAdded', this.messageAddedHandler);
            
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
                        
        this.memberJoinedHandler = this.onMemberJoined.bind(this);
        this.memberLeftHandler = this.onMemberLeft.bind(this);
        this.messageAddedHandler = this.onMessageAdded.bind(this);
                        
        channel.join().then(() => {                       
            channel.on('memberJoined', this.memberJoinedHandler);
            channel.on('memberLeft', this.memberLeftHandler);
            channel.on('messageAdded', this.messageAddedHandler);
            
            return Promise.all([
                channel.getAttributes(),
                channel.getMembers()
            ]);
        })        
        .then(bunch => {                                 
            this.currentChannel = channel;         
            this.channelMembers = [];           
               
            return Promise.all(bunch[1].map(m => this.addMember(m)));
        })
        .then(members => {
            this.messages = [];
            
            this.isBusy = false;
            this.cd.detectChanges();           
            
            console.log(members);            
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
     * Encrypts & posts the new message to current channel.
     */
    private postMessage(): void {
        
        let messageString = this.newMessage;
        let recipients = [];
                
        recipients.push({
            recipientId: this.currentChannel.attributes.virgil_card_id,
            publicKey: this.currentChannel.attributes.virgil_public_key
        });
        
        this.channelMembers.forEach(m => {
             recipients.push({ recipientId: m.publicKey.id, publicKey: m.publicKey.data });
        })
        
        let message = {
            body: this.newMessage,
            date: Date.now(),
            author: this.account.current.identity,
            id: this.virgil.sdk.publicKeys.generateUUID()
        };
        
        this.newMessage = '';
        this.messages.push(message);
        
        this.virgil.crypto.encryptAsync(JSON.stringify(message), recipients).then(encryptedMessage => {
            this.currentChannel.sendMessage(encryptedMessage.toString('base64'));     
        });     
    }
    
    /**
     * Loads the member's public key and the member to the current member collection.
     */
    private addMember(member):Promise<any> {             
        return this.virgil.sdk.cards.search({ value: member.identity }).then(result => {
            
            var latestCard: any = _.last(_.sortBy(result, 'created_at'));
            if (latestCard){
                member.publicKey = {
                    id: latestCard.id,
                    identity: latestCard.identity.value,
                    data: latestCard.public_key.public_key
                };
            }
            
            this.channelMembers.push(member);
            return member;
        });
    }
    
    /**
     * Fired when a new Message has been added to the Channel.
     */
    private onMessageAdded(message: any): void{        
        
        var encryptedBuffer = new this.virgil.crypto.Buffer(message.body, "base64");
        var decryptedMessage = this.virgil.crypto.decrypt(
            encryptedBuffer, 
            this.account.current.id, 
            this.account.current.privateKey).toString('utf8');

        var messageObject = JSON.parse(decryptedMessage);
        
        if (_.some(this.messages, m => m.id == messageObject.id)){
            return;
        }            
        
        this.messages.push(messageObject);
        this.cd.detectChanges();
    }    
    
    /**
     * Fired when a Member has joined the Channel. 
     */
    private onMemberJoined(member: any): void{        
        this.addMember(member).then(m => {
            this.cd.detectChanges();
        });
    }
    
    /**
     * Fired when a Member has left the Channel.
     */
    private onMemberLeft(member: any): void{    
        _.remove(this.channelMembers, m => m.sid == member.sid);
        this.cd.detectChanges();         
    }
    
    /**
     * Fired when a Channel becomes visible to the Client.
     */
    private onChannelAdded(channel:any): void{
        
        // if (_.any(this.channels, it => it.sid == channel.sid)){
        //     return;
        // }
        
        this.channels.push(channel);
        this.cd.detectChanges();    
        console.log(channel);    
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
        //this.isBusy = false;
        //this.cd.detectChanges();    
        
        console.error(error);    
    }   
}