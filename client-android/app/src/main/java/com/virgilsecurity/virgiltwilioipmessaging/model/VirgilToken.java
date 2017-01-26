package com.virgilsecurity.virgiltwilioipmessaging.model;

import com.google.gson.annotations.SerializedName;

public class VirgilToken {

    @SerializedName("virgil_token")
    private String virgilToken;

    public String getVirgilToken() {
        return virgilToken;
    }

    public void setVirgilToken(String virgilToken) {
        this.virgilToken = virgilToken;
    }
}
