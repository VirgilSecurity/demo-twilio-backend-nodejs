var App = function () {
    var self = this;
    
    var APP_TOKEN = "eyJhcHBsaWNhdGlvbl9pZCI6MywidGltZV90b19saXZlIjpudWxsLCJjb3VudF90b19saXZlIjpudWxsLCJwcm9sb25nIjpudWxsfQ==.MIGZMA0GCWCGSAFlAwQCAgUABIGHMIGEAkB0XwTzK4zViBu97GE2qTrA82CjDOJ3m0sWLsB+fAQsFMSDNdtWlnf2epYB9rVQr6dm/f1x1hj9V3ACAE3SZDLuAkBmURJCwhj5+B5Xfjg/VacQOIosicXkDMQ+5YZsvT4XOV5g9+xykAFHvGIOHN1G77ABT2G+UosOWNgnz/uPQENH";
    var VirgilSDK = new window.VirgilSDK(APP_TOKEN, {
        identityBaseUrl: 'https://identity-stg.virgilsecurity.com/v1',
        privateKeysBaseUrl: 'https://keys-private-stg.virgilsecurity.com/v3',
        publicKeysBaseUrl: 'https://keys-stg.virgilsecurity.com/v3',
        cardsBaseUrl: 'https://keys-stg.virgilsecurity.com/v3'
    });
    
    var virgilHub = VirgilSDK;
    var virgilCrypto = VirgilSDK.crypto;

    var account = null;

    var messagingClient = null;
    var accessManager = null;

    var appStates = { STARTUP: 0, CONFIRMATION: 1, LOADING: 2, CHAT: 3 };

    self.newChannelName = ko.observable("");
    self.isNewChannelHistory = ko.observable(true);

    self.currentUserCaption = ko.observable("");
    self.currentChannelCaption = ko.observable("");
    self.isCurrentChannelLoading = ko.observable(false);

    self.currentState = ko.observable(appStates.STARTUP);
    self.loadingText = ko.observable("");
    
    self.email = ko.observable("");
    self.confirmCode = ko.observable("");

    self.currentChannel = ko.observable();
    self.channelMembers = ko.observableArray();
    self.inputMessage = ko.observable("");
    self.channels = ko.observableArray();
    self.errorText = ko.observable("");
    self.messages = ko.observableArray().extend({ scrollFollow: "#chatBox" });

    self.accountData = null;
    self.hasPrivateKey = ko.observable(false);

    /**
     * Loads the virgil account from local storage.
     * @returns {Object} Returns the application account. 
     */
    var loadAccount = function () {
        var accountDataString = localStorage.getItem("virgil_account_data");
        if (accountDataString === null) {
            return null;
        }

        var accountData = JSON.parse(accountDataString);
        return accountData;
    };

    /**
     * Initializes the chat application. 
     */
    var initialize = function () {

        account = loadAccount();

        if (!account) {
            self.currentState(appStates.STARTUP);
            return;
        }

        if (account.confirm_action_id) {
            self.currentState(appStates.CONFIRMATION);
            return;
        }
        
        self.currentUserCaption(account.identity.value);
        self.currentChannelCaption("Choose Channel...");
        self.currentState(appStates.LOADING);

        self.loadingText("Initializing IP Messaging...");

        $.getJSON("/api/token?identity=" + account.identity.value, function (token) {

            accessManager = new Twilio.AccessManager(token);
            messagingClient = new Twilio.IPMessaging.Client(accessManager);

            //messagingClient.on('channelAdded', onChannelAdded);

            self.loadingText("Loading channels...");

            messagingClient.getChannels().then(function (channels) {
                for (var i = 0; i < channels.length; i++) {
                    self.channels.push(channels[i]);
                };
                self.currentState(appStates.CHAT);
            });
        });
    };

    /**
     * Saves the account to local storage.
     * @param {Object} account The virgil account data.
     */
    var saveAccount = function (account) {
        var stringifiedAccountData = JSON.stringify(account);
        localStorage.setItem("virgil_account_data", stringifiedAccountData);
    };

    /**
     * Loads account from file.
     * @returns {Object} account blob. 
     */
    var readAccountFromFile = function () {

        var files = document.getElementById("privateKeyInputFile").files;
        var file = files[0];

        var reader = new FileReader();

        self.currentState(appStates.LOADING);
        self.loadingText("Reading File...");

        reader.onload = function (e) {
            var stringifiedAccount = atob(e.target.result);
            var accountFormFile = JSON.parse(stringifiedAccount);
            saveAccount(accountFormFile);
            initialize(false);
        };

        var blob = file.slice(0, file.size);

        reader.readAsBinaryString(blob);
        return blob;
    };
    
    /**
     * Gets the current channel member by member's sid.
     * @param {String} member The memeber's SID.
     * @returns {Object} Returns member from cache otherwise null.
     */
    var getMember = function (memberSid) {

        for (var i = 0; i < self.channelMembers().length; i++) {
            if (self.channelMembers()[i].sid === memberSid) {
                return self.channelMembers()[i];
            }
        };

        return null;
    };
    
    /**
     * Occurs on member joined to the current channel.     
     * @param {Object} member The member which joined to the channel.
     */
    var onMemberJoined = function (member) {

        var channelMember = getMember(member.sid);
        if (channelMember)
            return;

        // get member's public key by member's identity.

        virgilHub.cards.search({ value: member.identity, type: 'email' })
            .then(function (result) {
                // extend the channel member with public key.
                member.publicKey = {
                    id: result[0].public_key.id,
                    data: result[0].public_key.public_key
                };
                self.channelMembers.push(member);
            });
    };

    /**
     * Occurs when message received in current channel.
     * @param {Object} message The channel message.
     */
    var onMessageAdded = function (message) {
        
        // decrypt message with current user's private key.

        var decryptedBody = virgilCrypto.decrypt(message.body, account.public_key_id, account.private_key);
        var author = message.from ? message.from : message.author;

        self.messages.push({
            sid: message.sid,
            author: author,
            body: decryptedBody
        });
    };

    /**
     * Occurs when channel has been loaded.
     * @param {Object} channel The channel object. 
     */
    var onChannelLoaded = function (channel) {

        if (!channel.attributes.virgil_public_key) {
            self.isCurrentChannelLoading(false);
            return;
        }

        self.isCurrentChannelLoading(true);

        var url = "/api/history?channelSid=" + channel.sid + "&memberName=" + account.user_data.value;
        $.getJSON(url, function (data) {
            for (var i = 0; i < data.length; i++) {
                onMessageAdded(data[i]);
            }

            self.isCurrentChannelLoading(false);
        });
    };

    /**
     * Occurs when channel has been selected from UI.
     * @param {Object} channel The channel object. 
     */
    var onChannelSelected = function(channel) {
        channel.join()
            .then(function () {
                self.messages.removeAll();

                channel.on("memberJoined", onMemberJoined);
                channel.on("messageAdded", onMessageAdded);

                self.currentChannelCaption(channel.friendlyName);
                self.currentChannel(channel);

                return channel.getAttributes();
            })
            .then(function () {
                return channel.getMembers();
            })
            .then(function (members) {
                members.forEach(onMemberJoined);
                onChannelLoaded(channel);
            });
    }

    self.postMessage = function () {

        var message = self.inputMessage();
        if (message === "")
            return;

        self.inputMessage("");

        // prepare recipients list for encrypting the channel message.

        var recipients = [];

        if (self.currentChannel().attributes.virgil_public_key) {
            recipients.push({
                recipientId: self.currentChannel().attributes.virgil_public_key_id,
                publicKey: atob(self.currentChannel().attributes.virgil_public_key)
            });
        }

        for (var index = 0; index < self.channelMembers().length; index++) {
            recipients.push({
                recipientId: self.channelMembers()[index].publicKey.id,
                publicKey: atob(self.channelMembers()[index].publicKey.data)
            });
        }
        
        var crypto = new VirgilSDK.Crypto();
        crypto.encryptWithKeyMultiRecipientsAsync(btoa(message), recipients)
            .then(function (encryptedData) {
                self.currentChannel().sendMessage(encryptedData);
            });
    };

    self.createChannel = function () {

        $('#createChannelModal').modal('hide');
        self.isCurrentChannelLoading(true);

        var channelName = self.newChannelName();

        // add channel admin to custom attributes.

        virgilHub.cards.search("virgil-chat-admin@yopmail.com")
            .then(function (result) {
                var friendlyChatName = channelName + " (" + account.identity.value + ")";
                var options = { friendlyName: friendlyChatName };

                if (self.isNewChannelHistory()) {
                    options.attributes = {
                        virgil_public_key_id: result[0].public_key_id,
                        virgil_public_key: result[0].public_key.public_key
                    };
                }

                return messagingClient.createChannel(options);
            })
            .then(function (channel) {
                self.channels.push(channel);
                self.setChannel(channel);
            });

        //virgilHub.searchKey("virgil-chat-admin@yopmail.com")
        //    .then(function (result) {
        //        var friendlyChatName = channelName + " (" + account.identity.value + ")";

        //        var options = { friendlyName: friendlyChatName };

        //        if (self.isNewChannelHistory()) {
        //            options.attributes = {
        //                virgil_public_key_id: result.id.public_key_id,
        //                virgil_public_key: result.public_key
        //            };
        //        }

        //        return messagingClient.createChannel(options);
        //    })
        //    .then(function (channel) {
        //        self.channels.push(channel);
        //        self.setChannel(channel);
        //    });
    };

    self.setChannel = function(channel){
        
        if (self.currentChannel() != null && self.currentChannel().sid === channel.sid){
            return;
        }
        
        self.isCurrentChannelLoading(true);
        
        if (self.currentChannel() != null) {
            self.currentChannel().removeListener("messageAdded", onMessageAdded);
            self.currentChannel().removeListener("memberJoined", onMemberJoined);
            self.currentChannel().leave()
                .then(function() {
                    onChannelSelected(channel);
                });

            return;
        }

        onChannelSelected(channel);
    };

    self.saveKeys = function(){
        var stringifiedAccountData = JSON.stringify(account);
        var blob = new Blob([btoa(stringifiedAccountData)], { type: "application/octet-stream" });
        saveAs(blob, "keys.vks");
    };
    
    self.exit = function(){             
        localStorage.removeItem("virgil_account_data");
        location.reload();
    };

    var createVirgilCard = function () {

        self.currentState(appStates.LOADING);
        self.errorText("");

        var keyPair = virgilCrypto.generateKeyPair();
        virgilHub.cards.create({
            public_key: keyPair.publicKey,
            private_key: keyPair.privateKey,
            identity: {
                type: 'email',
                value: account.identity_value,
                validation_token: account.identity_token
            }
        }).then(function (result) {
            delete account.identity_value;
            delete account.identity_token;

            account.card_id = result.id;
            account.identity = result.identity;
            account.public_key_id = result.public_key.id;
            account.public_key = result.public_key.public_key;
            account.private_key = keyPair.private_key;

            saveAccount(account);

            self.currentState(appStates.CONFIRMATION);
        }).catch(function (ex) {

            self.errorText(ex.message);
            self.currentState(appStates.CONFIRMATION);
        });
    };

    /* Sends confirmation code for entered E-mail address.
    ---------------------------------------------------------------------------------------------------------*/
    self.confirm = function(){
        
        self.currentState(appStates.LOADING);
        self.errorText("");

        virgilHub.identity.confirm({
            action_id: account.confirm_action_id,
            confirmation_code: self.confirmCode(),
            token: { 
                time_to_live: 3600,
                count_to_live: 1
            }
        }).then(function (result) {
            delete account.confirm_action_id;
            account.identity_token = result.identity_token;
            saveAccount(account);
            createVirgilCard();
        }).catch(function (ex) {
            if (ex.code == 40180) {
                createVirgilCard();
            }

            self.errorText(ex.message);
            self.currentState(appStates.CONFIRMATION);
        });

        //virgilHub.identity.confirm({ })

        //if (typeof account.action_token !== "undefined") {

        //    self.loadingText("Updating a Public Key...");

        //    virgilHub.persistKey(account.public_key_id, account.action_token, [self.confirmCode()])
        //        .then(
        //            function(result) {
        //                delete account.action_token;
        //                account.user_data.is_confirmed = true;
        //                saveAccount(account);
        //                initialize();
        //            },
        //            function(result) {
        //                self.errorText(result.error.message);
        //                self.currentState(appStates.CONFIRMATION);
        //            }
        //        );

        //    return;
        //}

        //self.loadingText("Confirmation registration...");

        //virgilHub.persistUserData(account.user_data.id.user_data_id, self.confirmCode()).then(
        //    function(response) {
        //        account.user_data.is_confirmed = true;
        //        saveAccount(account);
        //        initialize();
        //    },
        //    function(response) {
        //        if (response.code == 20213){                    
        //            account.user_data.is_confirmed = true;
        //            saveAccount(account);
        //            initialize();
        //        }
        //        else {
        //            self.errorText(response.error.message);
        //            self.currentState(appStates.CONFIRMATION);
        //        }
        //    }
        //);
    };
    
    self.register = function(){

        if (self.hasPrivateKey()){
            readAccountFromFile();
            return;
        }

        self.currentState(appStates.LOADING);
        self.loadingText("Generating a Key Pair...");
        self.errorText("");
        
        virgilHub.identity.verify({ type: 'email', value: self.email() })
            .then(function(response) {
                account = {
                    confirm_action_id: response.action_id,
                    identity_value: self.email()
                };
                saveAccount(account);
                self.currentState(appStates.CONFIRMATION);
            });

        //virgilCrypto.generateKeyPair(keysTypesEnum.ecNist256).then(function (keyPair) {

        //    virgilHub.cards.create({
        //        public_key: keyPair.publicKey,
        //        private_key: keyPair.privateKey,
        //        identity: {
        //            type: 'email',
        //            value: self.email(),
        //            validation_token: 'token from identity.confirm'
        //        }
        //    });

        //    // prepare user data fot public key.
        //    var userData = [ { 'class': 'user_id', 'type': 'email', 'value': self.email() } ];
        //    var virgilPublicKey =  new VirgilSDK.PublicKey(keyPair.publicKey, userData);
        //    var virgilPrivateKey = new VirgilSDK.PrivateKey(keyPair.privateKey);

        //    self.loadingText("Registering a Public Key...");

        //    var publicKeyId = null;

        //    // request for registration public key on 'Virgil Keys Service'
        //    virgilHub.addKey(virgilPublicKey, virgilPrivateKey.KeyBase64).then(
        //        function(response){
                    
        //            account = {
        //                'public_key_id': response.id.public_key_id,
        //                'public_key': keyPair.publicKey,
        //                'private_key': keyPair.privateKey,
        //                'user_data': response.user_data[0]
        //            };

        //            saveAccount(account);
        //            self.currentState(appStates.CONFIRMATION);
        //        },
        //        function(response){

        //            if (response.error.code == 20107){

        //                virgilHub.searchKey(userData[0].value)
        //                    .then(function(result) {

        //                        publicKeyId = result.id.public_key_id;

        //                        return virgilHub.resetKey(result.id.public_key_id, 
        //                            btoa(keyPair.publicKey), btoa(keyPair.privateKey));
        //                    })
        //                    .then(function(result) {
        //                        account = {
        //                            'public_key_id': publicKeyId,
        //                            'public_key': keyPair.publicKey,
        //                            'private_key': keyPair.privateKey,
        //                            'user_data': userData[0],
        //                            'action_token': result.action_token
        //                        };

        //                        saveAccount(account);
        //                        self.currentState(appStates.CONFIRMATION);
        //                    });

        //                self.currentState(appStates.LOADING);
        //                self.loadingText('Resetting Public Key...');

        //                return;
        //            }

        //            self.errorText(response.error.message);
        //            self.currentState(appStates.STARTUP);
        //        }
        //    );

        //});
    };
   

    initialize(true);
};