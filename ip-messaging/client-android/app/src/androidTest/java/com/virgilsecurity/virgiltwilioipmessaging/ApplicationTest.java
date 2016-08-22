package com.virgilsecurity.virgiltwilioipmessaging;

import android.app.Application;
import android.test.ApplicationTestCase;

import com.virgilsecurity.sdk.crypto.KeyPair;
import com.virgilsecurity.sdk.crypto.KeyPairGenerator;

/**
 * <a href="http://d.android.com/tools/testing/testing_android.html">Testing Fundamentals</a>
 */
public class ApplicationTest extends ApplicationTestCase<Application> {
    public ApplicationTest() {
        super(Application.class);
    }

    public void testKeyPairGenerator() {
        KeyPair keyPair = KeyPairGenerator.generate();
        assertNotNull(keyPair);
    }
}