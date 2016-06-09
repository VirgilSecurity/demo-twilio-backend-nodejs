var SMSApp = (function () {

    var virgil = null;

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

        var to = $('#to').val();
        var msg = $('#msg').val();

        isLoading(true);

        $.post('/send-sms?to=' + to + '&msg=' + msg, function(){
            $('#msg').val('');
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

    return SMSApp;
}());