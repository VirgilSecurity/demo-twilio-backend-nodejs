/// <reference path="../typings/index.d.ts" />
/*
This application should give you a ready-made starting point for writing your own end-to-end 
encrypted messaging apps with Virgil Security & Twilio IP Messaging. Before we begin, we need 
to collect all the config values we need to run the application:

TWILIO_ACCOUNT_SID=
TWILIO_API_KEY=
TWILIO_API_SECRET=
TWILIO_IPM_SERVICE_SID=

VIRGIL_ACCESS_TOKEN=
VIRGIL_APP_PRIVATE_KEY=
VIRGIL_APP_PRIVATE_KEY_PASSWORD=
*/

import * as parser from 'body-parser'
import * as express from 'express'
import * as path from 'path'
import * as http from 'http'

import * as indexRoute from './routes/index-route'
import * as historyRoute from './routes/history-route'
import * as authRoute from './routes/auth-route'

import { VirgilService } from './services/virgil-service'

/**
 * The application Server.
 * 
 * @class Server 
 */
class Server {
    
    private rootDir: string;
    private app: any;    
    
    private virgilService: VirgilService;
        
    public static bootstrap(): Server {
        return new Server();
    }
   
    constructor() {        
        this.app = express();
        
        //configure application
        this.config();
        
        //configure routes
        this.routes();        
    }
    
    public start(port:number): void {
        http.createServer(this.app).listen(port);
    }
    
    private config(): void {        
        require('dotenv').load();
        
        this.rootDir = path.resolve('./public');      
        this.app.disable("x-powered-by");
        
        let VirgilSDK = require('virgil-sdk');
        this.virgilService = new VirgilService(new VirgilSDK(process.env.VIRGIL_ACCESS_TOKEN));
    }
    
    private routes(): void {
        
        //get router
        let router: express.Router;
        router = express.Router();
        
        console.log(this.virgilService);
        
        this.app.use(express.static(this.rootDir));
        this.app.use('/assets/', express.static('./node_modules/'));
        
        //create routes
        var index: indexRoute.IndexRoute = new indexRoute.IndexRoute(this.rootDir, this.virgilService);
        var history: historyRoute.HistoryRoute = new historyRoute.HistoryRoute(this.rootDir, this.virgilService);
        var auth: authRoute.AuthRoute = new authRoute.AuthRoute(this.rootDir, this.virgilService);
        
        //register routes
        router.get("/auth/login", auth.login.bind(auth.login));
        router.get("/auth/virgil-token", auth.virgilToken.bind(auth.virgilToken));
        router.get("/auth/twilio-token", auth.twilioToken.bind(auth.twilioToken));
        router.get("/history", history.history.bind(history.history));
        router.get("*", index.index.bind(index.index));
        
        //use router middleware
        this.app.use(router);
    }
}

let server = Server.bootstrap();
server.start(8080);