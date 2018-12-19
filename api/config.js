require('dotenv').config();

const requiredParams = [
    "APP_ID",
    "API_PRIVATE_KEY",
    "API_KEY_ID",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_API_SECRET",
    "TWILIO_API_KEY",
    "TWILIO_SERVICE_SID",
].filter(name => !process.env[name]);

if (requiredParams.length > 0) {
    throw new Error(`Invalid configuration. Missing: ${requiredParams.join(', ')} in .env file`);
}

module.exports = {
    virgil: {
        appId: process.env.APP_ID,
        apiPrivateKey: process.env.API_PRIVATE_KEY,
        apiKeyId: process.env.API_KEY_ID
    },
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        apiSecret: process.env.TWILIO_API_SECRET,
        apiKey: process.env.TWILIO_API_KEY,
        serviceSid: process.env.TWILIO_SERVICE_SID,
    }
};
