var App = function () {
    var self = this;

    var version = "1.0.0";

    var APP_TOKEN = "eyJpZCI6IjEwMzI5MDMwLTQ4OWYtNDUzOS1iNjBlLWVmYWNjNTFmOTkxOCIsImFwcGxpY2F0aW9uX2NhcmRfaWQiOiJhMjI1MzhmNS1kYTllLTQzMDItOTUxOS0yYjhiNGY0ZmI2MDIiLCJ0dGwiOi0xLCJjdGwiOi0xLCJwcm9sb25nIjowfQ==.MFgwDQYJYIZIAWUDBAICBQAERzBFAiEAnblb1XU09rePdkbYeeYx39cPPn/h3xhU9UsIqPyKHrMCIAe7SLtspMTfa8Y+eHpR0YnKRRiConYwKfkcIR4lmNVT";
    var virgilHub = new window.VirgilSDK(APP_TOKEN);
    var virgilCrypto = virgilHub.crypto;

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
            
            var accessManager = new Twilio.AccessManager(token);
            messagingClient = new Twilio.IPMessaging.Client(accessManager);
            accessManager.on('tokenExpired', self.onTokenExpired);

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

    var decryptMessage = function (message) {

        var encryptedBuffer = new virgilCrypto.Buffer(message.body, "base64");
        var decryptedMessage = virgilCrypto.decrypt(encryptedBuffer, account.card.id, account.private_key).toString('utf8');

        var messageObject = JSON.parse(decryptedMessage);
        return messageObject;
    };

    self.onTokenExpired = function() {
        alert('Your session has been expired!');
    };

    /**
     * Occurs on member joined to the current channel.     
     * @param {Object} member The member which joined to the channel.
     */
    var onMemberJoined = function (member) {

        // get member's public key by member's identity.
        virgilHub.cards.search({ value: member.identity })
            .then(function (result) {

                var latestCard = _.last(_.sortBy(result, 'created_at'));

                member.publicKey = {
                    id: latestCard.id,
                    data: latestCard.public_key.public_key
                };

                self.channelMembers.push(member);
            });
    };

    /**
     * Occurs when message received in current channel.
     * @param {Object} message The channel message.
     */
    var onMessageAdded = function (message) {
        var messageObject = decryptMessage(message);
        // Do not display self messages in order to avoid dublicates.
        if (messageObject.author === account.card.identity.value) {
            return;
        }
        self.messages.push(messageObject);
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
                var decryptedMessage = decryptMessage(data[i]);
                self.messages.push(decryptedMessage);
            }

            self.isCurrentChannelLoading(false);
        });
    };

    /**
     * Occurs when channel has been selected from UI.
     * @param {Object} channel The channel object. 
     */
    var onChannelSelected = function (channel) {
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
                return Promise.all(members.map(function (member) {
                    return virgilHub.cards.search({ value: member.identity })
                        .then(function (result) {

                            var latestCard = _.last(_.sortBy(result, 'created_at'));

                            member.publicKey = {
                                id: latestCard.id,
                                identity: latestCard.identity.value,
                                data: latestCard.public_key.public_key
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

        var messageObject = {
            body: message,
            author: account.card.identity.value,
            id: virgilHub.publicKeys.generateUUID()
        };

        // preview message 
        self.messages.push(messageObject);

        virgilCrypto.encryptAsync(JSON.stringify(messageObject), recipients)
            .then(function (encryptedData) {
                self.currentChannel().sendMessage(encryptedData.toString("base64"));
            })
            .catch(function (ex) {
                alert(ex.message);
            });
    };

    self.createChannel = function () {

        $("#createChannelModal").modal("hide");
        self.isCurrentChannelLoading(true);

        var channelName = self.newChannelName();

        // add channel admin to custom attributes.

        virgilHub.cards.search({ value: "twilio_chat_admin" })
            .then(function (result) {

                var latestCard = _.last(_.sortBy(result, 'created_at'));

                var friendlyChatName = channelName + " (" + account.card.identity.value + ")";
                var options = { friendlyName: friendlyChatName };

                if (self.isNewChannelHistory()) {
                    options.attributes = {
                        virgil_card_id: latestCard.id,
                        virgil_public_key: latestCard.public_key.public_key
                    };
                }

                return messagingClient.createChannel(options);
            })
            .then(function (channel) {
                self.channels.push(channel);
                self.setChannel(channel);
            })
            .catch(function (ex) {
                alert(ex.message);
            });
    };

    self.deleteChannel = function() {
        if (self.currentChannel &&
            self.currentChannel() != null &&
            self.currentChannel().createdBy === account.card.identity.value) {

            self.currentChannel().delete();
            self.channels.remove(self.currentChannel());
            self.currentChannel(null);
            self.currentChannelCaption("Choose Channel...");
        }
    };

    self.setChannel = function (channel) {

        if (self.currentChannel() != null && self.currentChannel().sid === channel.sid) {
            return;
        }

        self.isCurrentChannelLoading(true);

        if (self.currentChannel() != null) {
            self.currentChannel().removeListener("messageAdded", onMessageAdded);
            self.currentChannel().removeListener("memberJoined", onMemberJoined);
            self.currentChannel().leave()
                .then(function () {
                    onChannelSelected(channel);
                });

            return;
        }

        onChannelSelected(channel);
    };

    self.exit = function () {
        localStorage.removeItem("virgil_account_data");
        location.reload();
    };

    var loginAndRegisterCard = function (identityValue, validationToken) {

        var generatedKeyPair;
        var createdCard;

        self.loadingText("Generating a Key Pair...");

        return virgilCrypto
            .generateKeyPairAsync()
            .then(function (keyPair) {
                generatedKeyPair = keyPair;

                self.loadingText("Registering a Public Key...");
                return virgilHub.cards.create({
                    public_key: keyPair.publicKey,
                    private_key: keyPair.privateKey,
                    identity: {
                        type: "member",
                        value: identityValue,
                        validation_token: validationToken
                    }
                });
            })
            .then(function (card) {
                createdCard = card;

                account = { card: card, private_key: generatedKeyPair.privateKey, is_local: true };
                saveAccount(account);

                self.loadingText("Stashing a Private Key...");
                return virgilHub.privateKeys.stash({
                    virgil_card_id: card.id,
                    private_key: generatedKeyPair.privateKey
                });
            })
            .then(function () {
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
                    type: "member",
                    value: card.identity.value,
                    validation_token: token
                }
            })
            .then(function (response) {
                return {
                    card: card,
                    private_key: response.private_key
                };
            });
    };

    /**
     * Sends request to verify entered e-mail address.
     */
    self.verifyEmail = function () {

        self.currentState(appStates.LOADING);
        self.errorText("");

        self.email(self.email().trim());

        var validationToken;

        self.loadingText("Sending request for verification...");
        $.getJSON("/api/validationtoken?identity=" + self.email(), function(token) {

            // get the validation token to register & get member's card.
            validationToken = token;
            virgilHub.cards.search({ value: self.email() }).then(function(cards) {

                if (cards.length === 0) {
                    return loginAndRegisterCard(self.email(), validationToken);
                }

                var latestCard = _.last(_.sortBy(cards, 'created_at'));
                return loginWithExistingCard(latestCard, validationToken);

            }).then(function (details) {
                account = details;
                saveAccount(account);
                initialize();
            }).catch(function(ex) {
                self.currentState(appStates.STARTUP);
                self.errorText(ex.message);
            });

        });
    };

    initialize();
};