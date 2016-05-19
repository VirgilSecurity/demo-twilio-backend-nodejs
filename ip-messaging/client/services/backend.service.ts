import { Injectable } from '@angular/core'
import { Http, Response } from '@angular/http'

@Injectable()
export class BackendService {
    
    constructor(private http: Http){}
    
    /**
     * Gets an authenication tokens for Twilio and Virgil services.
     */
    public auth(identity: string): Promise<any> {
                
        return this.http.get('/auth?identity=' + identity + '&deviceId=web')
            .map((response:Response) => response.json())
            .toPromise();        
    }
}