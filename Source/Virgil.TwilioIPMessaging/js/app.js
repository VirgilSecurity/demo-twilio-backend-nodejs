var App = function () {
    var self = this;

    var version = "0.9.4";
    
    var APP_TOKEN = "eyJpZCI6IjA3NDliMWRkLThmMzctNDY3Yi1iOGZiLTg3ODJjM2NmNTVjYyIsImFwcGxpY2F0aW9uX2NhcmRfaWQiOiIwNzQ5YjFkZC04ZjM3LTQ2N2ItYjhmYi04NzgyYzNjZjU1Y2MiLCJ0dGwiOi0xLCJjdGwiOi0xLCJwcm9sb25nIjowfQ==.MIGZMA0GCWCGSAFlAwQCAgUABIGHMIGEAkA1gPzJThALAqtX3BY6aMYvqnO6TgL5Uzo4osBgk+I74u95LU9ze7NJcVPQlO4056M/lZ5l6jySFnfCIqVK8R9hAkAKoNCbfcoMmkgMwsU7TWbYtIJXosp7LjlM4QHp77dzskuPvADzXByqLKEIEcfsLUOBOGyLGatzWXo1KoUCSYQ3";
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

        // fix to forse users generate new keys.
        if (accountData.version !== version) {
            return null;
        }

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
        
        self.currentUserCaption(account.card.identity.value);
        self.currentChannelCaption("Choose Channel...");
        self.currentState(appStates.LOADING);

        self.loadingText("Initializing IP Messaging...");

        $.getJSON("/api/token?identity=" + account.card.identity.value, function (token) {

            messagingClient = new window.Twilio.IPMessaging.Client(token);
            
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
        account.version = version;
        var stringifiedAccountData = JSON.stringify(account);
        localStorage.setItem("virgil_account_data", stringifiedAccountData);
    };
    
    /**
     * Occurs on member joined to the current channel.     
     * @param {Object} member The member which joined to the channel.
     */
    var onMemberJoined = function (member) {

        // get member's public key by member's identity.
        virgilHub.cards.search({ value: member.identity, type: "email" })
            .then(function (result) {
                member.publicKey = {
                    id: result[0].id,
                    data: atob(result[0].public_key.public_key)
                };

                self.channelMembers.push(member);
                $.notify("Hello World", "success");
            });
    };

    /**
     * Occurs when message received in current channel.
     * @param {Object} message The channel message.
     */
    var onMessageAdded = function (message) {
        
        // decrypt message with current user's private key.
        
        var encryptedBuffer = new virgilCrypto.Buffer(message.body, 'base64');
        var decryptedBody = virgilCrypto.decrypt(encryptedBuffer, account.card.id, account.private_key);

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

        var url = "/api/history?channelSid=" + channel.sid + "&memberName=" + account.card.identity.value;
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

                self.channelMembers.removeAll();

                return channel.getAttributes();
            })
            .then(function () {
                return channel.getMembers();
            })
            .then(function (members) {
                return Promise.all(members.map(function(member) {
                    return virgilHub.cards.search({ value: member.identity, type: "email" })
                        .then(function (result) {
                            member.publicKey = {
                                id: result[0].id,
                                identity: result[0].identity.value,
                                data: result[0].public_key.public_key
                            };

                            self.channelMembers.push(member);
                        });
                }));
            })
            .then(function () {
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
                recipientId: self.currentChannel().attributes.virgil_card_id,
                publicKey: self.currentChannel().attributes.virgil_public_key
            });
        }

        for (var index = 0; index < self.channelMembers().length; index++) {
            recipients.push({
                recipientId: self.channelMembers()[index].publicKey.id,
                publicKey: self.channelMembers()[index].publicKey.data
            });
        }

        virgilCrypto.encryptAsync(message, recipients)
            .then(function (encryptedData) {
                self.currentChannel().sendMessage(encryptedData.toString("base64"));
            })
            .catch(function(ex) {
                alert(ex.message);
            });
    };

    self.createChannel = function () {

        $("#createChannelModal").modal("hide");
        self.isCurrentChannelLoading(true);

        var channelName = self.newChannelName();

        // add channel admin to custom attributes.

        virgilHub.cards.search({ value: "chat-twilio@mailinator.com", type: "email" })
            .then(function (result) {
                var friendlyChatName = channelName + " (" + account.card.identity.value + ")";
                var options = { friendlyName: friendlyChatName };

                if (self.isNewChannelHistory()) {
                    options.attributes = {
                        virgil_card_id: result[0].id,
                        virgil_public_key: result[0].public_key.public_key
                    };
                }

                return messagingClient.createChannel(options);
            })
            .then(function (channel) {
                self.channels.push(channel);
                self.setChannel(channel);
            })
            .catch(function(ex) {
                alert(ex.message);
            });
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
    
    self.exit = function(){             
        localStorage.removeItem("virgil_account_data");
        location.reload();
    };

    var loginAndRegisterCard = function (identityValue, validationToken) {

        var generatedKeyPair;
        var createdCard;

        self.loadingText("Generating a Key Pair...");

        return virgilCrypto
            .generateKeyPairAsync("", virgilCrypto.KeysTypesEnum.EC_SECP192R1)
            .then(function(keyPair) {
                generatedKeyPair = keyPair;

                self.loadingText("Registering a Public Key...");
                return virgilHub.cards.create({
                    public_key: keyPair.publicKey,
                    private_key: keyPair.privateKey,
                    identity: {
                        type: "email",
                        value: identityValue,
                        validation_token: validationToken
                    }
                });
            })
            .then(function(card) {
                createdCard = card;

                account = { card: card, private_key: generatedKeyPair.privateKey, is_local: true };
                saveAccount(account);
                
                self.loadingText("Stashing a Private Key...");
                return virgilHub.privateKeys.stash({
                    virgil_card_id: card.id,
                    private_key: generatedKeyPair.privateKey
                });
            })
            .then(function() {
                return {
                    card: createdCard,
                    private_key: generatedKeyPair.privateKey
                };
            });
    };

    /**
     * Loads virgil card and private key from Virgil Services.
     * @param {Object} card The Virgil Card object. 
     * @param {String} token The validation token.
     * @returns {Promise} 
     */
    var loginWithExistingCard = function (card, token) {

        self.loadingText("Loading a Private Key...");

        return virgilHub.privateKeys
            .get({
                virgil_card_id: card.id,
                identity: {
                    type: "email",
                    value: card.identity.value,
                    validation_token: token
                }})
            .then(function (response) {
                return {
                    card: card,
                    private_key: atob(response.private_key)
                };
            });
    };

    /**
     * Confirms an e-mail address and create
     */
    self.confirmAndLogin = function(){
        
        self.currentState(appStates.LOADING);
        self.errorText("");

        var validationToken;

        self.loadingText("Checking the identity...");
        virgilHub.identity
            .confirm({
                action_id: account.confirm_action_id,
                confirmation_code: self.confirmCode().trim(),
                token: {
                    time_to_live: 3600,
                    count_to_live: 1
                }
            })
            .then(function (result) {
                validationToken = result.validation_token;
                self.loadingText("Searching for the card...");
                return virgilHub.cards.search({ value: self.email(), type: "email" });
            })
            .then(function(cards) {
                return cards.length === 0
                    ? loginAndRegisterCard(self.email(), validationToken)
                    : loginWithExistingCard(cards[0], validationToken);
            })
            .then (function(details) {
                account = details;
                saveAccount(account);
                initialize();
            })
            .catch(function (ex) {
                self.errorText(ex.message);
                self.currentState(appStates.CONFIRMATION);
            });
    };
    
    /**
     * Sends request to verify entered e-mail address.
     */
    self.verifyEmail = function(){
        
        self.currentState(appStates.LOADING);
        self.errorText("");

        self.email(self.email().trim());

        self.loadingText("Sending request for verification...");
        virgilHub.identity
            .verify({ type: "email", value: self.email() })
            .then(function(response) {
                account = {
                    confirm_action_id: response.action_id,
                    identity_value: self.email()
                };
                saveAccount(account);
                self.currentState(appStates.CONFIRMATION);
            })
            .catch(function (ex) {
                self.currentState(appStates.STARTUP);
                self.errorText(ex.message);
            });
    };
    
    initialize();
};