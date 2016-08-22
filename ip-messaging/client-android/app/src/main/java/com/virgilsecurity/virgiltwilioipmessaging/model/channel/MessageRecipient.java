package com.virgilsecurity.virgiltwilioipmessaging.model.channel;

import com.virgilsecurity.sdk.crypto.PublicKey;

public class MessageRecipient {
    private String cardId;
    private PublicKey publicKey;

    public MessageRecipient(String cardId, PublicKey publicKey) {
        this.cardId = cardId;
        this.publicKey = publicKey;
    }

    public PublicKey getPublicKey() {
        return publicKey;
    }

    public void setPublicKey(PublicKey publicKey) {
        this.publicKey = publicKey;
    }

    public String getCardId() {
        return cardId;
    }

    public void setCardId(String cardId) {
        this.cardId = cardId;
    }
}
