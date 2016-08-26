package com.virgilsecurity.virgiltwilioipmessaging.twilio;

import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.util.Log;

import com.twilio.common.TwilioAccessManager;
import com.twilio.common.TwilioAccessManagerFactory;
import com.twilio.common.TwilioAccessManagerListener;
import com.twilio.ipmessaging.Channel;
import com.twilio.ipmessaging.ChannelListener;
import com.twilio.ipmessaging.Constants;
import com.twilio.ipmessaging.ErrorInfo;
import com.twilio.ipmessaging.IPMessagingClientListener;
import com.twilio.ipmessaging.Member;
import com.twilio.ipmessaging.TwilioIPMessagingClient;
import com.twilio.ipmessaging.TwilioIPMessagingSDK;
import com.twilio.ipmessaging.UserInfo;
import com.virgilsecurity.sdk.client.utils.StringUtils;
import com.virgilsecurity.virgiltwilioipmessaging.ApplicationConstants;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import static com.virgilsecurity.virgiltwilioipmessaging.ApplicationConstants.Messages.ADD_MESSAGE_EVENT;
import static com.virgilsecurity.virgiltwilioipmessaging.ApplicationConstants.Messages.CHANNEL_MEMBERS_COUNT;
import static com.virgilsecurity.virgiltwilioipmessaging.ApplicationConstants.Messages.CHANNEL_NAME;
import static com.virgilsecurity.virgiltwilioipmessaging.ApplicationConstants.Messages.CHANNEL_NAMES;
import static com.virgilsecurity.virgiltwilioipmessaging.ApplicationConstants.Messages.DECRYPTED_MESSAGE;
import static com.virgilsecurity.virgiltwilioipmessaging.ApplicationConstants.Messages.EVENT;
import static com.virgilsecurity.virgiltwilioipmessaging.ApplicationConstants.Messages.JOIN_CHANNEL_EVENT;
import static com.virgilsecurity.virgiltwilioipmessaging.ApplicationConstants.Messages.REMOVE_CHANNEL_EVENT;
import static com.virgilsecurity.virgiltwilioipmessaging.ApplicationConstants.Messages.UPDATE_CHANNELS_EVENT;

public class TwilioFacade {

    final static String TAG = "TwilioFacade";

    private TwilioTokenProvider mTwilioTokenProvider;

    private String mTwilioToken;
    private TwilioAccessManager mAccessManager;
    private TwilioIPMessagingClient mMessagingClient;

    private Channel mActiveChannel;

    private MessageProcessor mMessageProcessor;
    private Handler handler;

    public TwilioFacade(TwilioTokenProvider twilioTokenProvider, MessageProcessor messageProcessor) {
        this.mTwilioTokenProvider = twilioTokenProvider;
        this.mMessageProcessor = messageProcessor;

        obtainTwilioToken();
    }

    private void obtainTwilioToken() {
        Thread background = new Thread(new Runnable() {

            @Override
            public void run() {
                mTwilioToken = mTwilioTokenProvider.getToken();

                if (mAccessManager == null) {
                    registerAccessManager();
                } else {
                    mAccessManager.updateToken(mTwilioToken);
                }
            }
        });
        background.start();
    }

    private void registerAccessManager() {
        // Create a Twilio Access Manager with provided token
        mAccessManager = TwilioAccessManagerFactory.createAccessManager(mTwilioToken,
                mAccessManagerListener);

        TwilioIPMessagingClient.Properties props =
                new TwilioIPMessagingClient.Properties(
                        TwilioIPMessagingClient.SynchronizationStrategy.ALL, 500);

        // Initialize Twilio IP Messaging Client
        mMessagingClient = TwilioIPMessagingSDK.createClient(mAccessManager, props,
                mMessagingClientCallback);

        // Register IP Messaging client listener
        mMessagingClient.setListener(new IPMessagingClientListener() {
            @Override
            public void onChannelAdd(Channel channel) {
                Log.d(TAG, "Channel added: " + channel.getFriendlyName());
                updateChannels();
            }

            @Override
            public void onChannelChange(Channel channel) {
                Log.d(TAG, "Channel changed: " + channel.getFriendlyName());
                updateChannels();
            }

            @Override
            public void onChannelDelete(Channel channel) {
                Log.d(TAG, "Channel deleted: " + channel.getFriendlyName());
                sendMessageToHandler(REMOVE_CHANNEL_EVENT, channel.getFriendlyName());
            }

            @Override
            public void onChannelSynchronizationChange(Channel channel) {

            }

            @Override
            public void onError(ErrorInfo errorInfo) {

            }

            @Override
            public void onUserInfoChange(UserInfo userInfo) {

            }

            @Override
            public void onClientSynchronization(TwilioIPMessagingClient.SynchronizationStatus synchronizationStatus) {
                updateChannels();
            }

            @Override
            public void onToastNotification(String s, String s1) {

            }

            @Override
            public void onToastSubscribed() {

            }

            @Override
            public void onToastFailed(ErrorInfo errorInfo) {

            }
        });
    }

