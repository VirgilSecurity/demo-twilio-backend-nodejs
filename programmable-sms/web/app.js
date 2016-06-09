require('dotenv').load();

var express = require('express');
var http = require('http');
var path = require('path');
var _ = require('lodash');
var twilio = require('twilio');

var app = express();
var rootDir = path.resolve('./public');

app.use(express.static(rootDir));

app.get('/virgil-token', function (req, res, next) {
    res.send(process.env.VIRGIL_ACCESS_TOKEN);
});

app.post('/send-sms', function (req, res, next) {

    var to = req.query.to;
    var message = req.query.msg;

    // Twilio Credentials
    var accountSid = process.env.TWILIO_ACCOUNT_SID;
    var authToken = process.env.TWILIO_AUTH_TOKEN;
    
    // Require the Twilio module and create a REST client
    var client = twilio(accountSid, authToken);

    client.messages.create({
        to: '+38' + to,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: message
        }, function(err, message) {
            console.log(message.sid);
    });
});

app.get('*', function (req, res, next) {
    if (request.accepts('html')) {
        response.sendFile(rootDir + '/index.html');
    }
    else {
        next();
    }
});

http.createServer(app).listen(8081);
