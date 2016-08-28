//
//  ChannelsViewController.swift
//  VirgilTwilioChat
//
//  Created by Pavel Gorb on 7/27/16.
//  Copyright © 2016 Virgil Security, Inc. All rights reserved.
//

import Foundation
import UIKit

class ChannelsViewController: UIViewController, UITableViewDelegate, UITableViewDataSource {
    
    @IBOutlet private var tvChannels: UITableView!
    
    var channels = [TWMChannel]()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        self.edgesForExtendedLayout = .None
        self.tvChannels.registerClass(UITableViewCell.self, forCellReuseIdentifier: Constants.UI.ChatChannelCell)
        
        self.title = NSLocalizedString("Channels", comment: "Channels")
        
        self.navigationItem.leftBarButtonItem = UIBarButtonItem(title: NSLocalizedString("Logout", comment: "Logout"), style: .Plain, target: self, action: #selector(self.logoutAction(_:)))
        self.navigationItem.rightBarButtonItem = UIBarButtonItem(barButtonSystemItem: .Add, target: self, action: #selector(self.addChannelAction(_:)))
        
        AppState.sharedInstance.initTwilio([self])
    }
    
    override func viewWillAppear(animated: Bool) {
        super.viewWillAppear(animated)
        self.navigationController?.setNavigationBarHidden(false, animated: true)
        
        
    }
    
    override func prepareForSegue(segue: UIStoryboardSegue, sender: AnyObject?) {
        if let identifier = segue.identifier where identifier == "NewChannelViewControllerSegue", let destination = segue.destinationViewController as? UINavigationController, controller = destination.topViewController as? NewChannelViewController {
            controller.delegate = self
        }
        else if let identifier = segue.identifier where identifier == "ChatViewControllerSegue", let destination = segue.destinationViewController as? ChatViewController {
            destination.channel = sender as! TWMChannel
        }
    }

    // MARK: - Action handlers
    
    @objc private func logoutAction(sender: AnyObject?) {
        AppState.sharedInstance.kill()
        self.navigationController?.popToRootViewControllerAnimated(true)
    }
    
    @objc private func addChannelAction(sender: AnyObject?) {
        self.performSegueWithIdentifier("NewChannelViewControllerSegue", sender: self)
    }
    
    // MARK: - UITableViewDataSource
    
    func numberOfSectionsInTableView(tableView: UITableView) -> Int {
        return 1
    }
    
    func tableView(tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return channels.count
    }
    
    func tableView(tableView: UITableView, cellForRowAtIndexPath indexPath: NSIndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCellWithIdentifier(Constants.UI.ChatChannelCell)!
        cell.accessoryType = .DisclosureIndicator
        
        if indexPath.row < self.channels.count {
            let channel = self.channels[indexPath.row]
            cell.textLabel?.text = (channel.friendlyName.isEmpty) ? "u* \(channel.uniqueName)" : channel.friendlyName
        }
        
        return cell
    }
    
    // MARK: - UITableViewDelegate
    
    func tableView(tableView: UITableView, didSelectRowAtIndexPath indexPath: NSIndexPath) {
        tableView.deselectRowAtIndexPath(indexPath, animated: false)
        
        let channel = self.channels[indexPath.row]
        AppState.sharedInstance.twilio.joinChannel(channel) { (result) in
            if !result.isSuccessful() {
                dispatch_async(dispatch_get_main_queue(), {
                    let alert = UIAlertController(title: NSLocalizedString("Error", comment: "Error"), message: NSLocalizedString("Unable to join the channel.", comment: "Unable to join the channel."), preferredStyle: .Alert)
                    let action = UIAlertAction(title: NSLocalizedString("Ok", comment: "Ok"), style: .Default, handler: { (action) in
                        self.dismissViewControllerAnimated(true, completion: nil)
                    })
                    alert.addAction(action)
                    self.presentViewController(alert, animated: true, completion: nil)
                })
            }
            
            dispatch_async(dispatch_get_main_queue(), {
                self.performSegueWithIdentifier("ChatViewControllerSegue", sender: channel)
            })
        }
    }
}

extension ChannelsViewController: TwilioChannelsListener {
    
    func channelListDidComplete() {
        self.channels = AppState.sharedInstance.twilio.getChannelsList()
        dispatch_async(dispatch_get_main_queue()) { 
            self.tvChannels.reloadData()
        }
    }
    
    func channelDidRemove() {
        // TODO: Add implementation
        print("<<<< CHANNEL_DID_REMOVE")
    }
    
}

extension ChannelsViewController: NewChannelViewControllerDelegate {
    
    func newChannelViewControllerDidCancel() {
        self.dismissViewControllerAnimated(true, completion: nil)
    }
    
    func newChannelViewController(controller: NewChannelViewController, didAddChannelWithName name: String, saveHistory: Bool) {
        self.dismissViewControllerAnimated(true) {
            var channelOptions: Dictionary<String, AnyObject> = [TWMChannelOptionUniqueName: name, TWMChannelOptionType: TWMChannelType.Public.rawValue]
            
            if saveHistory {
                if let card = AppState.sharedInstance.cardForIdentity(Constants.Virgil.ChatAdmin, type: Constants.Virgil.IdentityTypeAdmin), key = NSString(data: card.publicKey.key, encoding: NSUTF8StringEncoding) {
                    channelOptions[TWMChannelOptionAttributes] = [Constants.Virgil.ChannelAttributeCardId: card.Id, Constants.Virgil.ChannelAttributeKey: key]
                }
                else {
                    dispatch_async(dispatch_get_main_queue(), { 
                        let alert = UIAlertController(title: NSLocalizedString("Error", comment: "Error"), message: NSLocalizedString("History of the channel will NOT be saved.", comment: "History of the channel will NOT be saved."), preferredStyle: .Alert)
                        let action = UIAlertAction(title: NSLocalizedString("Ok", comment: "Ok"), style: .Default, handler: { (action) in
                            self.dismissViewControllerAnimated(true, completion: nil)
                        })
                        alert.addAction(action)
                        self.presentViewController(alert, animated: true, completion: nil)
                    })
                }
            }
            
            AppState.sharedInstance.twilio.addChannelWithOptions(channelOptions, completion: { (result, channel) in
                if result.isSuccessful() && channel != nil {
                    AppState.sharedInstance.twilio.setChannelName(channel!, unique: name, friendly: nil, completion: { (result) in
                        if result.isSuccessful() {
                            AppState.sharedInstance.twilio.joinChannel(channel!, completion: { (result) in
                                if result.isSuccessful() {
                                    dispatch_async(dispatch_get_main_queue(), {
                                        self.performSegueWithIdentifier("ChatViewControllerSegue", sender: channel!)
                                    })
                                    return
                                }
                            })
                        }
                    })
                }
            })
            /// In case of error
            dispatch_async(dispatch_get_main_queue(), {
                let alert = UIAlertController(title: NSLocalizedString("Error", comment: "Error"), message: NSLocalizedString("Error creating the channel.", comment: "Error creating the channel."), preferredStyle: .Alert)
                let action = UIAlertAction(title: NSLocalizedString("Ok", comment: "Ok"), style: .Default, handler: { (action) in
                    self.dismissViewControllerAnimated(true, completion: nil)
                })
                alert.addAction(action)
                self.presentViewController(alert, animated: true, completion: nil)
            })
        }
    }
    
}