    private TwilioAccessManagerListener mAccessManagerListener = new TwilioAccessManagerListener() {
        @Override
        public void onTokenExpired(TwilioAccessManager twilioAccessManager) {
            Log.d(TAG, "Access token has expired");
            obtainTwilioToken();
        }

        @Override
        public void onTokenUpdated(TwilioAccessManager twilioAccessManager) {
            Log.d(TAG, "Access token has updated");
        }

        @Override
        public void onError(TwilioAccessManager twilioAccessManager, String errorMessage) {
            Log.d(TAG, "Error with Twilio Access Manager: " + errorMessage);
        }
    };

    private ChannelListener mChannelListener = new ChannelListener() {
        @Override
        public void onMessageAdd(final com.twilio.ipmessaging.Message message) {
            Log.d(TAG, "Message added");
            decodeMessageAndNotifyUI(message);
        }

        @Override
        public void onMessageChange(com.twilio.ipmessaging.Message message) {
            Log.d(TAG, "Message changed: " + message.getMessageBody());
            decodeMessageAndNotifyUI(message);
        }

        @Override
        public void onMessageDelete(com.twilio.ipmessaging.Message message) {
            Log.d(TAG, "Message deleted");
        }

        @Override
        public void onMemberJoin(Member member) {
            Log.d(TAG, "Member joined: " + member.getUserInfo().getIdentity());
        }

        @Override
        public void onMemberChange(Member member) {
            Log.d(TAG, "Member changed: " + member.getUserInfo().getIdentity());
        }

        @Override
        public void onMemberDelete(Member member) {
            Log.d(TAG, "Member deleted: " + member.getUserInfo().getIdentity());
        }

        @Override
        public void onAttributesChange(Map<String, String> map) {
            Log.d(TAG, "Attributes changed: " + map.toString());
        }

        @Override
        public void onTypingStarted(Member member) {
            Log.d(TAG, "Started Typing: " + member.getUserInfo().getIdentity());
        }

        @Override
        public void onTypingEnded(Member member) {
            Log.d(TAG, "Ended Typing: " + member.getUserInfo().getIdentity());
        }

        @Override
        public void onSynchronizationChange(Channel channel) {

        }

        private void decodeMessageAndNotifyUI(com.twilio.ipmessaging.Message message) {
            mMessageProcessor.decodeMessage(message.getMessageBody(), new MessageProcessor.MessageProcessingListener() {
                @Override
                public void onLongRunningJobBegins() {
                    // There is nothing to do here
                }

                @Override
                public void onSuccess(String result) {
                    Bundle b = new Bundle();
                    b.putString(DECRYPTED_MESSAGE, result);
                    sendMessageToHandler(ADD_MESSAGE_EVENT, b);
                }

                @Override
                public void onFail() {
                    Log.e(TAG, "Can't add message");
                }
            });
        }
    };

    private Constants.CallbackListener<TwilioIPMessagingClient> mMessagingClientCallback =
            new Constants.CallbackListener<TwilioIPMessagingClient>() {
                @Override
                public void onSuccess(TwilioIPMessagingClient twilioIPMessagingClient) {
                    Log.d(TAG, "Success creating Twilio IP Messaging Client");
                }
            };

    /**
     * Create a new Twilio Channel
     *
     * @param name The name of new channel
     */
    public void createChannel(final String name) {
        Map<String, Object> channelProps = new HashMap<>();
        channelProps.put(Constants.CHANNEL_FRIENDLY_NAME, name);
        channelProps.put(Constants.CHANNEL_UNIQUE_NAME, name);
        channelProps.put(Constants.CHANNEL_TYPE, Channel.ChannelType.CHANNEL_TYPE_PUBLIC);
        mMessagingClient.getChannels().createChannel(channelProps, new Constants.CreateChannelListener() {
            @Override
            public void onCreated(final Channel channel) {
                if (channel != null) {
                    Log.d(TAG, "Created channel: " + channel.getFriendlyName());
                    updateChannels();
                }
            }

            @Override
            public void onError(ErrorInfo errorInfo) {
                Log.e(TAG, "Error creating channel: " + errorInfo.getErrorText());
            }
        });
    }

