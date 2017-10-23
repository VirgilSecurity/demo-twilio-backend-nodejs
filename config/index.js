require('dotenv').config();

const missingParams = [
	'VIRGIL_AUTH_URI',
	'VIRGIL_ACCESS_TOKEN',
	'VIRGIL_CARDS_READ_URI',
	'VIRGIL_CARDS_URI',
	'APP_CARD_ID',
	'APP_PRIVATE_KEY',
	'TWILIO_ACCOUNT_SID',
	'TWILIO_API_KEY',
	'TWILIO_API_SECRET',
	'TWILIO_IPM_SERVICE_SID'
].filter(name => !process.env[name]);

if (missingParams.length > 0) {
	throw new Error(`Invalid configuration. Missing: ${missingParams.join()}.`);
}

module.exports = {
	app: {
		cardId: process.env.APP_CARD_ID,
		privateKeyData: process.env.APP_PRIVATE_KEY,
		privateKeyPassword: process.env.APP_PRIVATE_KEY_PASSWORD,
		name: process.env.APP_NAME || 'TwilioChat#SecuredByVirgil'
	},
	virgil: {
		accessToken: process.env.VIRGIL_ACCESS_TOKEN,
		authBaseUrl: process.env.VIRGIL_AUTH_URI,
		cardsReadBaseUrl: process.env.VIRGIL_CARDS_READ_URI,
		cardsBaseUrl: process.env.VIRGIL_CARDS_URI
	},
	twilio: {
		accountSid: process.env.TWILIO_ACCOUNT_SID,
		apiKey: process.env.TWILIO_API_KEY,
		apiSecret: process.env.TWILIO_API_SECRET,
		ipmServiceSid: process.env.TWILIO_IPM_SERVICE_SID
	}
};