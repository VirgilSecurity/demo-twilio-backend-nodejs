const { jwt } = require("twilio");
const config = require("./config");

const AccessToken = jwt.AccessToken;
const ChatGrant = AccessToken.ChatGrant;
const chatGrant = new ChatGrant({
    serviceSid: config.twilio.serviceSid
});

const generateTwilioJwt = (req, res) => {
  const token = new AccessToken(
    config.twilio.accountSid,
    config.twilio.apiKeySid,
    config.twilio.apiSecret
  );

  token.identity = req.user.identity;
  token.addGrant(chatGrant);
  res.json({ twilioToken: token.toJwt() })
}

module.exports = { generateTwilioJwt };