    public void joinChannel(final String name) {
        Log.d(TAG, "Joining Channel: " + name);

        // Find channel to join to
        Channel joinChannel = null;
        if (StringUtils.isBlank(name)) {
            // Join to first available channel
            if (mMessagingClient.getChannels().getChannels().length > 0) {
                joinChannel = mMessagingClient.getChannels().getChannels()[0];
            }
        } else {
            // Find channel to join
            for (Channel channel : mMessagingClient.getChannels().getChannels()) {
                if (name.equals(channel.getFriendlyName())) {
                    joinChannel = channel;
                    break;
                }
            }
        }

        if (joinChannel == null) {
            Log.e(TAG, "No channel to join to");
            return;
        }

        final Channel theChannel = joinChannel;

        theChannel.join(new Constants.StatusListener() {
            @Override
            public void onSuccess() {
                mActiveChannel = theChannel;
                Log.d(TAG, "Joined channel: " + name);

                mActiveChannel.setListener(mChannelListener);

                if (handler != null) {
                    Message msgObj = handler.obtainMessage();
                    Bundle b = new Bundle();
                    b.putString(EVENT, JOIN_CHANNEL_EVENT);
                    b.putString(CHANNEL_NAME, name);
//                    b.putString(CHANNEL_OWNER, mActiveChannel.getAttributes());
                    b.putInt(CHANNEL_MEMBERS_COUNT, mActiveChannel.getMembers().getMembers().length);
                    msgObj.setData(b);
                    handler.sendMessage(msgObj);
                }
            }

            @Override
            public void onError(ErrorInfo errorInfo) {
                Log.e(TAG, "Error joining channel: " + errorInfo.getErrorText());
            }
        });
    }

    public void removeChannel(final String name) {
        Log.d(TAG, "Removing Channel: " + name);

        for (Channel channel : mMessagingClient.getChannels().getChannels()) {
            if (name.equals(channel.getFriendlyName())) {
                channel.destroy(new Constants.StatusListener() {
                    @Override
                    public void onSuccess() {
                        mActiveChannel = null;
                        Log.d(TAG, "Removed channel: " + name);

                        joinChannel(null);

                        sendMessageToHandler(REMOVE_CHANNEL_EVENT, name);
                    }

                    @Override
                    public void onError(ErrorInfo errorInfo) {
                        Log.e(TAG, "Error removing channel: " + errorInfo.getErrorText());
                    }
                });
                break;
            }
        }
    }

    public void updateChannels() {
        mMessagingClient.getChannels().loadChannelsWithListener(
                new Constants.StatusListener() {
                    @Override
                    public void onSuccess() {
                        if (mMessagingClient.getChannels().getChannels().length < 1) {

                            // Create default channel
                            createChannel(ApplicationConstants.DEFAULT_CHANNEL_NAME);
                        } else if (mActiveChannel == null) {
                            joinChannel(null);
                        }

                        ArrayList<String> channelNames = new ArrayList<String>();
                        for (Channel channel : mMessagingClient.getChannels().getChannels()) {
                            channelNames.add(channel.getFriendlyName());
                        }

                        Bundle b = new Bundle();
                        b.putStringArrayList(CHANNEL_NAMES, channelNames);
                        sendMessageToHandler(UPDATE_CHANNELS_EVENT, b);
                    }
                });
    }

    public void sendMessage(String text) {
        if (mActiveChannel == null) {
            //TODO: notify user
            return;
        }
        Set<String> recipients = new HashSet<>();
        for (Member member : mActiveChannel.getMembers().getMembers()) {
            recipients.add(member.getUserInfo().getIdentity());
        }

        mMessageProcessor.encodeMessage(text, recipients, new MessageProcessor.MessageProcessingListener() {
            @Override
            public void onLongRunningJobBegins() {
                // There is nothing to do here
            }

            @Override
            public void onSuccess(String result) {
                if (mActiveChannel != null) {
                    // Sent message with Twilio channel
                    com.twilio.ipmessaging.Message message = mActiveChannel.getMessages().createMessage(result);

                    mActiveChannel.getMessages().sendMessage(message, new Constants.StatusListener() {
                        @Override
                        public void onSuccess() {
                            Log.d(TAG, "Message sent succesfully");
                        }

                        @Override
                        public void onError(ErrorInfo errorInfo) {
                            Log.e(TAG, "Error sending message: " + errorInfo.getErrorText());
                        }
                    });
                }
            }

            @Override
            public void onFail() {
                Log.e(TAG, "Message encoding error");
            }
        });
    }

    public void setHandler(Handler handler) {
        this.handler = handler;
    }

    private void sendMessageToHandler(String event, String channelName) {
        Bundle b = new Bundle();
        if (!StringUtils.isBlank(channelName)) {
            b.putString(CHANNEL_NAME, channelName);
        }
        sendMessageToHandler(event, b);
    }

    private void sendMessageToHandler(String event, Bundle bundle) {
        if (handler != null) {
            Message msgObj = handler.obtainMessage();
            bundle.putString(EVENT, event);
            msgObj.setData(bundle);
            handler.sendMessage(msgObj);
        }
    }

    public String getActiveChannelName() {
        if (mActiveChannel != null) {
            return mActiveChannel.getFriendlyName();
        }
        return "";
    }

    public interface TwilioTokenProvider {
        String getToken();
    }

}
