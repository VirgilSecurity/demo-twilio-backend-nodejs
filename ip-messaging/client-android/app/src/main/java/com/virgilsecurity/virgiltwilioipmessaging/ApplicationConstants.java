package com.virgilsecurity.virgiltwilioipmessaging;

public interface ApplicationConstants {

    public interface Prefs {
        String IDENTITY = "login";
        String CARD_ID = "card_id";
        String PUBLIC_KEY = "public_key";
        String PRIVATE_KEY = "private_key";
        String VIRGIL_TOKEN = "virgil_token";

        String LOGGED_IN = "logged_in";
    }

    public interface Messages {
        String EVENT = "event";
        String NEW_CHANNEL_EVENT = "new_channel";
        String JOIN_CHANNEL_EVENT = "join_channel";
        String REMOVE_CHANNEL_EVENT = "remove_channel";
        String UPDATE_CHANNELS_EVENT = "update_channels";
        String ADD_MESSAGE_EVENT = "add_message";

        String CHANNEL_NAME = "channel_name";
        String CHANNEL_NAMES = "channel_names";
        String CHANNEL_OWNER = "channel_owner";
        String CHANNEL_MEMBERS_COUNT = "members_count";
        String DECRYPTED_MESSAGE = "decrypted_message";

    }

    public interface State {
        String MESSAGES = "messages";
        String CHANNELS = "channels";
    }

    String DEFAULT_CHANNEL_NAME = "default";

    String IDENTITY_TYPE = "chat_member";

    String BASE_URL = "https://demo-ip-messaging.virgilsecurity.com/";
}