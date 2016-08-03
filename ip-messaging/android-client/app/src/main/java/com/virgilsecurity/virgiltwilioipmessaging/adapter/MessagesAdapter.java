package com.virgilsecurity.virgiltwilioipmessaging.adapter;

import android.support.v7.widget.RecyclerView;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.ViewGroup;
import android.widget.RelativeLayout;
import android.widget.TextView;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.twilio.ipmessaging.Message;
import com.virgilsecurity.sdk.crypto.CryptoHelper;
import com.virgilsecurity.sdk.crypto.PrivateKey;
import com.virgilsecurity.virgiltwilioipmessaging.R;
import com.virgilsecurity.virgiltwilioipmessaging.model.ChatMessage;

import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;

public class MessagesAdapter extends RecyclerView.Adapter<MessagesAdapter.ViewHolder> {

    private static final String TAG = "MessagesAdapter";
    private String mCardId;

    private PrivateKey mPrivateKey;

    private Gson mGson = new GsonBuilder().create();
    private DateFormat mDateFormat = new SimpleDateFormat("HH:mm:ss");

    private ArrayList<Message> mMessages;

    class ViewHolder extends RecyclerView.ViewHolder {

        public TextView mAuthorTextView;
        public TextView mDateTextView;
        public TextView mMessageTextView;

        public ViewHolder(RelativeLayout layout) {
            super(layout);
        }
    }

    public MessagesAdapter(ArrayList<Message> messages, String cardId, PrivateKey privateKey) {
        mMessages = messages;
        mCardId = cardId;
        mPrivateKey = privateKey;
    }

    public MessagesAdapter
            .ViewHolder onCreateViewHolder(ViewGroup parent,
                                           int viewType) {

        LayoutInflater inflater = LayoutInflater.from(parent.getContext());
        RelativeLayout layout = (RelativeLayout) inflater.inflate(R.layout.chat_message, parent, false);

        ViewHolder viewHolder = new ViewHolder(layout);
        viewHolder.mAuthorTextView = (TextView) layout.findViewById(R.id.author);
        viewHolder.mDateTextView = (TextView) layout.findViewById(R.id.date);
        viewHolder.mMessageTextView = (TextView) layout.findViewById(R.id.message);

        return viewHolder;
    }

    @Override
    public void onBindViewHolder(ViewHolder holder, int position) {
        Message message = mMessages.get(position);
        String messageBody = message.getMessageBody();

        ChatMessage chatMessage = null;
        try {
            messageBody = CryptoHelper.decrypt(messageBody, mCardId, mPrivateKey);
            chatMessage = mGson.fromJson(messageBody, ChatMessage.class);
        } catch (Exception e) {
            Log.e(TAG, "Can't decrypt message", e);
        }
        holder.mAuthorTextView.setText(message.getAuthor());

        if (chatMessage != null) {
            holder.mDateTextView.setText(mDateFormat.format(new Date(chatMessage.getDate())));
            holder.mMessageTextView.setText(chatMessage.getBody());
        } else {
            holder.mDateTextView.setText(message.getTimeStamp());
            holder.mMessageTextView.setText("Message couldn't be decrypted");
        }
    }

    @Override
    public int getItemCount() {
        return mMessages.size();
    }
}
