//
//  SignInViewController.swift
//  VirgilTwilioChat
//
//  Created by Pavel Gorb on 6/17/16.
//  Copyright © 2016 Virgil Security, Inc. All rights reserved.
//

import UIKit
import VirgilFoundation
import VirgilSDK
import XAsync

class SignInViewController: UIViewController, UITextFieldDelegate {
    
    @IBOutlet private var svScroll: UIScrollView!
    @IBOutlet private var vContent: UIView!
    
    @IBOutlet private var tfNickname: UITextField!
    @IBOutlet private var bChat: UIButton!

    
    override func viewDidLoad() {
        super.viewDidLoad()
    }
    
    override func viewWillAppear(animated: Bool) {
        super.viewWillAppear(animated)
        self.navigationController?.setNavigationBarHidden(true, animated: true)
        self.tfNickname.text = nil
        /// If we returning to the SignInController from somewhere and AppState exists
        /// Just kill it to make user re-login.
        if AppState.sharedInstance.privateKey != nil {
            AppState.sharedInstance.kill()
        }
    }
    
    private func toggleUIAvailability() {
        dispatch_async(dispatch_get_main_queue()) { 
            self.tfNickname.enabled = !self.tfNickname.enabled
            self.bChat.enabled = !self.bChat.enabled
        }
    }
    
    private func toggleNetworkOperationStatus() {
        let application = UIApplication.sharedApplication()
        dispatch_async(dispatch_get_main_queue()) {
            application.isIgnoringInteractionEvents() ?
                application.endIgnoringInteractionEvents() :
                application.beginIgnoringInteractionEvents()
            
            application.networkActivityIndicatorVisible = !application.networkActivityIndicatorVisible
        }
    }
    
    private func searchForExistingCard() {
        self.toggleUIAvailability()
        self.toggleNetworkOperationStatus()
        
        AppState.sharedInstance.virgil.searchCardWithIdentityValue(self.tfNickname.text!, type: Constants.Virgil.IdentityType, unauthorized: false) { (cards, error) in
            if error != nil {
                /// In case of error check if there is no card found?
                if error!.code == kVSSKeysCardNotFoundError {
                    /// There is no such card on the service found.
                    /// Need to create new card.
                    self.createAndPublishNewCard()
                    return
                }
                /// Otherwise - there is an error searching for the card.
                print("Error getting cards: \(error!.localizedDescription)")
                self.toggleNetworkOperationStatus()
                self.toggleUIAvailability()
                return
            }
            
            /// There should be only one card in response.
            if let candidates = cards where candidates.count > 0 {
                /// Store the Virgil Card received from the service.
                let card = candidates[0]
                AppState.sharedInstance.cards[card.identity.value] = card
                /// Get the private key from the keychain:
                let keyChainValue = VSSKeychainValue(id: Constants.Virgil.PrivateKeyStorage, accessGroup: nil)
                AppState.sharedInstance.privateKey = keyChainValue.objectForKey(card.identity.value) as? VSSPrivateKey
                /// Update the UI controls
                self.toggleUIAvailability()
                self.toggleNetworkOperationStatus()
                /// Check if the private key is nil (there is no private key in the keychain)
                if AppState.sharedInstance.privateKey != nil {
                    self.navigateToChat()
                }
                else {
                    dispatch_async(dispatch_get_main_queue()) {
                        let alert = UIAlertController(title: "Ooops!", message: "There is no private key found for \(AppState.sharedInstance.identity) on this device.", preferredStyle: .Alert)
                        let action = UIAlertAction(title: "Ok", style: .Cancel, handler: { (action) in
                            AppState.sharedInstance.kill()
                            alert.dismissViewControllerAnimated(true, completion: nil)
                        })
                        alert.addAction(action)
                        self.presentViewController(alert, animated: true, completion: nil)
                    }
                    return
                }
            }
            else {
                /// There is no cards returned - need to create one
                /// Need to create new card.
                self.createAndPublishNewCard()
            }
        }
    }
    
    private func createAndPublishNewCard() {
        /// Generate the key pair:
        let keyPair = VSSKeyPair()
        /// Wrap the private key into the convenient wrapper object:
        AppState.sharedInstance.privateKey = VSSPrivateKey(key: keyPair.privateKey(), password: nil)
        /// Compose the identity info object for the future Virgil Card:
        let identityInfo = VSSIdentityInfo(type: Constants.Virgil.IdentityType, value: AppState.sharedInstance.identity)
        let validationToken = AppState.sharedInstance.backend.getValidationToken(AppState.sharedInstance.identity, publicKey: keyPair.publicKey())
        identityInfo.validationToken = validationToken
        AppState.sharedInstance.virgil.createCardWithPublicKey(keyPair.publicKey(), identityInfo: identityInfo, data: nil, privateKey: AppState.sharedInstance.privateKey) { (card, error) in
            if error != nil || card == nil {
                print("Error publishing the Virgil Card: \(error!.localizedDescription)")
                self.toggleNetworkOperationStatus()
                self.toggleUIAvailability()
                return
            }
            
            /// Store the Virgil Card
            AppState.sharedInstance.cards[card!.identity.value] = card
            /// Store the private key
            let keyChainValue = VSSKeychainValue(id: Constants.Virgil.PrivateKeyStorage, accessGroup: nil)
            keyChainValue.setObject(AppState.sharedInstance.privateKey, forKey: card!.identity.value)
            /// Update UI Controls
            self.toggleUIAvailability()
            self.toggleNetworkOperationStatus()
            self.navigateToChat()
        }
    }
    
    private func navigateToChat() {
        dispatch_async(dispatch_get_main_queue()) { 
            self.performSegueWithIdentifier("ChatViewControllerSegue", sender: self)
        }
    }
    
    @IBAction func unwindToSignIn(segue: UIStoryboardSegue) {
    
    }
    
    @IBAction func chatAction(sender: AnyObject) {
        if self.tfNickname.text == nil || self.tfNickname.text!.isEmpty {
            self.tfNickname.becomeFirstResponder()
            return
        }
        
        self.tfNickname.resignFirstResponder()
        
        AppState.sharedInstance.initVirgil(self.tfNickname.text!)
        self.searchForExistingCard()
    }
    
}

extension SignInViewController {

    func textFieldShouldReturn(textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        return true
    }
    
}

