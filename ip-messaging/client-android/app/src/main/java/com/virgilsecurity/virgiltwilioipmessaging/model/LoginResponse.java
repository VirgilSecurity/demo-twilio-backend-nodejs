package com.virgilsecurity.virgiltwilioipmessaging.model;

import com.google.gson.annotations.SerializedName;

public class LoginResponse {

    @SerializedName("application_sign")
    private String applicationSign;

    @SerializedName("identity")
    private String identity;

    @SerializedName("validation_token")
    private String validationToken;

    public String getValidationToken() {
        return validationToken;
    }

    public void setValidationToken(String validationToken) {
        this.validationToken = validationToken;
    }

    public String getIdentity() {
        return identity;
    }

    public void setIdentity(String identity) {
        this.identity = identity;
    }

    public String getApplicationSign() {
        return applicationSign;
    }

    public void setApplicationSign(String applicationSign) {
        this.applicationSign = applicationSign;
    }
}
