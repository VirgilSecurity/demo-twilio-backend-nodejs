//
//  ChannelsViewController.swift
//  VirgilTwilioChat
//
//  Created by Pavel Gorb on 7/27/16.
//  Copyright © 2016 Virgil Security, Inc. All rights reserved.
//

import Foundation
import UIKit

protocol ChannelsViewControllerDelegate: class {
    
    func channelsViewController(controller: ChannelsViewController, didFinishWithChannel channel: TWMChannel)
    func channelsViewControllerDidCancel()

    func channelsViewController(controller: ChannelsViewController, didAddChannelWithName name: String)
}

class ChannelsViewController: UIViewController, UITableViewDelegate, UITableViewDataSource {
    
    @IBOutlet private var tvChannels: UITableView!
    
    var delegate: ChannelsViewControllerDelegate!
    var channels = [TWMChannel]()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        self.edgesForExtendedLayout = .None
        self.tvChannels.registerClass(UITableViewCell.self, forCellReuseIdentifier: Constants.UI.ChatChannelCell)        
    }
    
    override func viewWillAppear(animated: Bool) {
        super.viewWillAppear(animated)
        self.navigationController?.setNavigationBarHidden(false, animated: true)
    }

    // MARK: - Action handlers
    @IBAction func cancelAction() {
        self.delegate?.channelsViewControllerDidCancel()
    }
    
    @IBAction func addChannelAction() {
        let alert = UIAlertController(title: "Channel Name", message: "", preferredStyle: .Alert)
        alert.addTextFieldWithConfigurationHandler { (textField) in
            textField.keyboardType = .ASCIICapable
            textField.returnKeyType = .Done
            textField.autocorrectionType = .No
            textField.autocapitalizationType = .None
        }
        let ok = UIAlertAction(title: "Ok", style: .Default) { (action) in
            if let textfields = alert.textFields where textfields.count > 0 {
                let tf = textfields[0]
                if let text = tf.text where !text.isEmpty {
                    self.delegate?.channelsViewController(self, didAddChannelWithName: text)
                    return
                }
            }
            
            self.delegate?.channelsViewControllerDidCancel()
        }
        let cancel = UIAlertAction(title: "Cancel", style: .Default) { (action) in
            self.delegate?.channelsViewControllerDidCancel()
        }
        
        alert.addAction(ok)
        alert.addAction(cancel)
        self.presentViewController(alert, animated: true, completion: nil)
    }
    
    // MARK: - UITableViewDataSource
    
    func numberOfSectionsInTableView(tableView: UITableView) -> Int {
        return 1
    }
    
    func tableView(tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return self.channels.count
    }
    
    func tableView(tableView: UITableView, cellForRowAtIndexPath indexPath: NSIndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCellWithIdentifier(Constants.UI.ChatChannelCell)!
        cell.accessoryType = .DisclosureIndicator
        
        if indexPath.row < self.channels.count {
            let channel = self.channels[indexPath.row]
            cell.textLabel?.text = (channel.friendlyName.isEmpty) ? channel.uniqueName : channel.friendlyName
        }
        
        return cell
    }
    
    // MARK: - UITableViewDelegate
    
    func tableView(tableView: UITableView, didSelectRowAtIndexPath indexPath: NSIndexPath) {
        tableView.deselectRowAtIndexPath(indexPath, animated: true)
        
        if indexPath.row < self.channels.count {
            let channel = self.channels[indexPath.row]
            self.delegate?.channelsViewController(self, didFinishWithChannel: channel)
        }
    }
}