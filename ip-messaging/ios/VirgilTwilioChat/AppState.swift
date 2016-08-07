//
//  AppState.swift
//  VirgilTwilioChat
//
//  Created by Pavel Gorb on 6/17/16.
//  Copyright © 2016 Virgil Security, Inc. All rights reserved.
//

import Foundation
import VirgilSDK
import XAsync

class AppState: NSObject {
    
    var cards = [String: VSSCard]()
    var identity: String! = nil
    var privateKey: VSSPrivateKey! = nil
    
    var appCard: VSSCard! = nil
    
    var virgil: VSSClient! = nil
    var twilio: TwilioIPMessagingClient! = nil
    var backend: Backend! = nil
    
    func kill() {
        self.cards = [String: VSSCard]()
        self.identity = nil
        self.privateKey = nil
        self.appCard = nil
        
        self.virgil = nil
        self.twilio = nil
        self.backend = nil
    }
    
    func initVirgil(identity: String) {
        self.identity = identity
        self.backend = Backend()
        
        let token = self.backend.getVirgilAuthToken()
        self.virgil = VSSClient(applicationToken: token)
        self.getAppCard()
        
    }
    
    func initTwilio(delegate: TwilioIPMessagingClientDelegate) {
        if self.twilio != nil {
            return
        }
        let token = self.backend.getTwilioToken(self.identity, device: UIDevice.currentDevice().identifierForVendor!.UUIDString)
        let accessManager = TwilioAccessManager.init(token: token, delegate: nil)
        self.twilio = TwilioIPMessagingClient.ipMessagingClientWithAccessManager(accessManager, properties: nil, delegate: delegate)
    }
    
    func cardForIdentity(identity: String, type: String = Constants.Virgil.IdentityType) -> VSSCard? {
        /// If there is card stored in local dictionary - return it.
        if let card = AppState.sharedInstance.cards[identity] {
            return card
        }
        
        /// Create async task
        let task = XAsyncTask { weakTask in
            /// Which initiates search for the card on the Virgil Service
            self.virgil.searchCardWithIdentityValue(identity, type: type, unauthorized: false) { (cards, error) in
                if error != nil {
                    print("Error getting user's card from Virgil Service: \(error!.localizedDescription)")
                    /// In case of error - mark task as fiished.
                    weakTask?.fireSignal()
                    return
                }
                
                /// Get the card from the service response if possible
                if let candidates = cards where candidates.count > 0 {
                    weakTask?.result = candidates[0]
                }
                /// And mark the task as finished.
                weakTask?.fireSignal()
            }
        }
        /// Perform the task body and wait until task is signalled resolved.
        task.awaitSignal()
        /// If there is card actually get from the Virgil Service
        if let card = task.result as? VSSCard {
            /// Synchronously save it in the local dictionary for futher use.
            synchronized(self.virgil, closure: {
                AppState.sharedInstance.cards[card.identity.value] = card
            })
            return card
        }
        
        return nil
    }
    
    private func getAppCard() {
        let async = XAsyncTask { (weakTask) in
            self.virgil.searchAppCardWithIdentityValue(Constants.Backend.AppBundleId, completionHandler: { (cards, error) in
                if let err = error {
                    print("Error searching for card: \(err.localizedDescription)")
                    weakTask?.fireSignal()
                    return
                }
                
                if let candidates = cards where candidates.count > 0 {
                    self.appCard = candidates[0]
                }
                
                weakTask?.fireSignal()
                return
            })
        }
        async.awaitSignal()
    }
}

// MARK: Singletone implementation
extension AppState {
    class var sharedInstance: AppState {
        struct Static {
            static var onceToken: dispatch_once_t = 0
            static var instance: AppState? = nil
        }
        dispatch_once(&Static.onceToken) {
            Static.instance = AppState()
        }
        return Static.instance!
    }
}
