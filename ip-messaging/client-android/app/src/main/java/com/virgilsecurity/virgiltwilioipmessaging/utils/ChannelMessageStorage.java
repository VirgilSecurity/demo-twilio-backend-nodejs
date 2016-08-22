package com.virgilsecurity.virgiltwilioipmessaging.utils;

import com.virgilsecurity.sdk.client.utils.StringUtils;
import com.virgilsecurity.virgiltwilioipmessaging.model.channel.ChannelMessage;

import java.util.ArrayList;

public class ChannelMessageStorage extends ArrayList<ChannelMessage> {

    public ChannelMessage getById(String id) {
        if (StringUtils.isBlank(id)) {
            return null;
        }
        for (ChannelMessage message : this) {
            if (id.equals(message.getId())) {
                return message;
            }
        }
        return null;
    }

    public void addOrUpdate(ChannelMessage message) {
        if (!StringUtils.isBlank(message.getId())) {
            for (ChannelMessage msg : this) {
                if (message.getId().equals(msg.getId())){

                    msg.setDate(message.getDate());
                    msg.setAuthor(message.getAuthor());
                    msg.setBody(message.getBody());

                    return;
                }
            }
        }
        add(message);
    }
}
