//
//  Constants.swift
//  VirgilTwilioChat
//
//  Created by Pavel Gorb on 6/17/16.
//  Copyright © 2016 Virgil Security, Inc. All rights reserved.
//

import Foundation

struct Constants {

    struct Virgil {
        static let IdentityType = "chat_member"
        static let PrivateKeyStorage = "TwilioChatPrivateKeyStorage"
        static let ChatAdmin = "twilio_chat_admin"
        static let IdentityTypeAdmin = "member"
        static let ChannelAttributeCardId = "virgil_card_id"
        static let ChannelAttributKey = "virgil_public_key"
    }
    
    struct Backend {
        static let BaseURL = "https://demo-ip-messaging.virgilsecurity.com"
        static let VirgilAuthTokenEndpoint = "/auth/virgil-token"
        static let TwilioTokenEndpoint = "/auth/twilio-token"
        static let HistoryEndpoint = "/history"
        static let VirgilValidationTokenEndpoint = "/auth/login"
     
        static let VirgilTokenKey = "virgil_token"
        static let TwilioTokenKey = "twilio_token"
        static let ValidationTokenKey = "validation_token"
        static let AppBundleId = "com.denzil.twilio-ip-messaging-demo"
        
        static let IdentityParam = "identity"
        static let DeviceIdParam = "deviceId"
        static let ChannelSidParam = "channelSid"
        static let PublicKeyParam = "public_key"

        static let ContentTypeHeader = "Content-Type"
        static let ContentTypeJSON = "application/json"
        
        static let SignResponseHeader = "x-ipm-response-sign"
    }
    
    struct Message {
        static let Id = "index"
        static let Date = "date_updated"
        static let Author = "from"
        static let Body = "body"
    }
    
    struct UI {
        static let ChatMessageCell = "ChatMessageCell"
        static let ChatChannelCell = "ChatChannelCell"
    }

    
    //    Message
//    {
//    "sid":"IM1629889f71af49adbdd92e6a4de4aa77",
//    "account_sid":"ACc205ae93727bab431c82041a19386001",
//    "service_sid":"ISf3bba66dcca1477a88668aa7bf200554",
//    "to":"CH5a68e1fb34ad452da4b6c8ceb8185874",
//    "date_created":"2016-06-10T20:18:40Z",
//    "date_updated":"2016-06-10T20:18:40Z",
//    "was_edited":false,
//    "from":"stas",
//    "body":"MIIBpwIBADCCAaAGCSqGSIb3DQEHA6CCAZEwggGNAgECMYIBXjCCAVoCAQKgJgQkYWYyZDFkOTAtNWI1OS00YjFiLTk1YTgtMjc4OWViOTI2YzI2MBUGByqGSM49AgEGCisGAQQBl1UBBQEEggEUMIIBEAIBADBbMBUGByqGSM49AgEGCisGAQQBl1UBBQEDQgAEVFVEBMJotpPsmKKRtH/YU5nMxrLJeox9PVRZUlJ5wjkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAYBgcogYxxAgUCMA0GCWCGSAFlAwQCAgUAMEEwDQYJYIZIAWUDBAICBQAEMK4SC72/Lr2Bq0S1pzgG0K2MEZ83TK6aGnKG9LubG0SuMwqmbXG4AUQI+q+OJJc9CjBRMB0GCWCGSAFlAwQBKgQQbv4KjJqJO6ASbE6O9uIehQQwOXvqRRPTZZ/UZyR372DZFoqVW9WfZEyIk2FezQvmF3VNjwcxvgQ/PWf47I2rQJ5AMCYGCSqGSIb3DQEHATAZBglghkgBZQMEAS4EDGn/ef4CTPooQpOUWesluOAkT/kIyiynUtv7yxrKRTK0EQHWZrWwZKkp/ghjlQgSrzoje3nemFCgBRdDKfkX/EVMMukH9d46idpI5kPM/mVM3Y3tf35LR6mhgAQCZCFXT9E/pVSjLFPk96x6wT/GKoBFt1VE/cK94uISOxATSw==",
//    "attributes":null,
//    "index":0,
//    "url":"https://ip-messaging.twilio.com/v1/Services/ISf3bba66dcca1477a88668aa7bf200554/Channels/CH5a68e1fb34ad452da4b6c8ceb8185874/Messages/IM1629889f71af49adbdd92e6a4de4aa77",
//    "accountSid":"ACc205ae93727bab431c82041a19386001",
//    "serviceSid":"ISf3bba66dcca1477a88668aa7bf200554",
//    "dateCreated":"2016-06-10T20:18:40.000Z",
//    "dateUpdated":"2016-06-10T20:18:40.000Z",
//    "wasEdited":false
//    }
}