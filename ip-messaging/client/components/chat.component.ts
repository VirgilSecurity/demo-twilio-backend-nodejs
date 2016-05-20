import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core'
import { NgClass } from '@angular/common'

import { TwilioService }  from '../services/twilio.service'
import { BackendService } from '../services/backend.service'
import { AccountService } from '../services/account.service'
import { VirgilService }  from '../services/virgil.service'
import { FromNowPipe }  from '../pipes/from-now.pipe'
import { TooltipDirective } from '../directives/tooltip.directive'
import { ModalTriggerDirective } from '../directives/modal.directive'

import * as _ from 'lodash';

@Component({
    selector: 'ipm-chat',
    templateUrl: './assets/views/chat.component.html',
    directives: [NgClass, TooltipDirective, ModalTriggerDirective],
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
    public createChannel: Function;
    
    private memberJoinedHandler: any;
    private memberLeftHandler: any;
    private messageAddedHandler: any;
    
    constructor (
        public account: AccountService,
        private twilio: TwilioService,
        private backend: BackendService,        
        private virgil: VirgilService,
        private cd: ChangeDetectorRef) {

        this.createChannel = this.createChannelImpl.bind(this);
    }
    
    public ngOnInit(){
        this.twilio.client.on('channelAdded', this.onChannelAdded.bind(this));
        this.loadChannels();
    }
    
    /**
     * Deletes current channel.
     */
    public deleteChannel():void {
        if (this.currentChannel != null){
            this.currentChannel.delete().then(() => {
                _.remove(this.channels, c => c.sid == this.currentChannel.sid);
                this.currentChannel = null;
                this.cd.detectChanges();
            });
        }
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
                channel.getMembers(),
                this.backend.getHistory(this.account.current.identity, channel.sid)
            ]);
        })        
        .then(bunch => {                                 
            this.currentChannel = channel;         
            this.channelMembers = [];        
            this.messages = [];  
            
            let encryptedMessages = _.sortBy(bunch[2], 'dateUpdated');
            _.forEach(bunch[2], m => {
                this.onMessageAdded(m);
            });
               
            return Promise.all(bunch[1].map(m => this.addMember(m)));
        })
        .then(members => {
            this.isBusy = false;
            this.cd.detectChanges();           
            
            console.log(members);            
        })
        .catch(this.handleError);
        
    }

    /**
     * Createa a new channel by name.
     */
    private createChannelImpl() {
        console.log('create channel');
        if (_.isEmpty(this.newChannelName)) {
            return false;
        }

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
            this.newChannelName = '';
            this.onChannelAdded(channel);
            this.setCurrentChannel(channel);
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
        
        console.log(recipients);
        
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
        this.channels.push(channel);
        this.cd.detectChanges();    
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