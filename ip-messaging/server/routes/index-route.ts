import * as express from 'express'
import { BaseRoute } from './base-route'

import { VirgilService } from '../services/virgil-service'

module Routes {
        
    export class IndexRoute extends BaseRoute {
        
        constructor(rootDir: string, virgil: VirgilService){
            super(rootDir, virgil);
        }
                
        public index(req: express.Request, res: express.Response, next: express.NextFunction){
            if (req.accepts('html')) {                           
                res.sendFile(this.rootDir + '/index.html');
            }
            else {
                next();
            }
        }
    }
}

export = Routes;