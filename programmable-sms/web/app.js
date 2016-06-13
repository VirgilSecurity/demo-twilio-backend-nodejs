require('dotenv').load();

var express = require('express');
var http = require('http');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var twilio = require('twilio');
var virgil = require('virgil-sdk');
var bodyParser = require('body-parser');

var app = express();
var rootDir = path.resolve('./public');

app.use(bodyParser.json());
app.use(express.static(rootDir));

app.get('/virgil-token', function (req, res, next) {
    res.send(process.env.VIRGIL_ACCESS_TOKEN);
});

app.get('/validate-phone-number', function (req, res, next) {        

    var phoneNumber = req.query.phoneNumber;
    var privateKey = new Buffer(process.env.VIRGIL_APP_PRIVATE_KEY, 'base64').toString();

    var validationToken = virgil.utils.generateValidationToken('+' + phoneNumber, 
        'phone', privateKey, process.env.VIRGIL_APP_PRIVATE_KEY_PASSWORD);

    res.send(validationToken);        
});

app.post('/send-sms', function (req, res, next) {

    var to = req.body.to;
    var message = req.body.msg;

    // Twilio Credentials
    var accountSid = process.env.TWILIO_ACCOUNT_SID;
    var authToken = process.env.TWILIO_AUTH_TOKEN;
    
    // Require the Twilio module and create a REST client
    var client = twilio(accountSid, authToken);

    client.messages.create({
            to: process.env.APP_PHONE_CODE + to,
            from: process.env.TWILIO_PHONE_NUMBER,
            body: message
        }, 
        function (error, result) {
            if (error) {
                res.status(500).send({ error: error });
            }            
            res.send(result);
            next();
        });   
});

app.get('/', function (req, res, next) {
    fs.readFile(__dirname + '/index.html', 'utf8', function (err, data) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        var indexData = data.replace(/{{ PHONE_CODE }}/g, process.env.APP_PHONE_CODE);
        res.write(indexData);
        res.end();
    });
});


http.createServer(app).listen(8082);
