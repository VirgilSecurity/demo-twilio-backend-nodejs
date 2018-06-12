import { jwt } from "twilio";
import config from '../../config.json'

const AccessToken = jwt.AccessToken;
const ChatGrant = AccessToken.ChatGrant;
const chatGrant = new ChatGrant({
    serviceSid: config.TWILIO_SERVICE_SID
});

export const generateTwilioJwt = (identity: string) => {
    const token = new AccessToken(
        config.TWILIO_ACCOUNT_SID,
        config.TWILIO_API_KEY,
        config.TWILIO_API_SECRET
    );

    token.identity = identity;
    token.addGrant(chatGrant);

    return token;
}
