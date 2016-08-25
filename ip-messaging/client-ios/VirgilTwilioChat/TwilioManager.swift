//
//  TwilioManager.swift
//  VirgilTwilioChat
//
//  Created by Pavel Gorb on 8/21/16.
//  Copyright © 2016 Virgil Security, Inc. All rights reserved.
//

import Foundation
import UIKit
import XAsync

protocol TwilioListener: class {
    
}

protocol TwilioChannelsListener: TwilioListener {
    
    func channelListDidComplete()
    func channelDidRemove()
}

protocol TwilioMessageListener: TwilioListener {
    
    func didAddMessage(_: TWMMessage)
}

class TwilioManager: NSObject {

    private var twilio: TwilioIPMessagingClient! = nil
    var listeners = Array<TwilioListener>()

    init(listeners: [TwilioListener]) {
        super.init()
     
        self.listeners.appendContentsOf(listeners)
        
        let token = AppState.sharedInstance.backend.getTwilioToken(AppState.sharedInstance.identity, device: UIDevice.currentDevice().identifierForVendor!.UUIDString)
        let accessManager = TwilioAccessManager.init(token: token, delegate: nil)
        self.twilio = TwilioIPMessagingClient.ipMessagingClientWithAccessManager(accessManager, properties: nil, delegate: self)
    }
    
    override convenience init() {
        self.init(listeners: [])
    }
    
    func addListener(candidate: TwilioListener) {
        for listener in self.listeners {
            if listener === candidate {
                return
            }
        }
        
        self.listeners.append(candidate)
    }

    func removeListener(candidate: TwilioListener) {
        var index: Int = 0;
        while index < self.listeners.count {
            let listener = self.listeners[index]
            if listener === candidate {
                break
            }
            index += 1
        }
        
        if index == self.listeners.count {
            return
        }
        
        self.listeners.removeAtIndex(index)
    }
    
    func removeAllListeners() {
        self.listeners.removeAll()
    }
    
    func getChannelsList() -> [TWMChannel] {
        guard let channels = self.twilio.channelsList().allObjects() where channels.count > 0 else {
            return []
        }
        return channels
    }
    
    func addChannelWithOptions(options: Dictionary<String, AnyObject>) -> TWMChannel? {
        let task = XAsyncTask { (weakTask) in
            self.twilio.channelsList().createChannelWithOptions(options, completion: { (result, channel) in
                if !result.isSuccessful() || channel == nil {
                    print("Error creating the channel: \(result.error.localizedDescription)")
                    weakTask?.result = nil
                    weakTask?.fireSignal()
                    return
                }
                
                weakTask?.result = channel
                weakTask?.fireSignal()
            })
        }
        task.awaitSignal()
        return task.result as? TWMChannel
    }
    
    func setChannelName(channel: TWMChannel, unique: String, friendly: String?) {
        let task1 = XAsyncTask { (weakTask) in
            channel.setUniqueName(unique, completion: { (result) in
                if !result.isSuccessful() {
                    print("Error setting unique name for the channel: \(result.error.localizedDescription)")
                    weakTask?.fireSignal()
                    return
                }
                
                weakTask?.fireSignal()
            })
        }
        task1.awaitSignal()
        
        let task2 = XAsyncTask { (weakTask) in
            channel.setFriendlyName(friendly ?? unique, completion: { (result) in
                if !result.isSuccessful() {
                    print("Error setting friendly name for the channel: \(result.error.localizedDescription)")
                    weakTask?.fireSignal()
                    return
                }
                
                weakTask?.fireSignal()
            })
        }
        task2.awaitSignal()
    }
    
    func joinChannel(channel: TWMChannel) {
        let task = XAsyncTask { (weakTask) in
            channel.joinWithCompletion({ (result) in
                if !result.isSuccessful() {
                    print("Error joining the channel: \(result.error.localizedDescription)")
                    weakTask?.fireSignal()
                    return
                }
                
                weakTask?.fireSignal()

            })
        }
        task.awaitSignal()
    }
    
    func sendMessage() {
    
    }
}

extension TwilioManager: TwilioIPMessagingClientDelegate {

    func ipMessagingClient(client: TwilioIPMessagingClient!, synchronizationStatusChanged status: TWMClientSynchronizationStatus) {
        if status == .ChannelsListCompleted {
            for listener in self.listeners {
                if let channelListener = listener as? TwilioChannelsListener {
                    channelListener.channelListDidComplete()
                }
            }
        }
    }
    
    // Called whenever a channel we've joined receives a new message
    func ipMessagingClient(client: TwilioIPMessagingClient!, channel: TWMChannel!, messageAdded message: TWMMessage!) {
        for listener in self.listeners {
            if let channelListener = listener as? TwilioMessageListener {
                channelListener.didAddMessage(message)
            }
        }
        
//        if let encrypted = NSData(base64EncodedString: message.body, options: .IgnoreUnknownCharacters) {
//            self.decryptAndCacheMessage(encrypted)
//            dispatch_async(dispatch_get_main_queue()) {
//                self.tableView.reloadData()
//            }
//        }
    }
    
}