package com.virgilsecurity.virgiltwilioipmessaging;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.annotation.TargetApi;
import android.content.Intent;
import android.os.AsyncTask;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.support.v7.app.AppCompatActivity;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.Button;
import android.widget.EditText;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.virgilsecurity.sdk.client.ClientFactory;
import com.virgilsecurity.sdk.client.model.IdentityType;
import com.virgilsecurity.sdk.client.model.identity.ValidatedIdentity;
import com.virgilsecurity.sdk.client.model.privatekey.PrivateKeyInfo;
import com.virgilsecurity.sdk.client.model.publickey.SearchCriteria;
import com.virgilsecurity.sdk.client.model.publickey.VirgilCard;
import com.virgilsecurity.sdk.client.model.publickey.VirgilCardTemplate;
import com.virgilsecurity.sdk.crypto.Base64;
import com.virgilsecurity.sdk.crypto.KeyPair;
import com.virgilsecurity.sdk.crypto.KeyPairGenerator;
import com.virgilsecurity.sdk.crypto.PrivateKey;
import com.virgilsecurity.sdk.crypto.PublicKey;
import com.virgilsecurity.virgiltwilioipmessaging.http.IPMessagingService;
import com.virgilsecurity.virgiltwilioipmessaging.http.IPMessagingServiceException;
import com.virgilsecurity.virgiltwilioipmessaging.model.LoginRequest;
import com.virgilsecurity.virgiltwilioipmessaging.model.LoginResponse;
import com.virgilsecurity.virgiltwilioipmessaging.model.TwilioToken;
import com.virgilsecurity.virgiltwilioipmessaging.model.VirgilToken;
import com.virgilsecurity.virgiltwilioipmessaging.utils.CommonUtils;

import java.io.IOException;
import java.util.List;

import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

/**
 * A login screen that offers login via email/password.
 */
public class LoginActivity extends AppCompatActivity {

    private static final String TAG = "LoginActivity";

    /**
     * Keep track of the login task to ensure we can cancel it if requested.
     */
    private UserLoginTask mAuthTask = null;

    // UI references.
    private EditText mNicknameView;
    private View mProgressView;
    private View mLoginFormView;

    private IPMessagingService mService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        // Set up the login form.
        mNicknameView = (EditText) findViewById(R.id.nickname);

