package com.virgilsecurity.virgiltwilioipmessaging.twilio;

import java.util.List;

public interface MessageProcessor {

    void encodeMessage(String message, List<String> recipients, MessageProcessingListener listener);

    void decodeMessage(String message, MessageProcessingListener listener);

    public interface MessageProcessingListener {

        void onSuccess(String result);

        void onFail();
    }
}
