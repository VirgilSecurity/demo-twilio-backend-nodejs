//
//  ChatViewController.swift
//  VirgilTwilioChat
//
//  Created by Pavel Gorb on 6/17/16.
//  Copyright © 2016 Virgil Security, Inc. All rights reserved.
//

import Foundation
import VirgilFoundation
import VirgilSDK
import XAsync
import SlackTextViewController

// TODO: Implement leaving the chat.

class ChatViewController: SLKTextViewController {
    
    private var messages = [Dictionary<String, AnyObject>]()
    var channel: TWMChannel!
    
    override var tableView: UITableView {
        get {
            return super.tableView!
        }
    }

    init() {
        super.init(tableViewStyle: .Plain)
    }
    
    required init(coder decoder: NSCoder) {
        super.init(coder: decoder)
    }
    
    override class func tableViewStyleForCoder(decoder: NSCoder) -> UITableViewStyle {
        return .Plain
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        self.edgesForExtendedLayout = .None
        self.title = "Secure chat"
    }
    
    override func viewWillAppear(animated: Bool) {
        super.viewWillAppear(animated)
        self.navigationController?.setNavigationBarHidden(false, animated: true)
        self.title = self.channel.friendlyName
        
        AppState.sharedInstance.twilio.addListener(self)
        
        dispatch_async(dispatch_get_main_queue()) { 
            self.loadChatParticipants()
            let attributes = self.channel.attributes()
            guard attributes[Constants.Virgil.ChannelAttributeCardId] != nil else {
                return
            }
            
            let messages = AppState.sharedInstance.backend.getHistory(AppState.sharedInstance.identity, channelSid: self.channel.sid)
            for message in messages {
                if let body = message[Constants.Message.Body] as? String, encrypted = NSData(base64EncodedString: body, options: .IgnoreUnknownCharacters) {
                    self.decryptAndCacheMessage(encrypted)
                }
            }

            self.tableView.reloadData()
        }
    }
    
    override func viewWillDisappear(animated: Bool) {
        super.viewWillDisappear(animated)
    }
    
    private func loadChatParticipants() {
        for member in self.channel.members.allObjects() {
            let identity = member.userInfo.identity
            AppState.sharedInstance.cardForIdentity(identity)
        }
    }
    
    private func decryptAndCacheMessage(message: NSData) {
        let task = XAsyncTask { (weakTask) in
            let decryptor = VSSCryptor()
            if let card = AppState.sharedInstance.cardForIdentity(AppState.sharedInstance.identity) {
                var plainData = NSData()
                do {
                    plainData = try decryptor.decryptData(message, recipientId: card.Id, privateKey: AppState.sharedInstance.privateKey.key, keyPassword: AppState.sharedInstance.privateKey.password, error: ())
                }
                catch let e as NSError {
                    plainData = NSData()
                    print("Error decrypting message: \(e.localizedDescription)")
                }
                if let json = try? NSJSONSerialization.JSONObjectWithData(plainData, options: .AllowFragments), wrapper = json as? Dictionary<String, AnyObject> {
                    self.messages.append(wrapper)
                }
            }
        }
        task.await()
    }
    
    private func encryptMessage(body: String) -> String? {
        let dateFormatter = NSDateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd'T'kk:mm:ssZ"
        
        let wrapper = [Constants.Message.Id: NSUUID().UUIDString,
                       Constants.Message.Date: dateFormatter.stringFromDate(NSDate()),
                       Constants.Message.Author: AppState.sharedInstance.identity,
                       Constants.Message.Body: body];
        
        if let messageData = try? NSJSONSerialization.dataWithJSONObject(wrapper, options: .PrettyPrinted) {
        
            let cryptor = VSSCryptor()
            let recipients = self.channel.members.allObjects()
            for member in recipients {
                if let card = AppState.sharedInstance.cardForIdentity(member.userInfo.identity) {
                    do {
                        try cryptor.addKeyRecipient(card.Id, publicKey: card.publicKey.key, error: ())
                    }
                    catch let e as NSError {
                        print("Error adding key recipient: \(e.localizedDescription)")
                    }
                }
            }
            
            if let card = AppState.sharedInstance.cardForIdentity(Constants.Virgil.ChatAdmin, type: Constants.Virgil.IdentityTypeAdmin) {
                do {
                    try cryptor.addKeyRecipient(card.Id, publicKey: card.publicKey.key, error: ())
                }
                catch let e as NSError {
                    print("Error adding admin recipient: \(e.localizedDescription)")
                }
            }
            
            if let data = try? cryptor.encryptData(messageData, embedContentInfo: true, error: ()) {
                return data.base64EncodedStringWithOptions(.Encoding64CharacterLineLength)
            }
        }
        
        return nil
    }
    
