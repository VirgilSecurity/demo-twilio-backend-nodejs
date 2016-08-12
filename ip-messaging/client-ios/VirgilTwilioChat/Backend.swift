//
//  Backend.swift
//  VirgilTwilioChat
//
//  Created by Pavel Gorb on 7/26/16.
//  Copyright © 2016 Virgil Security, Inc. All rights reserved.
//

import Foundation
import XAsync
import VirgilSDK

class Backend: NSObject {
    
    var session: NSURLSession
    
    override init() {
        let config = NSURLSessionConfiguration.ephemeralSessionConfiguration()
        self.session = NSURLSession(configuration: config, delegate: nil, delegateQueue: nil)
    }
    
    func getVirgilAuthToken() -> String {
        let async = XAsyncTask { (weakTask) in
            let url = NSURL(string: Constants.Backend.BaseURL + Constants.Backend.VirgilAuthTokenEndpoint)
            let request = NSMutableURLRequest(URL: url!)
            request.HTTPMethod = "GET"
            let task = self.session.dataTaskWithRequest(request) { (data, response, error) in
                if let err = error {
                    print("Error getting the Virgl Authentication Token: \(err.localizedDescription)")
                    weakTask?.result = nil
                    weakTask?.fireSignal()
                    return
                }
                
                if let r = response as? NSHTTPURLResponse where r.statusCode >= 400 {
                    print("HTTP Error getting the Virgil Authentication Token: \(NSHTTPURLResponse.localizedStringForStatusCode(r.statusCode))")
                    weakTask?.result = nil
                    weakTask?.fireSignal()
                    return
                }
                
                if let body = data, parsed = try? NSJSONSerialization.JSONObjectWithData(body, options: .AllowFragments), tokenObject = parsed as? NSDictionary, token = tokenObject[Constants.Backend.VirgilTokenKey] as? String {
                    weakTask?.result = token
                    weakTask?.fireSignal()
                    return
                }
                
                print("Error getting the Virgil Authentication Token: Server response has unexpected format.")
                weakTask?.result = nil
                weakTask?.fireSignal()
            }
            task.resume()
        }
        async.awaitSignal()
        if let token = async.result as? String {
            return token
        }
        
        return ""
    }
    
    func getTwilioToken(identity: String, device: String) -> String {
        let async = XAsyncTask { (weakTask) in
            let paramStr = "?\(Constants.Backend.IdentityParam)=\(identity)&\(Constants.Backend.DeviceIdParam)=\(device)"
            let url = NSURL(string: Constants.Backend.BaseURL + Constants.Backend.TwilioTokenEndpoint + paramStr)
            let request = NSMutableURLRequest(URL: url!)
            request.HTTPMethod = "GET"
            let task = self.session.dataTaskWithRequest(request) { (data, response, error) in
                if let err = error {
                    print("Error getting the Twilio Token: \(err.localizedDescription)")
                    weakTask?.result = nil
                    weakTask?.fireSignal()
                    return
                }
                
                if let r = response as? NSHTTPURLResponse where r.statusCode >= 400 {
                    print("HTTP Error getting the Twilio Token: \(NSHTTPURLResponse.localizedStringForStatusCode(r.statusCode))")
                    weakTask?.result = nil
                    weakTask?.fireSignal()
                    return
                }
                
                if let r = response as? NSHTTPURLResponse, signature = r.allHeaderFields[Constants.Backend.SignResponseHeader] as? String, body = data {
                    if self.verifySignature(signature, data: body) {
                        if let parsed = try? NSJSONSerialization.JSONObjectWithData(body, options: .AllowFragments), tokenObject = parsed as? NSDictionary, token = tokenObject[Constants.Backend.TwilioTokenKey] as? String {
                            weakTask?.result = token
                            weakTask?.fireSignal()
                            return
                        }
                    }
                    print("Error verification response signature.")
                    weakTask?.result = nil
                    weakTask?.fireSignal()
                    return
                }
                print("Error getting the Twilio Token: Server response has unexpected format.")
                weakTask?.result = nil
                weakTask?.fireSignal()
            }
            task.resume()
        }
        async.awaitSignal()
        if let token = async.result as? String {
            return token
        }
        
        return ""
    }
    
