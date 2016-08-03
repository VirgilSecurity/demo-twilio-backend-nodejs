package com.virgilsecurity.virgiltwilioipmessaging.model;

import com.google.gson.annotations.SerializedName;

public class TwilioToken {

    @SerializedName("twilio_token")
    private String twilioToken;

    public String getTwilioToken() {
        return twilioToken;
    }

    public void setTwilioToken(String twilioToken) {
        this.twilioToken = twilioToken;
    }
}
