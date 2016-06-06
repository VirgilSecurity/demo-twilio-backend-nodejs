 import * as _ from "lodash";
  
 export class VirgilService {
          
     constructor(private sdk: any){ }
     
     public static get Utils(): any {
         return require('virgil-sdk').utils; 
     } 
     
     public encryptForRecipient(text: string, recipientId, recipientPublicKey): string {
         return this.sdk.crypto
            .encryptStringToBase64(text, recipientId, recipientPublicKey);
     }
     
     public decryptForChatAdmin(encryptedText: string): string {
         
         let chatAdminPrivateKey = new Buffer(process.env.APP_CHANNEL_ADMIN_PRIVATE_KEY, 'base64').toString();   
         
         return this.sdk.crypto.decryptStringFromBase64(
             encryptedText, 
             process.env.APP_CHANNEL_ADMIN_CARD_ID, 
             chatAdminPrivateKey);
     }
     
     public searchChatMemberCard(member: string) {
         return this.sdk.cards.search({ value: member, type: 'chat_member' }).then(cards => {
             let latestCard: any = _.last(_.sortBy(cards, 'created_at'));
             return latestCard;
         })
     }
          
     public signWithAppKey(text: string): string {
         let privateKey = new Buffer(process.env.VIRGIL_APP_PRIVATE_KEY, 'base64').toString();
                  
         let signBase64 = this.sdk.crypto.sign(text, privateKey, 
            process.env.VIRGIL_APP_PRIVATE_KEY_PASSWORD).toString('base64');         
         
         return signBase64;
     }    
 }