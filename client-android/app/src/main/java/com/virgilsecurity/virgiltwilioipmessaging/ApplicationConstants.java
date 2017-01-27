package com.virgilsecurity.virgiltwilioipmessaging;

public class ApplicationConstants {

    public interface Prefs {
        static final String IDENTITY = "login";
    }

    public interface Extra {
        static final String IDENTITY = "login";
        static final String CARD_ID = "card_id";
        static final String PUBLIC_KEY = "public_key";
        static final String PRIVATE_KEY = "private_key";
        static final String VIRGIL_TOKEN = "virgil_token";
        static final String TWILIO_TOKEN = "twilio_token";
    }

    static final String IDENTITY_TYPE = "chat_member";

    static final String TOKEN = "https://demo-ip-messaging.virgilsecurity.com/auth/virgil-token";
}