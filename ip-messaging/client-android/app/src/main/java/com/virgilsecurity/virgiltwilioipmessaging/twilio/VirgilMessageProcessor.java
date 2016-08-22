package com.virgilsecurity.virgiltwilioipmessaging.twilio;

import android.util.Log;

import com.virgilsecurity.sdk.client.ClientFactory;
import com.virgilsecurity.sdk.client.model.publickey.SearchCriteria;
import com.virgilsecurity.sdk.client.model.publickey.VirgilCard;
import com.virgilsecurity.sdk.crypto.Base64;
import com.virgilsecurity.sdk.crypto.CryptoHelper;
import com.virgilsecurity.sdk.crypto.PrivateKey;
import com.virgilsecurity.sdk.crypto.PublicKey;
import com.virgilsecurity.virgiltwilioipmessaging.exception.RecipientNotFoundException;
import com.virgilsecurity.virgiltwilioipmessaging.model.channel.MessageRecipient;
import com.virgilsecurity.virgiltwilioipmessaging.utils.CommonUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class VirgilMessageProcessor implements MessageProcessor {

    final static String TAG = "VirgilMessageProcessor";

    private Map<String, MessageRecipient> mRecipients;

    private ClientFactory clientFactory;
    private PrivateKey mPrivateKey;
    private String mCardId;

    public VirgilMessageProcessor(String cardId, PrivateKey privateKey, String accessToken) {
        mRecipients = new HashMap<>();

        this.mCardId = cardId;
        this.mPrivateKey = privateKey;

        this.clientFactory = new ClientFactory(accessToken);
    }

    @Override
    public void encodeMessage(final String message, final List<String> recipients, final MessageProcessingListener listener) {
        Thread background = new Thread(new Runnable() {

            @Override
            public void run() {
                String encryptedMessage = "";
                Map<String, PublicKey> recipientsMap = new HashMap<>();
                for (String identity : recipients) {
                    try {
                        MessageRecipient recipient = getRecipient(identity);
                        recipientsMap.put(recipient.getCardId(), recipient.getPublicKey());
                    }
                    catch (RecipientNotFoundException e) {
                        Log.e(TAG, "Recipient not found: " + identity);
                    }
                    // Encode message body
                    if (!recipientsMap.isEmpty()) {
                        try {
                            encryptedMessage = CryptoHelper.encrypt(message, recipientsMap);
                        } catch (Exception e) {
                            Log.e(TAG, "Can't encrypt message");
                        }
                    }
                }
                listener.onSuccess(encryptedMessage);
            }
        });
        background.start();
    }

    @Override
    public void decodeMessage(final String message, final MessageProcessingListener listener) {
        Thread background = new Thread(new Runnable() {

            @Override
            public void run() {
                String decodedMessage = "";
                try {
                    decodedMessage = CryptoHelper.decrypt(message, mCardId, mPrivateKey);
                } catch (Exception e) {
                    Log.e(TAG, "Can't decrypt message");
                }
                listener.onSuccess(decodedMessage);
            }
        });
        background.start();
    }

    /**
     * Get recipient by nickname.
     *
     * @param identity The recipient's identity.
     * @return
     * @throws RecipientNotFoundException if identity not found
     */
    private MessageRecipient getRecipient(String identity) {
        MessageRecipient recipient = mRecipients.get(identity);

        if (recipient == null) {
            // Find Virgil Card for valid nicknames only
            if (CommonUtils.isNicknameValid(identity)) {

                Log.d(TAG, "Looking for: " + identity);

                SearchCriteria.Builder criteriaBuilder = new SearchCriteria.Builder();
                criteriaBuilder.setValue(identity).setIncludeUnauthorized(true);
                List<VirgilCard> cards = clientFactory.getPublicKeyClient().search(criteriaBuilder.build());

                if (!cards.isEmpty()) {
                    VirgilCard card = cards.get(cards.size() - 1);

                    String cardId = card.getId();
                    PublicKey publicKey = new PublicKey(Base64.decode(card.getPublicKey().getKey()));

                    recipient = new MessageRecipient(cardId, publicKey);

                    mRecipients.put(identity, recipient);

                    Log.w(TAG, "Found card: " + cardId);
                } else {
                    Log.w(TAG, "No cards for: " + identity);
                }
            }

            // If member not found, throw an exception
            if (recipient == null) {
                throw new RecipientNotFoundException();
            }
        }

        return recipient;
    }
}