    func getHistory(identity: String, channelSid: String) -> Array<Dictionary<String, AnyObject>> {
        let async = XAsyncTask { (weakTask) in
            let paramStr = "?\(Constants.Backend.IdentityParam)=\(identity)&\(Constants.Backend.ChannelSidParam)=\(channelSid)"
            let url = NSURL(string: Constants.Backend.BaseURL + Constants.Backend.HistoryEndpoint + paramStr)
            let request = NSMutableURLRequest(URL: url!)
            request.HTTPMethod = "GET"
            let task = self.session.dataTaskWithRequest(request) { (data, response, error) in
                if let err = error {
                    print("Error getting the history: \(err.localizedDescription)")
                    weakTask?.result = nil
                    weakTask?.fireSignal()
                    return
                }
                
                if let r = response as? NSHTTPURLResponse where r.statusCode >= 400 {
                    print("HTTP Error getting the history: \(NSHTTPURLResponse.localizedStringForStatusCode(r.statusCode))")
                    weakTask?.result = nil
                    weakTask?.fireSignal()
                    return
                }
                
                if let r = response as? NSHTTPURLResponse, signature = r.allHeaderFields[Constants.Backend.SignResponseHeader] as? String, body = data {
                    if self.verifySignature(signature, data: body) {
                        if let parsed = try? NSJSONSerialization.JSONObjectWithData(body, options: .AllowFragments), history = parsed as? Array<Dictionary<String, AnyObject>> {
                            weakTask?.result = history
                            weakTask?.fireSignal()
                            return
                        }
                    }
                    print("Error verification response signature.")
                    weakTask?.result = nil
                    weakTask?.fireSignal()
                    return
                }
                print("Error getting the history: Server response has unexpected format.")
                weakTask?.result = nil
                weakTask?.fireSignal()
            }
            task.resume()
        }
        async.awaitSignal()
        if let history = async.result as? Array<Dictionary<String, AnyObject>> {
            return history
        }
        
        return Array<Dictionary<String, AnyObject>>()
    }

    func getValidationToken(identity: String, publicKey: NSData) -> String {
        let async = XAsyncTask { (weakTask) in
            let url = NSURL(string: Constants.Backend.BaseURL + Constants.Backend.VirgilValidationTokenEndpoint)
            let request = NSMutableURLRequest(URL: url!)
            request.HTTPMethod = "POST"
            request.setValue(Constants.Backend.ContentTypeJSON, forHTTPHeaderField: Constants.Backend.ContentTypeHeader)
           
            let bodyObject = [Constants.Backend.IdentityParam: identity, Constants.Backend.PublicKeyParam: publicKey.base64EncodedStringWithOptions(.Encoding64CharacterLineLength)]
            if let body = try? NSJSONSerialization.dataWithJSONObject(bodyObject, options: .PrettyPrinted) {
                request.HTTPBody = body
            }
            
            let task = self.session.dataTaskWithRequest(request) { (data, response, error) in
                if let err = error {
                    print("Error getting the Validation Token: \(err.localizedDescription)")
                    weakTask?.result = nil
                    weakTask?.fireSignal()
                    return
                }
                
                if let r = response as? NSHTTPURLResponse where r.statusCode >= 400 {
                    print("HTTP Error getting the Validation Token: \(NSHTTPURLResponse.localizedStringForStatusCode(r.statusCode))")
                    weakTask?.result = nil
                    weakTask?.fireSignal()
                    return
                }
                
                if let r = response as? NSHTTPURLResponse, signature = r.allHeaderFields[Constants.Backend.SignResponseHeader] as? String, body = data {
                    if self.verifySignature(signature, data: body) {
                        if let parsed = try? NSJSONSerialization.JSONObjectWithData(body, options: .AllowFragments), tokenObject = parsed as? NSDictionary, token = tokenObject[Constants.Backend.ValidationTokenKey] as? String {
                            weakTask?.result = token
                            weakTask?.fireSignal()
                            return
                        }
                    }
                    print("Error verification response signature.")
                    weakTask?.result = nil
                    weakTask?.fireSignal()
                    return
                }
                print("Error getting the Validation Token: Server response has unexpected format.")
                weakTask?.result = nil
                weakTask?.fireSignal()
            }
            task.resume()
        }
        async.awaitSignal()
        if let token = async.result as? String {
            return token
        }
        
        return ""
    }
    
    private func verifySignature(signature: String, data: NSData) -> Bool {
        var ok = false
        if let sigData = NSData(base64EncodedString: signature, options: .IgnoreUnknownCharacters) {
            let verifier = VSSSigner()
            do {
                try verifier.verifySignature(sigData, data: data, publicKey: AppState.sharedInstance.appCard.publicKey.key, error: ())
                ok = true
            }
            catch let e as NSError {
                print("Error signature verification: \(e.localizedDescription)")
                ok = false
            }
        }
        return ok
    }
}