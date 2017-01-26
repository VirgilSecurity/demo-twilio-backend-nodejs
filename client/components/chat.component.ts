import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core'
import { NgClass } from '@angular/common'

import { TwilioService }  from '../services/twilio.service'
import { BackendService } from '../services/backend.service'
import { AccountService } from '../services/account.service'
import { VirgilService }  from '../services/virgil.service'
import { FromNowPipe }  from '../pipes/from-now.pipe'
import { TooltipDirective } from '../directives/tooltip.directive'
import { ModalTriggerDirective } from '../directives/modal.directive'
import { ScrollIntoViewDirective } from '../directives/scroll-into-view.directive'
import { SidebarDirective } from '../directives/sidebar.directive'

import * as _ from 'lodash';

const Buffer = VirgilService.VirgilSDK.Buffer;

@Component({
    selector: 'ipm-chat',
    templateUrl: './assets/views/chat.component.html',
    directives: [
        NgClass,
        TooltipDirective,
        ModalTriggerDirective, 
        ScrollIntoViewDirective,
        SidebarDirective
    ],
    pipes: [FromNowPipe]
})
export class ChatComponent implements OnInit {
    
    @Input() public logout: Function;
    
    public messages = [];
    public channels = [];    
    public channelMembers = [];        
    public currentChannel: any;    
    public currentChannelHasHistory:boolean = false;
    public currentChannelAdminPublicKey: any = null;
    
    public isChannelsLoading:boolean = false;
    public isChannelHistoryLoading: boolean = false;
    
