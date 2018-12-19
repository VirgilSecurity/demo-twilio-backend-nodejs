import { jwt } from "twilio";
import config from "../config";

const AccessToken = jwt.AccessToken;
const ChatGrant = AccessToken.ChatGrant;
const chatGrant = new ChatGrant({
    serviceSid: config.twilio.serviceSid
});

const generateTwilioJwt = (req, res) => {
  const token = new AccessToken(
    config.twilio.accountSid,
    config.twilio.apiKey,
    config.twilio.apiSecret
  );

  token.identity = identity;
  token.addGrant(chatGrant);

  res.json({ twilioToken: token.toJwt() })
}

module.exports = { generateTwilioJwt }