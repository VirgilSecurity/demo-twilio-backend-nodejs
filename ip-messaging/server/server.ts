/// <reference path="../typings/index.d.ts" />

import * as parser from 'body-parser'
import * as express from 'express'
import * as path from 'path'

export class Server {
    
    private app: express.Application;
    
    constructor() {        
        this.app = express();
        
        this.config();
        this.routes();        
    }
    
    private config(): void {        
        require('dotenv').load();
    }
    
    private routes(): void {
    }
}