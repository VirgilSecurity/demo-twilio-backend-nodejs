var SMSApp = (function () {

    var virgil = null;
    var tinyCipher = new VirgilSDK.Crypto.VirgilTinyCipher(120);

    function SMSApp() {
    }

    SMSApp.bootstrap = function () {
        return new SMSApp();
    };

    SMSApp.prototype.initialize = function () {

        // initialize Virgil SDK using generated access token.

        $(document).ajaxComplete(function(){
            isLoading(false);
        });

        isLoading(true);

        $.get('/virgil-token', function(token){
            // setup a Virgil SDK. 
            virgil = new VirgilSDK(token);
        });

        $('#sendMessageButton').on('click', onSendSms);
    };

    function onSendSms(){

        isError(false);

        var phoneNumber = $('#to').val();
        var code = $('#phone-code').val();
        var msg = $('#msg').val();
        
        isLoading(true);

        virgil.cards.search({ value: code + phoneNumber }).then(function(result) {
            var latestCard = _.last(_.sortBy(result, 'created_at'));          

            if (!latestCard) {
                isError(true, 'The Public Key is not found for phone number specified.');
                return;
            }

            tinyCipher.encrypt(msg, latestCard.public_key.public_key);
            var encryptedMessage = tinyCipher.getPackage(0).toString('base64');
            
            return Promise.resolve($.ajax('/send-sms', {
               data: JSON.stringify({ to: phoneNumber, msg: encryptedMessage }),
               contentType: 'application/json',
               type : 'POST'
            }))
        }).then(function(){
            success();
        }).catch(function(err){
            isError(true, err.responseJSON.error.message);
        }).finally(function(){
            isLoading(false);
        });
    }
    
    function isLoading(isLoading){
        if (isLoading){
            $('#form').addClass('loading');
        }
        else{
            $('#form').removeClass('loading');
        }
    }

    function isError(isError, msg){
        $('#form').removeClass('success');
        if (isError){
            $('#form').addClass('error');
            $('#error-msg').text(msg);
        }
        else{
            $('#form').removeClass('error');
            $('#error-msg').text('');
        }
    }

    function success(isError, msg){
        $('#form').removeClass('error');
        $('#form').addClass('success');
        var phoneNumber = $('#to').val('');
        var msg = $('#msg').val('');
    }

    return SMSApp;
}());