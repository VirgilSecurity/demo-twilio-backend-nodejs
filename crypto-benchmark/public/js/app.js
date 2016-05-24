var cryptoTester = angular.module("cryptoTester",[]);

cryptoTester.controller("mainCtrl", ["$scope", function($scope) {
    
    $scope.text = "";
    $scope.logs = [];  
    $scope.keysType = "Default";
    $scope.recipientsCount = "1";
    $scope.error = "";
    
    var startTime;
    
    var startWatch = function(){
        startTime = performance.now();
    };
    
    var stopWatch = function(){        
        var t = startTime;
        startTime = 0;
        return Math.round(performance.now() - t);
    };
    
    var outputLog = function(message, time){
        $scope.$apply(function() {
            var result = time ? time + " ms" : "";
            $scope.logs.push({ desc: message, result: result });                        
        });
    };    
    
    $scope.startBenchmark = function(){
        
        var Virgil = window.VirgilSDK;
        var virgil = new Virgil("NO_KEYS");
        
        var cipherData;
        var signData;
        
        var recipients = [];
        
        // clear veriables before start benchmark
        $scope.error = "";
        $scope.logs.length = 0;                
        $scope.logs.push({ desc: "Benchmark started..." }); 
        
        for (var index = 0; index < $scope.recipientsCount; index++) {
            recipients.push({ recipientId: 'Recipient' + index });
        }
        
        startWatch();
        
        Promise.each(recipients, function(recipient){
            // Key Pair generation
            return virgil.crypto.generateKeyPairAsync("", $scope.keysType).then(function(keys){ 
                recipient.publicKey = keys.publicKey;
                recipient.privateKey = keys.privateKey;
                return recipient;
            })
        }).then(function(generatedRecipients){         
            outputLog("Public/Private key pair generation", stopWatch());
            startWatch();
            return virgil.crypto.encryptAsync($scope.text, recipients);
        // Encryption
        }).then(function(encryptedData){
            outputLog("Encryption", stopWatch());     
            cipherData = encryptedData;
            startWatch();
            return virgil.crypto.signAsync(encryptedData, recipients[0].privateKey);
        // Signing           
        }).then(function(signDigest){
            outputLog("Signing", stopWatch());            
            signData = signDigest;           
            startWatch();                                
            return virgil.crypto.verifyAsync(cipherData, recipients[0].publicKey, signData);
        // Virification 
        }).then(function(isValid){          
            outputLog("Verification", stopWatch());     
            startWatch();         
            return virgil.crypto.decryptAsync(cipherData, recipients[0].recipientId, recipients[0].privateKey);
        // Decryption  
        }).then(function(decryptedText){      
            outputLog("Decryption", stopWatch());
        }).catch(function(ex){
            $scope.$apply(function() {
                $scope.error = ex.message;
            });
        });
    };
    
    $scope.loremIpsum = function(){
        $.getJSON("http://baconipsum.com/api/?callback=?", 
			{ "type":"meat-and-filler", "start-with-lorem":"1", "paras":"1" }, 
			function(baconGoodness)
		{
			if (baconGoodness && baconGoodness.length > 0)
			{
                $scope.$apply(function() {
				    $scope.text = baconGoodness[0];
                });
			}
		});
    };
}]);