    // MARK: - Action handlers
    
    // Notifies the view controller when the right button's action has been triggered, manually or by using the keyboard return key.
    override func didPressRightButton(sender: AnyObject!) {
        if let body = self.encryptMessage(self.textView.text) where !body.isEmpty {
            let message = self.channel.messages.createMessageWithBody(body)
            self.channel.messages.sendMessage(message, completion: { (result) in
                print("Message sent")
            })
        }
        super.didPressRightButton(sender)
    }
    
    // MARK: - UITableViewDelegate/DataSource
    
    override func numberOfSectionsInTableView(tableView: UITableView) -> Int {
        return 1
    }
    
    override func tableView(tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        
        if tableView == self.tableView {
            return self.messages.count
        }
        return 0
    }
    
    override func tableView(tableView: UITableView, cellForRowAtIndexPath indexPath: NSIndexPath) -> UITableViewCell {
        if tableView == self.tableView {
            return self.messageCellForRowAtIndexPath(indexPath)
        }
        else {
            return UITableViewCell(style: .Default, reuseIdentifier: Constants.UI.ChatMessageCell)
        }
    }
    
    func messageCellForRowAtIndexPath(indexPath: NSIndexPath) -> UITableViewCell {
        let cell = self.tableView.dequeueReusableCellWithIdentifier(Constants.UI.ChatMessageCell) ?? UITableViewCell(style: .Subtitle, reuseIdentifier: Constants.UI.ChatMessageCell)

        let message = self.messages[indexPath.row]
        cell.textLabel?.text = message[Constants.Message.Body] as? String
        cell.detailTextLabel?.text = message[Constants.Message.Author] as? String
        cell.transform = self.tableView.transform
        
        return cell
    }
    
    override func tableView(tableView: UITableView, heightForRowAtIndexPath indexPath: NSIndexPath) -> CGFloat {
        
        if tableView == self.tableView {
            let message = self.messages[indexPath.row]
            
            let paragraphStyle = NSMutableParagraphStyle()
            paragraphStyle.lineBreakMode = .ByWordWrapping
            paragraphStyle.alignment = .Left
            
            let pointSize = CGFloat(14.0)
            
            let attributes = [
                NSFontAttributeName : UIFont.systemFontOfSize(pointSize),
                NSParagraphStyleAttributeName : paragraphStyle
            ]
            
            var width = CGRectGetWidth(tableView.frame)
            width -= 25.0
            
            if let messageAuthor = message[Constants.Message.Author] as? NSString, messageBody = message[Constants.Message.Body] as? NSString {
                let titleBounds = messageAuthor.boundingRectWithSize(CGSize(width: width, height: CGFloat.max), options: .UsesLineFragmentOrigin, attributes: attributes, context: nil)
                let bodyBounds = messageBody.boundingRectWithSize(CGSize(width: width, height: CGFloat.max), options: .UsesLineFragmentOrigin, attributes: attributes, context: nil)
                
                if messageBody.length == 0 {
                    return 0
                }
                
                var height = CGRectGetHeight(titleBounds)
                height += CGRectGetHeight(bodyBounds)
                height += 40
                
                if height < 40.0 {
                    height = 40.0
                }
                
                return height
                
            }
        }
        
        return 40.0
    }
}

// MARK: - TwilioIPMessagingClientDelegate
extension ChatViewController: TwilioMessageListener {
    
    func didAddMessage(msg: TWMMessage) {
        if let encrypted = NSData(base64EncodedString: msg.body, options: .IgnoreUnknownCharacters) {
            self.decryptAndCacheMessage(encrypted)
            dispatch_async(dispatch_get_main_queue()) {
                self.tableView.reloadData()
            }
        }
    }
    
}
