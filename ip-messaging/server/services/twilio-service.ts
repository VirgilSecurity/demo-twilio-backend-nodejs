 export class TwilioService {
     
     private static Twilio = require('twilio');     
     private static ipmService: any;
     
     public static getTwilioHub(): any {
         return this.Twilio;
     }
          
     public static getIpMessagingInstance(): any{
         
         if (!this.ipmService){             
             var client = new this.Twilio.IpMessagingClient(process.env.TWILIO_API_KEY, process.env.TWILIO_API_SECRET);
             this.ipmService = client.services(process.env.TWILIO_IPM_SERVICE_SID);
         }
         
         return this.ipmService; 
     }       
 }