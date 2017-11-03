const twilio = require('twilio');
const config = require('../config');
const AccessToken = twilio.jwt.AccessToken;
const ChatGrant = AccessToken.ChatGrant;

function getTwilioToken(req, res) {
	const twilio = config.twilio;
	const userCard = req.userCard;
	const endpointId = `${config.app.name}:${userCard.identity}:${userCard.data.deviceId}`;
	const charGrant = new ChatGrant({
		serviceSid: twilio.ipmServiceSid,
		endpointId
	});

	const token = new AccessToken(twilio.accountSid, twilio.apiKey, twilio.apiSecret);
	token.addGrant(charGrant);
	token.identity = userCard.identity;

	res.json({ twilioToken: token.toJwt() });
}

module.exports = {
	getTwilioToken
};