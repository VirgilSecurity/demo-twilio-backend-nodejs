package com.virgilsecurity.virgiltwilioipmessaging;

import android.content.DialogInterface;
import android.content.Intent;
import android.os.AsyncTask;
import android.os.Bundle;
import android.support.design.widget.NavigationView;
import android.support.v4.view.GravityCompat;
import android.support.v4.widget.DrawerLayout;
import android.support.v7.app.ActionBarDrawerToggle;
import android.support.v7.app.AlertDialog;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.support.v7.widget.Toolbar;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.SubMenu;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.TextView;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.twilio.common.TwilioAccessManager;
import com.twilio.common.TwilioAccessManagerFactory;
import com.twilio.common.TwilioAccessManagerListener;
import com.twilio.ipmessaging.Channel;
import com.twilio.ipmessaging.ChannelListener;
import com.twilio.ipmessaging.Constants;
import com.twilio.ipmessaging.ErrorInfo;
import com.twilio.ipmessaging.IPMessagingClientListener;
import com.twilio.ipmessaging.Member;
import com.twilio.ipmessaging.Message;
import com.twilio.ipmessaging.TwilioIPMessagingClient;
import com.twilio.ipmessaging.TwilioIPMessagingSDK;
import com.twilio.ipmessaging.UserInfo;
import com.virgilsecurity.sdk.client.ClientFactory;
import com.virgilsecurity.sdk.client.model.publickey.SearchCriteria;
import com.virgilsecurity.sdk.client.model.publickey.VirgilCard;
import com.virgilsecurity.sdk.crypto.Base64;
import com.virgilsecurity.sdk.crypto.CryptoHelper;
import com.virgilsecurity.sdk.crypto.PrivateKey;
import com.virgilsecurity.sdk.crypto.PublicKey;
import com.virgilsecurity.virgiltwilioipmessaging.adapter.MessagesAdapter;
import com.virgilsecurity.virgiltwilioipmessaging.model.ChatMember;
import com.virgilsecurity.virgiltwilioipmessaging.model.ChatMessage;
import com.virgilsecurity.virgiltwilioipmessaging.utils.CommonUtils;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class MainActivity extends AppCompatActivity
        implements NavigationView.OnNavigationItemSelectedListener {

    final static String TAG = "MainActivity";
    final static String DEFAULT_CHANNEL_NAME = "default";

    private MessagesAdapter mMessagesAdapter;
    private ArrayList<Message> mMessages = new ArrayList<>();

    private EditText mWriteMessageEditText;
    private ImageButton mSendChatMessageButton;
    private NavigationView mNavigationView;

    private ClientFactory clientFactory;
    private String mIdentity;
    private String mCardId;

    private TwilioAccessManager mAccessManager;
    private TwilioIPMessagingClient mMessagingClient;

    private Channel mCurrentChannel;
    private Map<String, ChatMember> mMembers;

    private Gson mGson = new GsonBuilder().create();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_main);

        // Load current user card preferences
        Intent intent = getIntent();
        mIdentity = intent.getStringExtra(ApplicationConstants.Extra.IDENTITY);
        mCardId = intent.getStringExtra(ApplicationConstants.Extra.CARD_ID);

        // Initialize Client Factory
        String accessToken = intent.getStringExtra(ApplicationConstants.Extra.VIRGIL_TOKEN);
        clientFactory = new ClientFactory(accessToken);

        // Configure UI
        Toolbar toolbar = (Toolbar) findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        // Configure messages view
        PrivateKey privateKey = new PrivateKey(intent.getStringExtra(ApplicationConstants.Extra.PRIVATE_KEY));
        mMessagesAdapter = new MessagesAdapter(mMessages, mCardId, privateKey);

        RecyclerView messagesRecyclerView = (RecyclerView) findViewById(R.id.messagesRecyclerView);
        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        // for a chat app, show latest at the bottom
        layoutManager.setStackFromEnd(true);
        messagesRecyclerView.setLayoutManager(layoutManager);
        messagesRecyclerView.setAdapter(mMessagesAdapter);

        mWriteMessageEditText = (EditText) findViewById(R.id.writeMessageEditText);
        mSendChatMessageButton = (ImageButton) findViewById(R.id.sendChatMessageButton);
        mSendChatMessageButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                if (mCurrentChannel != null) {
                    String messageBody = mWriteMessageEditText.getText().toString();

                    SendMessageTask sendTask = new SendMessageTask(messageBody);
                    sendTask.execute((Void) null);
                }
            }
        });

        DrawerLayout drawer = (DrawerLayout) findViewById(R.id.drawer_layout);
        ActionBarDrawerToggle toggle = new ActionBarDrawerToggle(
                this, drawer, toolbar, R.string.navigation_drawer_open, R.string.navigation_drawer_close);
        drawer.setDrawerListener(toggle);
        toggle.syncState();

        mNavigationView = (NavigationView) findViewById(R.id.nav_view);
        mNavigationView.setNavigationItemSelectedListener(this);

        TextView nicknameTV = (TextView) mNavigationView.getHeaderView(0).findViewById(R.id.nickname);
        nicknameTV.setText(mIdentity);


        // Initialize chat
        mMembers = new ConcurrentHashMap<>();

        String twilioToken = intent.getStringExtra(ApplicationConstants.Extra.TWILIO_TOKEN);
        retrieveAccessTokenFromServer(twilioToken);
    }

    @Override
    public void onBackPressed() {
        DrawerLayout drawer = (DrawerLayout) findViewById(R.id.drawer_layout);
        if (drawer.isDrawerOpen(GravityCompat.START)) {
            drawer.closeDrawer(GravityCompat.START);
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.main, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        int id = item.getItemId();

        //noinspection SimplifiableIfStatement
        if (id == R.id.action_close) {
            finish();
            return true;
        }

        return super.onOptionsItemSelected(item);
    }

    @SuppressWarnings("StatementWithEmptyBody")
    @Override
    public boolean onNavigationItemSelected(MenuItem item) {
        // Handle navigation view item clicks here.
        int id = item.getItemId();

        if (id == R.id.nav_add_channel) {
            // Open create channel dialog
            final EditText input = new EditText(this);
            AlertDialog.Builder builder = new AlertDialog.Builder(this);
            builder.setTitle(R.string.dialog_create_channel)
                    .setView(input)
                    .setPositiveButton(android.R.string.ok, new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface dialog, int id) {
                            String channelName = input.getText().toString();
                            createChannel(channelName);
                        }
                    })
                    .setNegativeButton(android.R.string.cancel, new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface dialog, int id) {
                            // User cancelled the dialog
                        }
                    });
            builder.create().show();
        } else {
            joinChannel(item.getTitle().toString());
        }

        DrawerLayout drawer = (DrawerLayout) findViewById(R.id.drawer_layout);
        drawer.closeDrawer(GravityCompat.START);
        return true;
    }

    private void createChannel(String name) {
        Map<String, Object> channelProps = new HashMap<>();
        channelProps.put(Constants.CHANNEL_FRIENDLY_NAME, name);
        channelProps.put(Constants.CHANNEL_UNIQUE_NAME, name);
        channelProps.put(Constants.CHANNEL_TYPE, Channel.ChannelType.CHANNEL_TYPE_PUBLIC);
        mMessagingClient.getChannels().createChannel(channelProps, new Constants.CreateChannelListener() {
            @Override
            public void onCreated(final Channel channel) {
                if (channel != null) {
                    Log.d(TAG, "Created default channel");
                    MainActivity.this.runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            joinChannel(channel);
                        }
                    });
                }
            }

            @Override
            public void onError(ErrorInfo errorInfo) {
                Log.e(TAG, "Error creating channel: " + errorInfo.getErrorText());
            }
        });
    }

    private void addChannel(final Channel channel) {

    }

    private void removeChannel(final Channel channel) {

    }

    private void joinChannel(String name) {
        for (Channel channel : mMessagingClient.getChannels().getChannels()) {
            if (name.equals(channel.getFriendlyName())) {
                joinChannel(channel);
                break;
            }
        }
    }

    private void joinChannel(final Channel channel) {
        Log.d(TAG, "Joining Channel: " + channel.getFriendlyName());
        channel.join(new Constants.StatusListener() {
            @Override
            public void onSuccess() {
                mCurrentChannel = channel;
                Log.d(TAG, "Joined default channel");

                mMembers.clear();
                mMessages.clear();

                MainActivity.this.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        setTitle(channel.getFriendlyName());
                        mMessagesAdapter.notifyDataSetChanged();
                    }
                });

                mCurrentChannel.setListener(mChannelListener);
            }

            @Override
            public void onError(ErrorInfo errorInfo) {
                Log.e(TAG, "Error joining channel: " + errorInfo.getErrorText());
            }
        });
    }

    private void loadChannels() {
        mMessagingClient.getChannels().loadChannelsWithListener(
                new Constants.StatusListener() {
                    @Override
                    public void onSuccess() {
                        if (mMessagingClient.getChannels().getChannels().length < 1) {

                            // Create default channel
                            createChannel(DEFAULT_CHANNEL_NAME);
                        } else {
                            // Update channel list
                            Menu menu = mNavigationView.getMenu();
                            SubMenu topChannelMenu = menu.addSubMenu("Channels");
                            for (Channel channel : mMessagingClient.getChannels().getChannels()) {
                                topChannelMenu.add(channel.getFriendlyName());
                            }

                            // Join first channel from a list if current channel is not set
                            if (mCurrentChannel == null) {
                                joinChannel(mMessagingClient.getChannels().getChannels()[0]);
                            }
                        }
                    }
                });
    }

    public class SendMessageTask extends AsyncTask<Void, Void, Boolean> {

        private String mMessageBody;

        public SendMessageTask(String messageBody) {
            this.mMessageBody = messageBody;
        }

        protected Boolean doInBackground(Void... params) {
            // Find all VirgilCards for all chat members
            for (Member member : mCurrentChannel.getMembers().getMembers()) {

                String sid = member.getSid();
                if (mMembers.containsKey(sid)) {
                    continue;
                }

                String identity = member.getUserInfo().getIdentity();

                // Find Virgil Card for valid emails only
                if (CommonUtils.isNicknameValid(identity)) {

                    Log.d(TAG, "Looking for: " + identity);

                    SearchCriteria.Builder criteriaBuilder = new SearchCriteria.Builder();
                    criteriaBuilder.setValue(identity).setIncludeUnauthorized(true);
                    List<VirgilCard> cards = clientFactory.getPublicKeyClient().search(criteriaBuilder.build());

                    if (!cards.isEmpty()) {
                        VirgilCard card = cards.get(cards.size() - 1);

                        String cardId = card.getId();
                        PublicKey publicKey = new PublicKey(Base64.decode(card.getPublicKey().getKey()));

                        mMembers.put(sid, new ChatMember(cardId, publicKey));

                        Log.w(TAG, "Found card: " + cardId);
                    } else {
                        Log.w(TAG, "No cards for: " + identity);
                    }
                }
            }

            // Build recipients map
            Map<String, PublicKey> recipients = new HashMap<>();
            for (ChatMember member : mMembers.values()) {
                recipients.put(member.getCardId(), member.getPublicKey());
            }

            // Build message
            ChatMessage chatMessage = new ChatMessage();
            chatMessage.setBody(mMessageBody);
            chatMessage.setAuthor(mIdentity);
            chatMessage.setDate(new Date().getTime());
            chatMessage.setId(UUID.randomUUID().toString());


            mMessageBody = mGson.toJson(chatMessage);

            // Encode message body
            if (!recipients.isEmpty()) {
                try {
                    mMessageBody = CryptoHelper.encrypt(mMessageBody, recipients);
                } catch (Exception e) {
                    // TODO: show error message
                }
            }

            // If message was not encrypted, sent it as is (unencrypted)
            Message message = mCurrentChannel.getMessages().createMessage(mMessageBody);
            Log.d(TAG, "Message created");
            mCurrentChannel.getMessages().sendMessage(message, new Constants.StatusListener() {
                @Override
                public void onSuccess() {
                    MainActivity.this.runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            // need to modify user interface elements on the UI thread
                            mWriteMessageEditText.setText("");
                        }
                    });
                }

                @Override
                public void onError(ErrorInfo errorInfo) {
                    Log.e(TAG, "Error sending message: " + errorInfo.getErrorText());
                }
            });


            return null;
        }

        @Override
        protected void onPostExecute(Boolean aBoolean) {
            super.onPostExecute(aBoolean);
        }
    }

    private void retrieveAccessTokenFromServer(String twilioToken) {
        mAccessManager = TwilioAccessManagerFactory.createAccessManager(twilioToken,
                mAccessManagerListener);

        TwilioIPMessagingClient.Properties props =
                new TwilioIPMessagingClient.Properties(
                        TwilioIPMessagingClient.SynchronizationStrategy.ALL, 500);

        mMessagingClient = TwilioIPMessagingSDK.createClient(mAccessManager, props,
                mMessagingClientCallback);

        loadChannels();

        mMessagingClient.setListener(new IPMessagingClientListener() {
            @Override
            public void onChannelAdd(Channel channel) {
                Log.d(TAG, "Channel added: " + channel.getFriendlyName());
                addChannel(channel);
            }

            @Override
            public void onChannelChange(Channel channel) {
                Log.d(TAG, "Channel changed: " + channel.getFriendlyName());
                // TODO: update channel menu
            }

            @Override
            public void onChannelDelete(Channel channel) {
                Log.d(TAG, "Channel deleted: " + channel.getFriendlyName());
                removeChannel(channel);
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

            }
        });
    }

    private TwilioAccessManagerListener mAccessManagerListener = new TwilioAccessManagerListener() {
        @Override
        public void onTokenExpired(TwilioAccessManager twilioAccessManager) {
            Log.d(TAG, "Access token has expired");
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

    private Constants.CallbackListener<TwilioIPMessagingClient> mMessagingClientCallback =
            new Constants.CallbackListener<TwilioIPMessagingClient>() {
                @Override
                public void onSuccess(TwilioIPMessagingClient twilioIPMessagingClient) {
                    Log.d(TAG, "Success creating Twilio IP Messaging Client");
                }
            };

    private ChannelListener mChannelListener = new ChannelListener() {
        @Override
        public void onMessageAdd(final Message message) {
            Log.d(TAG, "Message added");
            MainActivity.this.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    // need to modify user interface elements on the UI thread
                    mMessages.add(message);
                    mMessagesAdapter.notifyDataSetChanged();
                }
            });

        }

        @Override
        public void onMessageChange(Message message) {
            Log.d(TAG, "Message changed: " + message.getMessageBody());
        }

        @Override
        public void onMessageDelete(Message message) {
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
    };

}