    public newChannelName: string;
    public includeChannelHistory: boolean = true;
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
        this.twilio.client.on('channelRemoved', this.onChannelRemoved.bind(this));
        this.loadChannels();
    }
    
    /**
     * Deletes current channel.
     */
    public deleteChannel():void {     
        
        _.remove(this.channels, ch => ch.sid == this.currentChannel.sid);                    
        this.currentChannel.delete();    
        this.currentChannel = null;           
        
        this.cd.detectChanges();        
    }
        
    /**
     * Sets the current channel for chatting.
     */
    public setCurrentChannel(channel: any){
        
        if (channel == this.currentChannel) {
            return;
        }        
        
        console.log("Channel Selected", channel);
        
        this.channelMembers = [];        
        this.messages = []; 
        
        if (this.currentChannel != null) {
            
            this.currentChannel.removeListener('memberJoined', this.memberJoinedHandler);
            this.currentChannel.removeListener('memberLeft', this.memberLeftHandler);
            this.currentChannel.removeListener('messageAdded', this.messageAddedHandler);
            
            this.currentChannel.leave();
        }
        
        this.currentChannel = channel;
        this.currentChannel.historyLoaded = false;
        this.cd.detectChanges();
                
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
             
            // subscribe for channel events.            
            channel.on('memberJoined', this.memberJoinedHandler);
            channel.on('memberLeft', this.memberLeftHandler);
            channel.on('messageAdded', this.messageAddedHandler);   

            this.currentChannelHasHistory =  this.currentChannel.attributes.hasOwnProperty("virgil_public_key");

            if (this.currentChannelAdminPublicKey == null && this.currentChannelHasHistory) {
                this.currentChannelAdminPublicKey = this.virgil.crypto.importPublicKey(
                    Buffer.from(this.currentChannel.attributes.virgil_public_key, 'utf8'));
            }
                    
            // load channel members.        
            return channel.getMembers();
        }).then((members) => {                
            return Promise.all(members.map(m => this.addMember(m)));            
        }).then(() => {
             this.cd.detectChanges();           
        })
        .catch(error => this.handleError(error));        
    }
    
    /**
     * Loads history from backend service.
     */
    public loadHistory(){
        
        let identity = this.account.current.identity;
        let channelSid = this.currentChannel.sid;
        
        this.isChannelHistoryLoading = true;
                        
        this.backend.getHistory(identity, channelSid).then(messages => {
            
            let encryptedMessages = _.sortBy(messages, 'dateUpdated'); 
             _.forEach(encryptedMessages, m => this.onMessageAdded(m));  
             
            this.isChannelHistoryLoading = false;
            this.currentChannel.historyLoaded = true;
            
            this.cd.detectChanges();
        })
        .catch(error => this.handleError(error));
    }

    /**
     * Createa a new channel by name.
     */
    private createChannelImpl() {
                
        if (_.isEmpty(this.newChannelName)) {
            return false;
        }
        
        let prepareNewChannelFunc = () => {         
               
            let options: any = {
                friendlyName: this.newChannelName                
            };
            
            if (this.includeChannelHistory){                                
                return this.virgil.client.searchCards({
                    identities: [ "twilio_chat_admin" ]
                }).then(result => {                    
                    let channelCard: any = _.last(_.sortBy(result, 'createdAt'));
                    if (channelCard) {
                        let chatAdminPublicKeyBuffer = Buffer.from(channelCard.publicKey);
                        options.attributes = {
                            virgil_card_id: channelCard.id,
                            virgil_public_key: chatAdminPublicKeyBuffer.toString('utf8')
                        };
                    }
                    return options;
                });
            }                        
            return Promise.resolve(options);
        };
        
        prepareNewChannelFunc().then((options) => {
            return this.twilio.client.createChannel(options);
        })
        .then((channel) => {
            this.isChannelsLoading = false;
            this.newChannelName = '';
            this.onChannelAdded(channel);
            this.setCurrentChannel(channel);
        })
        .catch(error => this.handleError(error));
    }
            
    /**
     * Loads the current list of all Channels the Client knows about.
     */
    private loadChannels(): void{
        
        this.isChannelsLoading = true; 
        this.cd.detectChanges();
        
        this.twilio.client.getChannels().then(channels => {
            channels.forEach(channel => {
                this.onChannelAdded(channel);                        
            });  
                                    
            this.isChannelsLoading = false;
            this.cd.detectChanges();     
        })
        .catch(this.handleError);     
    }
    
    /**
     * Encrypts & posts the new message to current channel.
     */
    public postMessage(): void {
        
        let messageString = this.newMessage;
        let recipients = [];
                
        if (this.currentChannelAdminPublicKey) {
            recipients.push(this.currentChannelAdminPublicKey);
        }
        
        this.channelMembers.forEach(m => {
             recipients.push(m.publicKey);
        });
                
        let message = {
            body: messageString,
            date: Date.now(),
            author: this.account.current.identity,
            id: this.generateUUID()
        };

        let messageJSON = JSON.stringify(message);

        this.newMessage = '';
        this.messages.push(message);
        
        let encryptedMessage = this.virgil.crypto.encrypt(messageJSON, recipients);

        this.currentChannel.sendMessage(encryptedMessage.toString('base64'));
    }
    
    /**
     * Loads the member's public key and the member to the current member collection.
     */
    private addMember(member):Promise<any> {             
        return this.virgil.client.searchCards({
            identities: [ member.identity ],
            type: 'chat_member' 
        }).then(result => {
            let latestCard: any = _.last(_.sortBy(result, 'createdAt'));
            if (latestCard){
                let memberPublicKeyBuffer = Buffer.from(latestCard.publicKey);
                member.publicKey = this.virgil.crypto.importPublicKey(memberPublicKeyBuffer);
            }
            
            this.channelMembers.push(member);
            return member;
        });
    }
    
    /**
     * Fired when a new Message has been added to the Channel.
     */
    private onMessageAdded(message: any): void {
        let privateKey = this.account.current.privateKey;

        let decryptedMessage = this.virgil.crypto.decrypt(message.body, privateKey).toString('utf8');

        var messageObject = JSON.parse(decryptedMessage);
        
        if (_.some(this.messages, m => m.id == messageObject.id)){
            return;
        }            
        
        console.log('Encrypted Message Received', message);
        
        this.messages.push(messageObject);
        this.cd.detectChanges();
    }    
    
    /**
     * Fired when a Member has joined the Channel. 
     */
    private onMemberJoined(member: any): void{        
        this.addMember(member).then(() => {
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
        
        if (_.some(this.channels, c => c.sid == channel.sid)){
            return;            
        }
        
        this.channels.push(channel);
        this.cd.detectChanges();    
    }
    
    /**
     * Fired when a Channel is no longer visible to the Client.
     */
    private onChannelRemoved(channel:any): void{
        
        if (this.currentChannel && this.currentChannel.sid === channel.sid) {            
            if (alert(`Unfortunately, the channel #${channel.friendlyName} has been deleted by the owner. ` + 
                      `Choose another channel, or feel free to create your own one.`)){
                          
                this.currentChannel = null;                
                return;
            }
        }        
        
        console.log(channel);        
        
        _.remove(this.channels, ch => ch.sid == channel.sid);    
        this.cd.detectChanges();    
    }
    
    /**
     * Handles an chat errors.
     */
    private handleError(error): void{     
        this.isChannelHistoryLoading = false;
        this.isChannelsLoading = false;
        this.cd.detectChanges();    
        
        console.error(error);    
    }

    private generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }
}