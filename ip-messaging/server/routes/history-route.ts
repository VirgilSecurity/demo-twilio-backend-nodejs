import * as express from 'express'
import { VirgilService } from '../services/virgil-service'
import { BaseRoute } from './base-route'

module Routes {
        
    export class HistoryRoute extends BaseRoute {      
        
        constructor(rootDir: string, virgil: VirgilService){
            super(rootDir, virgil);
        }               
        
        public history(req: express.Request, res: express.Response, next: express.NextFunction){            
            
            let identity = req.query.identity;
            let channelSid = req.query.channelSid;   
                            
            Promise.all([
                this.virgil.searchChatMemberCard(identity),
                this.ipMessaging.channels(channelSid).messages.list()
            ])
            .then(bundle => {
                
                let recipientCard: any = bundle[0];                
                let messages: Array<any> = bundle[1].messages;                   
                    
                _.forEach(messages, m => {           
                    let decryptedBody = this.virgil.decryptForChatAdmin(m.body);                        
                    let encryptedBody = this.virgil.encryptForRecipient(decryptedBody,
                        recipientCard.id, 
                        recipientCard.public_key.public_key);
                            
                    m.body = encryptedBody;
                });
                     
                this.signAndSend(res, messages);
                next();        
            })
            .catch(next);
        }
    }
}

export = Routes;