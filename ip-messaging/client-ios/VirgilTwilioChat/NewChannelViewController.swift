//
//  NewChannelViewController.swift
//  VirgilTwilioChat
//
//  Created by Pavel Gorb on 8/21/16.
//  Copyright © 2016 Virgil Security, Inc. All rights reserved.
//

import Foundation
import UIKit

protocol NewChannelViewControllerDelegate: class {
    
    func newChannelViewControllerDidCancel()
    func newChannelViewController(controller: NewChannelViewController, didAddChannelWithName name: String, saveHistory: Bool)
}

class NewChannelViewController: UIViewController {
    
    var delegate: NewChannelViewControllerDelegate! = nil
    
    @IBOutlet private var lName: UILabel!
    @IBOutlet private var tfName: UITextField!
    @IBOutlet private var lHistory: UILabel!
    @IBOutlet private var swHistory: UISwitch!
   
    
    // MARK: - View management
    
    override func viewDidLoad() {
        super.viewDidLoad()
        self.title = NSLocalizedString("Add Channel", comment: "Add channel")
        
        
        self.navigationItem.leftBarButtonItem = UIBarButtonItem(title: NSLocalizedString("Cancel", comment: "Cancel"), style: .Plain, target: self, action: #selector(self.cancelAction(_:)))
        self.navigationItem.rightBarButtonItem = UIBarButtonItem(barButtonSystemItem: .Save, target: self, action: #selector(self.saveAction(_:)))
        
        self.tfName.becomeFirstResponder()
    }
    
    // MARK: - Action handlers
    
    func cancelAction(sender: AnyObject?) {
        if let delegate = self.delegate {
            delegate.newChannelViewControllerDidCancel()
        }
    }
    
    func saveAction(sender: AnyObject?) {
        guard let name = self.tfName.text where !name.isEmpty else {
            return
        }
        
        if let delegate = self.delegate {
            delegate.newChannelViewController(self, didAddChannelWithName: name, saveHistory: self.swHistory.on)
        }
    }
}

extension NewChannelViewController: UITextFieldDelegate {
    
    func textFieldShouldReturn(textField: UITextField) -> Bool {
        return false
    }
    
}


