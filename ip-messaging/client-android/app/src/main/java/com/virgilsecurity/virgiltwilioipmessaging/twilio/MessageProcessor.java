package com.virgilsecurity.virgiltwilioipmessaging.twilio;

import java.util.Set;

public interface MessageProcessor {

    void encodeMessage(String message, Set<String> recipients, MessageProcessingListener listener);

    void decodeMessage(String message, MessageProcessingListener listener);

    public interface MessageProcessingListener {

        void onLongRunningJobBegins();

        void onSuccess(String message);

        void onFail();
    }
}
