require('dotenv').config();

const requiredParams = [
    "APP_ID",
    "APP_KEY",
    "APP_KEY_ID",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_API_SECRET",
    "TWILIO_API_KEY_SID",
    "TWILIO_SERVICE_SID",
].filter(name => !process.env[name]);

if (requiredParams.length > 0) {
    throw new Error(`Invalid configuration. Missing: ${requiredParams.join(', ')} in .env file`);
}

module.exports = {
    virgil: {
        appId: process.env.APP_ID,
        appKey: process.env.APP_KEY,
        appKeyId: process.env.APP_KEY_ID
    },
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        apiSecret: process.env.TWILIO_API_SECRET,
        apiKeySid: process.env.TWILIO_API_KEY_SID,
        serviceSid: process.env.TWILIO_SERVICE_SID,
    }
};
