var ViewModel = function () {
    var self = this;
    
    var APP_TOKEN = "45fd8a505f50243fa8400594ba0b2b29";
    var VirgilSDK = window.VirgilSDK;

    var account = null;

    var keysService = new VirgilSDK.PublicKeysService(APP_TOKEN);
    var messagingClient = null;
    var publicKeysCache = [];

    var appStates = { STARTUP: 0, CONFIRMATION: 1, LOADING: 2, CHAT: 3 };

    self.currentUserCaption = ko.observable('');
    self.currentChannelCaption = ko.observable('');
    self.isCurrentChannelLoading = ko.observable(false);

    self.currentState = ko.observable(appStates.STARTUP);
    self.loadingText = ko.observable("");
    
    self.email = ko.observable("");
    self.confirmCode = ko.observable("");

    self.currentChannel = ko.observable();
    self.channelMembers = ko.observableArray();
    self.inputMessage = ko.observable('');
    self.channels = ko.observableArray();
    self.errorText = ko.observable('');
    self.messages = ko.observableArray().extend({ scrollFollow: '#chatBox' });

    self.accountData = null;

    self.hasPrivateKey =  ko.observable(false);

    self.postMessage = function(){
        onMessagePost(self.inputMessage());
    };

    self.createChannel = function(){
        var channelName = prompt("Channel Name");

        if (channelName == null || channelName == ''){
            return;
        }

        var friendlyChatName = channelName + ' (' + account.user_data.value + ')';
        messagingClient.createChannel({ friendlyName: friendlyChatName }).then(function(channel){
            self.setChannel(channel);
        });
    };

    self.setChannel = function(channel){

        if (self.currentChannel() != null && self.currentChannel().sid == channel.sid){
            return;
        }

        self.isCurrentChannelLoading(true);
        if (self.currentChannel() != null){

            self.currentChannel().removeListener('messageAdded', onMessageAdded);
            self.currentChannel().removeListener('memberJoined', onMemberJoined);
            self.currentChannel().leave()
                .then(function(){
                    channel.on('memberJoined', onMemberJoined);
                    return channel.join();
                })
                .then(function(){
                    self.messages.removeAll();
                    channel.on('messageAdded', onMessageAdded);
                    self.currentChannelCaption(channel.friendlyName);
                    self.currentChannel(channel);
                    loadChannelMembers();
                    self.isCurrentChannelLoading(false);
                })
                .then(onChannelLoaded);

            return;
        }

        channel.join().then(function() {

            channel.on('memberJoined', onMemberJoined);
            channel.on('messageAdded', onMessageAdded);

            self.currentChannelCaption(channel.friendlyName);
            self.currentChannel(channel);
            loadChannelMembers();
            self.isCurrentChannelLoading(false);
            onChannelLoaded(channel);
        });
    };

    var startup = function(){

        account = loadAccount();

        if (!account){
            self.currentState(appStates.STARTUP);
            return;
        }

        if (typeof account.action_token !== "undefined" || !account.user_data.is_confirmed){
            self.currentState(appStates.CONFIRMATION);
            return;
        }

        self.currentUserCaption(account.user_data.value);
        self.currentChannelCaption('Choose Channel...');

        initialize();
    };

    var initialize = function(){

        self.currentState(appStates.LOADING);
        self.loadingText('Initializing IP Messaging...');

        $.getJSON('/api/token?identity=' + account.user_data.value, function (data) {

            messagingClient = new Twilio.IPMessaging.Client(data);
            //messagingClient.on('channelAdded', onChannelAdded);

            self.loadingText('Loading channels...');

            messagingClient.getChannels().then(function(channels){
                for (var i = 0; i < channels.length; i++) {
                    self.channels.push(channels[i]);
                };
                self.currentState(appStates.CHAT);
            });
        });
    };

    self.saveKeys = function(){
        var stringifiedAccountData = JSON.stringify(account);
        var blob = new Blob([btoa(stringifiedAccountData)], { type: 'application/octet-stream' });
        saveAs(blob, "keys.vks");
    };
    
    self.exit = function(){             
        localStorage.removeItem("virgil_account_data");
        location.reload();
    };

    /* Sends confirmation code for entered E-mail address.
    ---------------------------------------------------------------------------------------------------------*/
    self.confirm = function(){
        
        self.currentState(appStates.LOADING);
        self.errorText('');

        if (typeof account.action_token !== "undefined") {

            self.loadingText("Updating a Public Key...");

            keysService.persistKey(account.public_key_id, account.action_token, [self.confirmCode()])
                .then(
                    function(result) {
                        delete account.action_token;
                        account.user_data.is_confirmed = true;
                        saveAccount(account);
                        startup();
                    },
                    function(result) {
                        self.errorText(result.error.message);
                        self.currentState(appStates.CONFIRMATION);
                    }
                );

            return;
        }

        self.loadingText("Confirmation registration...");

        keysService.persistUserData(account.user_data.id.user_data_id, self.confirmCode()).then(
            function(response) {
                account.user_data.is_confirmed = true;
                saveAccount(account);
                startup();
            },
            function(response) {
                if (response.code == 20213){                    
                    account.user_data.is_confirmed = true;
                    saveAccount(account);
                    startup();
                }
                else {
                    self.errorText(response.error.message);
                    self.currentState(appStates.CONFIRMATION);
                }
            }
        );
    };

    /* Registration
       Generate new public/private key pair and sends public key registration request to Virgil Keys service.
    ----------------------------------------------------------------------------------------------------------*/
    self.register = function(){

        if (self.hasPrivateKey()){
            readAccountFromFile();
            return;
        }

        self.currentState(appStates.LOADING);
        self.loadingText("Generating a Key Pair...");
        self.errorText('');

        var virgilCrypto = new VirgilSDK.Crypto();

        virgilCrypto.generateKeysAsync('', 'ecNist256')
            .then(function(keys) {

            var keyPair = {
                publicKey: keys.publicKey,
                privateKey: keys.privateKey
            };

            // prepare user data fot public key.
            var userData = [ { 'class': 'user_id', 'type': 'email', 'value': self.email() } ];
            var virgilPublicKey = new VirgilSDK.PublicKey(keyPair.publicKey, userData);
            var virgilPrivateKey = new VirgilSDK.PrivateKey(keyPair.privateKey);

            self.loadingText("Registering a Public Key...");

            var publicKeyId = null;

            // request for registration public key on 'Virgil Keys Service'
            keysService.addKey(virgilPublicKey, virgilPrivateKey.KeyBase64).then(
                function(response){
                    
                    account = {
                        'public_key_id': response.id.public_key_id,
                        'public_key': keyPair.publicKey,
                        'private_key': keyPair.privateKey,
                        'user_data': response.user_data[0]
                    };

                    saveAccount(account);
                    self.currentState(appStates.CONFIRMATION);
                },
                function(response){

                    if (response.error.code == 20107){

                        keysService.searchKey(userData[0].value)
                            .then(function(result) {

                                publicKeyId = result.id.public_key_id;

                                return keysService.resetKey(result.id.public_key_id, 
                                    btoa(keyPair.publicKey), btoa(keyPair.privateKey));
                            })
                            .then(function(result) {
                                account = {
                                    'public_key_id': publicKeyId,
                                    'public_key': keyPair.publicKey,
                                    'private_key': keyPair.privateKey,
                                    'user_data': userData[0],
                                    'action_token': result.action_token
                                };

                                saveAccount(account);
                                self.currentState(appStates.CONFIRMATION);
                            });

                        self.currentState(appStates.LOADING);
                        self.loadingText('Resetting Public Key...');

                        return;
                    }

                    self.errorText(response.error.message);
                    self.currentState(appStates.STARTUP);
                }
            );

        });
    };

    var onChannelLoaded = function(channel) {
        $.getJSON('/api/history?channelSid=' + channel.sid + '&memberName=' + account.user_data.value, function (data) {
            for (var i = 0; i < data.length; i++) {
                onMessageAdded(data[i]);
            }
        });
    };
    
    var onChannelAdded = function(channel){     
        self.channels.push(channel);
    };

    var onMessageAdded = function(message){
        var decryptedBody = decryptMessageForCurrentMember(message.body);

        var author = message.from ? message.from : message.author;

        self.messages.push({ sid: message.sid, author: author, body: decryptedBody });
        console.log(message);
    };

    var onMessagePost = function(message){
        if (message == '')
            return;

        self.inputMessage('');

        var recipients = [];
        for (var i = 0; i < self.channelMembers().length; i++) {

            var memberPublicKey = getMemberPublicKey(self.channelMembers()[i]);

            recipients.push( { 
                recipientId: memberPublicKey.public_key_id, 
                publicKey: atob(memberPublicKey.public_key)
            });
        };
        
        var virgilCrypto = new VirgilSDK.Crypto();

        virgilCrypto.encryptWithKeyMultiRecipientsAsync(btoa(message), recipients)
            .then(function(encryptedData) {
                self.currentChannel().sendMessage(encryptedData);
            });
    };

    var onMemberJoined = function(member){
        ensurePublicKeyExists(member);
        self.channelMembers.push(member);
    };

    var decryptMessageForCurrentMember = function(encryptedData){
        var virgilCrypto = new VirgilSDK.Crypto();
        var decryptedData = virgilCrypto.decryptWithKey(encryptedData, 
            account.public_key_id, 
            btoa(account.private_key));

        return atob(decryptedData);
    };

    var ensurePublicKeyExists = function(member){
        if (!getMemberPublicKey(member)){
            keysService.searchKey(member.identity).then(
                function(result) {
                    publicKeysCache.push({ 
                        sid: member.sid, 
                        identity: member.identity, 
                        public_key_id: result.id.public_key_id, 
                        public_key: result.public_key 
                    });
                },
                function(error) {
                    console.error(error);
                }
            );
        }
    };

    var getMemberPublicKey = function(member){
        for (var i = 0; i < publicKeysCache.length; i++) {
            if(publicKeysCache[i].sid == member.sid){
                return publicKeysCache[i];
            }
        };
        return null;
    };

    var loadChannelMembers = function(){
        self.currentChannel().getMembers()
            .then(function(members){
                self.channelMembers.removeAll();
                onMemberJoined({ identity: 'virgil-chat-admin@yhg.biz' });
                for (var i = 0; i < members.length; i++) {
                    onMemberJoined(members[i]);
                };
            });
    };

    var saveAccount = function(accountData){
        var stringifiedAccountData = JSON.stringify(accountData);
        localStorage.setItem("virgil_account_data", stringifiedAccountData);
    };

    var loadAccount = function(){
        var accountDataString = localStorage.getItem("virgil_account_data");
        if (accountDataString === null){
            return null;
        }

        var accountData = JSON.parse(accountDataString);
        return accountData;
    };
        
    var readAccountFromFile = function(){
        
        var files = document.getElementById('privateKeyInputFile').files;
        var file = files[0];
    
        var reader = new FileReader();

        self.currentState(appStates.LOADING);
        self.loadingText("Reading File...");

        reader.onload = function(e) {
            var stringifiedAccount = atob(e.target.result);
            var accountFormFile = JSON.parse(stringifiedAccount);
            saveAccount(accountFormFile);
            startup();
        };
        var blob = file.slice(0, file.size);
        
        reader.readAsBinaryString(blob);
        return blob;    
    };

    startup();
};