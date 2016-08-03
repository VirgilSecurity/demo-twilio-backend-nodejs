package com.virgilsecurity.virgiltwilioipmessaging.utils;

public class CommonUtils {

    public static boolean isNicknameValid(String nickname) {
        String trimmed = nickname.trim();
        return !(trimmed.isEmpty()  || trimmed.contains(" "));
    }
}
