package com.virgilsecurity.virgiltwilioipmessaging.http;

import com.virgilsecurity.virgiltwilioipmessaging.model.LoginRequest;
import com.virgilsecurity.virgiltwilioipmessaging.model.LoginResponse;
import com.virgilsecurity.virgiltwilioipmessaging.model.TwilioToken;
import com.virgilsecurity.virgiltwilioipmessaging.model.VirgilToken;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.Query;

public interface IPMessagingService {

    // Headers CF-RAY x-ipm-response-sign
    @GET("/auth/virgil-token")
    Call<VirgilToken> getVirgilToken();

    // Headers CF-RAY x-ipm-response-sign
    @GET("/auth/twilio-token")
    Call<TwilioToken> getTwilioToken(@Query("identity") String identity, @Query("deviceId") String deviceId);

    @POST("/auth/login")
    Call<LoginResponse> login(@Body LoginRequest loginRequest);
}