        Button mNicknameSignInButton = (Button) findViewById(R.id.nickname_sign_in_button);
        mNicknameSignInButton.setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View view) {
                attemptLogin();
            }
        });

        mLoginFormView = findViewById(R.id.login_form);
        mProgressView = findViewById(R.id.login_progress);

        Gson gson = new GsonBuilder().setDateFormat("yyyy-MM-dd'T'HH:mm:ss").create();
        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl("https://demo-ip-messaging.virgilsecurity.com/")
                .addConverterFactory(GsonConverterFactory.create(gson))
                .build();

        mService = retrofit.create(IPMessagingService.class);
    }

    /**
     * Attempts to sign in or register the account specified by the login form.
     * If there are form errors (invalid email, missing fields, etc.), the
     * errors are presented and no actual login attempt is made.
     */
    private void attemptLogin() {
        if (mAuthTask != null) {
            return;
        }

        // Reset errors.
        mNicknameView.setError(null);
        // Store values at the time of the login attempt.
        String email = mNicknameView.getText().toString();

        boolean cancel = false;
        View focusView = null;

        // Check for a valid email address.
        if (TextUtils.isEmpty(email)) {
            mNicknameView.setError(getString(R.string.error_field_required));
            focusView = mNicknameView;
            cancel = true;
        } else if (!CommonUtils.isNicknameValid(email)) {
            mNicknameView.setError(getString(R.string.error_invalid_nickname));
            focusView = mNicknameView;
            cancel = true;
        }

        if (cancel) {
            // There was an error; don't attempt login and focus the first
            // form field with an error.
            focusView.requestFocus();
        } else {
            // Show a progress spinner, and kick off a background task to
            // perform the user login attempt.
            showProgress(true);
            mAuthTask = new UserLoginTask(email);
            mAuthTask.execute((Void) null);
        }
    }

    /**
     * Shows the progress UI and hides the login form.
     */
    @TargetApi(Build.VERSION_CODES.HONEYCOMB_MR2)
    private void showProgress(final boolean show) {
        // On Honeycomb MR2 we have the ViewPropertyAnimator APIs, which allow
        // for very easy animations. If available, use these APIs to fade-in
        // the progress spinner.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.HONEYCOMB_MR2) {
            int shortAnimTime = getResources().getInteger(android.R.integer.config_shortAnimTime);

            mLoginFormView.setVisibility(show ? View.GONE : View.VISIBLE);
            mLoginFormView.animate().setDuration(shortAnimTime).alpha(
                    show ? 0 : 1).setListener(new AnimatorListenerAdapter() {
                @Override
                public void onAnimationEnd(Animator animation) {
                    mLoginFormView.setVisibility(show ? View.GONE : View.VISIBLE);
                }
            });

            mProgressView.setVisibility(show ? View.VISIBLE : View.GONE);
            mProgressView.animate().setDuration(shortAnimTime).alpha(
                    show ? 1 : 0).setListener(new AnimatorListenerAdapter() {
                @Override
                public void onAnimationEnd(Animator animation) {
                    mProgressView.setVisibility(show ? View.VISIBLE : View.GONE);
                }
            });
        } else {
            // The ViewPropertyAnimator APIs are not available, so simply show
            // and hide the relevant UI components.
            mProgressView.setVisibility(show ? View.VISIBLE : View.GONE);
            mLoginFormView.setVisibility(show ? View.GONE : View.VISIBLE);
        }
    }

    /**
     * Represents an asynchronous login/registration task used to authenticate
     * the user.
     */
    public class UserLoginTask extends AsyncTask<Void, Void, Boolean> {

        private final String mNickname;
        private String mCardId;
        private PublicKey mPublicKey = null;
        private PrivateKey mPrivateKey = null;

        private String mVirgilToken = null;

        private String mTwilioToken = null;

        UserLoginTask(String email) {
            mNickname = email;
        }

        @Override
        protected Boolean doInBackground(Void... params) {

            try {
                // Obtain Virgil token
                mVirgilToken = obtainVirgilToken().getVirgilToken();
                Log.d(TAG, "Virgil token: " + mVirgilToken);

                // Obtain Twilio token
                mTwilioToken = obtainTwilioToken().getTwilioToken();
                Log.d(TAG, "Twilio token: " + mTwilioToken);

                ClientFactory clientFactory = new ClientFactory(mVirgilToken);

                // Get Virgil Private Key service card
                SearchCriteria.Builder searchCriteriaBuilder = new SearchCriteria.Builder();
                searchCriteriaBuilder
                        .setType(IdentityType.APPLICATION)
                        .setValue("com.virgilsecurity.private-keys");
                VirgilCard serviceCard = clientFactory.getPublicKeyClient().search(searchCriteriaBuilder.build()).get(0);
                Log.d(TAG, "Service card: " + serviceCard.getId());

                // Find Public Key at Virgil Key service
                searchCriteriaBuilder = new SearchCriteria.Builder();
                searchCriteriaBuilder
                        .setType(ApplicationConstants.IDENTITY_TYPE)
                        .setValue(mNickname);

                List<VirgilCard> cards = clientFactory.getPublicKeyClient().search(searchCriteriaBuilder.build());
                Log.d(TAG, "Found " + cards.size() + " user's cards");

                LoginResponse loginResponse = null;
                if (cards.isEmpty()) {
                    // Register new user

                    // Generate new Key Pair
                    KeyPair keyPair = KeyPairGenerator.generate();
                    mPublicKey = keyPair.getPublic();
                    mPrivateKey = keyPair.getPrivate();

                    // Login Virgil IP Messaging service
                    loginResponse = login();

                    // Register new Virgil Card
                    ValidatedIdentity identity = new ValidatedIdentity(ApplicationConstants.IDENTITY_TYPE, mNickname);
                    identity.setToken(loginResponse.getValidationToken());

                    VirgilCardTemplate.Builder cardTemplateBuilder = new VirgilCardTemplate.Builder();
                    cardTemplateBuilder.addData("public_key_signature", loginResponse.getApplicationSign());
                    cardTemplateBuilder.setIdentity(identity);
                    cardTemplateBuilder.setPublicKey(mPublicKey);

                    VirgilCard registeredCard = clientFactory.getPublicKeyClient().createCard(cardTemplateBuilder.build(), mPrivateKey);
                    mCardId = registeredCard.getId();
                    Log.d(TAG, "New Virgil Card registered: " + mCardId);

                    // Save private key at Virgil Private Key service
                    clientFactory.getPrivateKeyClient(serviceCard).stash(mCardId, mPrivateKey);
                    Log.d(TAG, "Private key saved at Virgil Private Key store");
                } else {
                    VirgilCard card = cards.get(cards.size() - 1);
                    mCardId = card.getId();
                    Log.d(TAG, "User's Card: " + mCardId);

                    mPublicKey = new PublicKey(Base64.decode(card.getPublicKey().getKey()));
                    Log.d(TAG, "Public key is:" + mPublicKey.getAsString());

                    // Login Virgil IP Messaging service
                    loginResponse = login();
                    Log.d(TAG, "Logged in as: " + loginResponse.getIdentity());

                    // Load existing Private key
                    ValidatedIdentity identity = new ValidatedIdentity(ApplicationConstants.IDENTITY_TYPE, mNickname);
                    identity.setToken(loginResponse.getValidationToken());
                    PrivateKeyInfo privateKeyInfo = clientFactory.getPrivateKeyClient(serviceCard).get(card.getId(), identity);

                    mPrivateKey = new PrivateKey(Base64.decode(privateKeyInfo.getKey()));
                    Log.d(TAG, "Private key: " + mPrivateKey.getAsString());
                }
            }
            catch (Exception e) {
                Log.e(TAG, "Login failed", e);
                return false;
            }

            Log.d(TAG, "Login complete");

            return true;
        }

        @Override
        protected void onPostExecute(final Boolean success) {
            mAuthTask = null;
            showProgress(false);

            if (success) {
                Intent intent = new Intent(getBaseContext(), MainActivity.class);
                intent.putExtra(ApplicationConstants.Extra.IDENTITY, mNickname);
                intent.putExtra(ApplicationConstants.Extra.CARD_ID, mCardId);
                intent.putExtra(ApplicationConstants.Extra.PUBLIC_KEY, mPublicKey.getAsString());
                intent.putExtra(ApplicationConstants.Extra.PRIVATE_KEY, mPrivateKey.getAsString());
                intent.putExtra(ApplicationConstants.Extra.VIRGIL_TOKEN, mVirgilToken);
                intent.putExtra(ApplicationConstants.Extra.TWILIO_TOKEN, mTwilioToken);
                startActivity(intent);
                finish();
            } else {
                mNicknameView.setError(getString(R.string.error_invalid_nickname));
                mNicknameView.requestFocus();
            }
        }

        @Override
        protected void onCancelled() {
            mAuthTask = null;
            showProgress(false);
        }

        private VirgilToken obtainVirgilToken() {
            try {
                Response<VirgilToken> response = mService.getVirgilToken().execute();
                if (response.isSuccessful()) {
                    return response.body();
                } else {
                    throw new IPMessagingServiceException("Can't obtain Virgil token");
                }
            } catch (IOException e) {
                Log.e(LoginActivity.TAG, "Can't obtain Virgil token", e);
                throw new IPMessagingServiceException(e);
            }
        }

        private TwilioToken obtainTwilioToken() {
            try {
                String deviceId = Settings.Secure.getString(LoginActivity.this.getContentResolver(),
                        Settings.Secure.ANDROID_ID);
                Response<TwilioToken> response = mService.getTwilioToken(mNickname, deviceId).execute();
                if (response.isSuccessful()) {
                    return response.body();
                } else {
                    throw new IPMessagingServiceException("Can't obtain Twilio token");
                }
            } catch (IOException e) {
                Log.e(LoginActivity.TAG, "Can't obtain Twilio token", e);
                throw new IPMessagingServiceException(e);
            }
        }

        private LoginResponse login() {
            LoginRequest loginRequest = new LoginRequest(mNickname, mPublicKey.getAsString());
            try {
                Response<LoginResponse> response = mService.login(loginRequest).execute();
                if (response.isSuccessful()) {
                    return response.body();
                } else {
                    throw new IPMessagingServiceException("Can't login Virgil IP Messaging service");
                }
            } catch (IOException e) {
                Log.e(LoginActivity.TAG, "Can't login Virgil IP Messaging service", e);
                throw new IPMessagingServiceException(e);
            }
        }
    }

}

