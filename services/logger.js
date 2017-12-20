const bunyan = require('bunyan');

module.exports = bunyan.createLogger({
	name: 'demo-twilio-chat-server'
});