require('dotenv').config();

const requiredParams = [
    "APP_ID",
    "API_PRIVATE_KEY",
    "API_KEY_ID",
].filter(name => !process.env[name]);

if (requiredParams.length > 0) {
    throw new Error(`Invalid configuration. Missing: ${requiredParams.join(', ')} in .env file`);
}

module.exports = {
    virgil: {
        appId: process.env.APP_ID,
        apiPrivateKey: process.env.API_PRIVATE_KEY,
        apiKeyId: process.env.API_KEY_ID
    }
};
