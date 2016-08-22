package com.virgilsecurity.virgiltwilioipmessaging;

import android.content.Context;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.preference.PreferenceManager;
import android.provider.Settings;
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
import android.view.inputmethod.InputMethodManager;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.ListAdapter;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.virgilsecurity.sdk.client.utils.StringUtils;
import com.virgilsecurity.sdk.crypto.PrivateKey;
import com.virgilsecurity.virgiltwilioipmessaging.adapter.MessagesAdapter;
import com.virgilsecurity.virgiltwilioipmessaging.exception.ChannelNotFoundException;
import com.virgilsecurity.virgiltwilioipmessaging.exception.IPMessagingServiceException;
import com.virgilsecurity.virgiltwilioipmessaging.http.IPMessagingService;
import com.virgilsecurity.virgiltwilioipmessaging.model.TwilioToken;
import com.virgilsecurity.virgiltwilioipmessaging.model.channel.ChannelMessage;
import com.virgilsecurity.virgiltwilioipmessaging.twilio.DummyMessageProcessor;
import com.virgilsecurity.virgiltwilioipmessaging.twilio.TwilioFacade;
import com.virgilsecurity.virgiltwilioipmessaging.twilio.VirgilMessageProcessor;
import com.virgilsecurity.virgiltwilioipmessaging.utils.ChannelMessageStorage;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class MainActivity extends AppCompatActivity {

    final static String TAG = "MainActivity";

    private RecyclerView mMessagesRecyclerView;
    private MessagesAdapter mMessagesAdapter;
    private ChannelMessageStorage mMessages;

    private Toolbar mToolbar;
    private EditText mWriteMessageEditText;
    private ImageButton mSendChatMessageButton;
    private NavigationView mNavigationView;

    private TwilioFacade twilioFacade;

    private String mIdentity;
    private Gson mGson = new GsonBuilder().create();

    private ArrayList<String> mChannels;
    private ArrayAdapter mChannelsAdapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_main);
        setTitle(R.string.loading);

        // Configure UI
        mToolbar = (Toolbar) findViewById(R.id.toolbar);
        setSupportActionBar(mToolbar);

        if (savedInstanceState != null) {
            mChannels = savedInstanceState.getStringArrayList(ApplicationConstants.State.CHANNELS);
            mMessages = (ChannelMessageStorage) savedInstanceState.getSerializable(ApplicationConstants.State.MESSAGES);
            twilioFacade = (TwilioFacade) getLastCustomNonConfigurationInstance();

            showActiveChannel(twilioFacade.getActiveChannelName(), 1);
        } else {
            mChannels = new ArrayList<>();
            mMessages = new ChannelMessageStorage();
        }

        // Load current user card preferences
        SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(this);

        String accessToken = prefs.getString(ApplicationConstants.Prefs.VIRGIL_TOKEN, "");
        mIdentity = prefs.getString(ApplicationConstants.Prefs.IDENTITY, "");
        String cardId = prefs.getString(ApplicationConstants.Prefs.CARD_ID, "");
        PrivateKey privateKey = new PrivateKey(prefs.getString(ApplicationConstants.Prefs.PRIVATE_KEY, ""));

        // Configure messages view
        mMessagesAdapter = new MessagesAdapter(mMessages);

        mMessagesRecyclerView = (RecyclerView) findViewById(R.id.messagesRecyclerView);
        LinearLayoutManager layoutManager = new LinearLayoutManager(this);

        // for a chat app, show latest at the bottom
        layoutManager.setStackFromEnd(true);
        mMessagesRecyclerView.setLayoutManager(layoutManager);
        mMessagesRecyclerView.setAdapter(mMessagesAdapter);

        mWriteMessageEditText = (EditText) findViewById(R.id.writeMessageEditText);
        mSendChatMessageButton = (ImageButton) findViewById(R.id.sendChatMessageButton);
        mSendChatMessageButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                String messageBody = mWriteMessageEditText.getText().toString();
                mWriteMessageEditText.setText("");

                // Hide keyboard
                InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                imm.hideSoftInputFromWindow(view.getWindowToken(), 0);

                sendMessage(messageBody);
            }
        });

        DrawerLayout drawer = (DrawerLayout) findViewById(R.id.drawer_layout);
        ActionBarDrawerToggle toggle = new ActionBarDrawerToggle(
                this, drawer, mToolbar, R.string.navigation_drawer_open, R.string.navigation_drawer_close);
        drawer.setDrawerListener(toggle);
        toggle.syncState();

        mNavigationView = (NavigationView) findViewById(R.id.nav_view);

        TextView nicknameTV = (TextView) mNavigationView.findViewById(R.id.nickname);
        nicknameTV.setText(mIdentity);

        // channels list
        mChannelsAdapter = new ArrayAdapter<String>(this, android.R.layout.simple_list_item_1, mChannels);
        ListView channelsList = (ListView) mNavigationView.findViewById(R.id.channels_list);
        channelsList.setAdapter(mChannelsAdapter);
        channelsList.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            @Override
            public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
                try {
                    twilioFacade.joinChannel(mChannels.get(position));
                } catch (ChannelNotFoundException e) {
                    Toast.makeText(MainActivity.this, R.string.error_channel_not_found, Toast.LENGTH_LONG).show();
                }

                DrawerLayout drawer = (DrawerLayout) findViewById(R.id.drawer_layout);
                drawer.closeDrawer(GravityCompat.START);
            }
        });

        // Initialize chat
        if (twilioFacade == null) {
            twilioFacade = new TwilioFacade(new TwilioTokenProviderImpl(this), new VirgilMessageProcessor(cardId, privateKey, accessToken));
        }
        twilioFacade.setHandler(handler);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);

        outState.putStringArrayList(ApplicationConstants.State.CHANNELS, mChannels);
        outState.putSerializable(ApplicationConstants.State.MESSAGES, mMessages);
    }

    @Override
    public Object onRetainCustomNonConfigurationInstance() {
        return twilioFacade;
    }

    private void sendMessage(String messageBody) {
        if (!StringUtils.isBlank(messageBody)) {
            // Build message
            ChannelMessage message = new ChannelMessage();
            message.setBody(messageBody);
            message.setAuthor(mIdentity);
            message.setDate(new Date().getTime());
            message.setId(UUID.randomUUID().toString());

            showMessageAtChat(message);

            // Sent message with Twilio
            twilioFacade.sendMessage(mGson.toJson(message));
        }
    }

    private void showMessageAtChat(ChannelMessage message) {
        mMessages.addOrUpdate(message);
        mMessagesAdapter.notifyDataSetChanged();
        mMessagesRecyclerView.scrollToPosition(mMessages.size() - 1);
    }

    private void showActiveChannel(String channelName, int membersCount) {
        mToolbar.setTitle(channelName);
        mToolbar.setSubtitle(membersCount + " Members");
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
        if (id == R.id.action_remove_channel) {
            // Open remove channel dialog
            AlertDialog.Builder builder = new AlertDialog.Builder(this);
            builder.setTitle(R.string.dialog_remove_channel)
                    .setMessage(R.string.dialog_remove_channel_message)
                    .setPositiveButton(android.R.string.ok, new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface dialog, int id) {
                            twilioFacade.removeChannel(twilioFacade.getActiveChannelName());
                        }
                    })
                    .setNegativeButton(android.R.string.cancel, new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface dialog, int id) {
                            // User cancelled the dialog
                        }
                    });
            builder.create().show();
        } else if (id == R.id.action_create_channel) {
            // Open create channel dialog
            final EditText input = new EditText(this);
            AlertDialog.Builder builder = new AlertDialog.Builder(this);
            builder.setTitle(R.string.dialog_create_channel)
                    .setView(input)
                    .setPositiveButton(android.R.string.ok, new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface dialog, int id) {
                            String channelName = input.getText().toString();
                            twilioFacade.createChannel(channelName);
                        }
                    })
                    .setNegativeButton(android.R.string.cancel, new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface dialog, int id) {
                            // User cancelled the dialog
                        }
                    });
            builder.create().show();
        } else if (id == R.id.action_close) {
            close();
            return true;
        }

        return super.onOptionsItemSelected(item);
    }

    private void logout() {
        SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(this);
        prefs.edit().putBoolean(ApplicationConstants.Prefs.LOGGED_IN, false)
                .commit();
    }

    private void close() {
        logout();
        finish();
    }

    private Handler handler = new Handler() {

        @Override
        public void handleMessage(android.os.Message msg) {
            String event = msg.getData().getString(ApplicationConstants.Messages.EVENT);
            switch (event) {
                case ApplicationConstants.Messages.NEW_CHANNEL_EVENT:
                    String channelName = msg.getData().getString(ApplicationConstants.Messages.CHANNEL_NAME);
                    mChannels.add(channelName);
                    mChannelsAdapter.notifyDataSetChanged();
                    break;
                case ApplicationConstants.Messages.JOIN_CHANNEL_EVENT:
                    channelName = msg.getData().getString(ApplicationConstants.Messages.CHANNEL_NAME);
                    int membersCount = msg.getData().getInt(ApplicationConstants.Messages.CHANNEL_MEMBERS_COUNT);

                    showActiveChannel(channelName, membersCount);
                    mMessages.clear();
                    mMessagesAdapter.notifyDataSetChanged();
                    break;
                case ApplicationConstants.Messages.UPDATE_CHANNELS_EVENT:
                    mChannels.clear();
                    List<String> channelNames = msg.getData().getStringArrayList(ApplicationConstants.Messages.CHANNEL_NAMES);
                    for (String name : channelNames) {
                        mChannels.add(name);
                    }
                    mChannelsAdapter.notifyDataSetChanged();
                    break;
                case ApplicationConstants.Messages.REMOVE_CHANNEL_EVENT:
                    channelName = msg.getData().getString(ApplicationConstants.Messages.CHANNEL_NAME);
                    mChannels.remove(channelName);
                    mChannelsAdapter.notifyDataSetChanged();
                    break;
                case ApplicationConstants.Messages.ADD_MESSAGE_EVENT:
                    ChannelMessage channelMessage = mGson.fromJson(msg.getData().getString(ApplicationConstants.Messages.DECRYPTED_MESSAGE), ChannelMessage.class);
                    showMessageAtChat(channelMessage);
                    break;
            }
        }
    };

    private class TwilioTokenProviderImpl implements TwilioFacade.TwilioTokenProvider {

        private Context mContext;
        private IPMessagingService mService;

        public TwilioTokenProviderImpl(Context context) {
            this.mContext = context;

            Gson gson = new GsonBuilder().setDateFormat("yyyy-MM-dd'T'HH:mm:ss").create();
            Retrofit retrofit = new Retrofit.Builder()
                    .baseUrl(ApplicationConstants.BASE_URL)
                    .addConverterFactory(GsonConverterFactory.create(gson))
                    .build();

            mService = retrofit.create(IPMessagingService.class);
        }

        @Override
        public String getToken() {
            try {
                String deviceId = Settings.Secure.getString(mContext.getContentResolver(), Settings.Secure.ANDROID_ID);
                Response<TwilioToken> response = mService.getTwilioToken(mIdentity, deviceId).execute();
                if (response.isSuccessful()) {
                    String token = response.body().getTwilioToken();
                    Log.d(TAG, "Twilio token: " + token);
                    return token;
                } else {
                    throw new IPMessagingServiceException("Can't obtain Twilio token");
                }
            } catch (IOException e) {
                Log.e(TAG, "Can't obtain Twilio token", e);
                throw new IPMessagingServiceException(e);
            }
        }
    }

}
