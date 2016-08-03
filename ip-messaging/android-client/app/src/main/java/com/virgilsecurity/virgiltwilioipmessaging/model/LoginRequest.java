package com.virgilsecurity.virgiltwilioipmessaging.model;

import com.google.gson.annotations.SerializedName;

public class LoginRequest {

    @SerializedName("identity")
    private String identity;

    /* public key as a String */
    @SerializedName("public_key")
    private String publicKey;

    public LoginRequest() {

    }

    public LoginRequest(String identity, String publicKey) {
        this.identity = identity;
        this.publicKey = publicKey;
    }

    public String getIdentity() {
        return identity;
    }

    public void setIdentity(String identity) {
        this.identity = identity;
    }

    public String getPublicKey() {
        return publicKey;
    }

    public void setPublicKey(String publicKey) {
        this.publicKey = publicKey;
    }
}
