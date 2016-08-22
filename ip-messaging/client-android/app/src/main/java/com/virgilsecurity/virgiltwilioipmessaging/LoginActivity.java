package com.virgilsecurity.virgiltwilioipmessaging;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.annotation.TargetApi;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.AsyncTask;
import android.os.Build;
import android.os.Bundle;
import android.preference.PreferenceManager;
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
import com.virgilsecurity.sdk.client.model.identity.ValidatedIdentity;
import com.virgilsecurity.sdk.client.model.publickey.SearchCriteria;
import com.virgilsecurity.sdk.client.model.publickey.VirgilCard;
import com.virgilsecurity.sdk.client.model.publickey.VirgilCardTemplate;
import com.virgilsecurity.sdk.crypto.KeyPair;
import com.virgilsecurity.sdk.crypto.KeyPairGenerator;
import com.virgilsecurity.sdk.crypto.PrivateKey;
import com.virgilsecurity.sdk.crypto.PublicKey;
import com.virgilsecurity.virgiltwilioipmessaging.exception.IPMessagingServiceException;
import com.virgilsecurity.virgiltwilioipmessaging.http.IPMessagingService;
import com.virgilsecurity.virgiltwilioipmessaging.model.LoginRequest;
import com.virgilsecurity.virgiltwilioipmessaging.model.LoginResponse;
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

    private String mSavedIdentity = null;
    private String mVirgilToken = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        PreferenceManager.setDefaultValues(this, R.xml.prefs, false);
        SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(this);

        mSavedIdentity = prefs.getString(ApplicationConstants.Prefs.IDENTITY, "");
        mVirgilToken = prefs.getString(ApplicationConstants.Prefs.VIRGIL_TOKEN, "");

        // Set up the login form.
        mNicknameView = (EditText) findViewById(R.id.nickname);
        mNicknameView.setText(mSavedIdentity);

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
                .baseUrl(ApplicationConstants.BASE_URL)
                .addConverterFactory(GsonConverterFactory.create(gson))
                .build();

        mService = retrofit.create(IPMessagingService.class);

        if (prefs.getBoolean(ApplicationConstants.Prefs.LOGGED_IN, false)) {
            openMainActivity();
        }
    }

    private void openMainActivity() {
        Intent intent = new Intent(getBaseContext(), MainActivity.class);
        startActivity(intent);
        finish();
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
        private String mErrorMessage = null;

        UserLoginTask(String email) {
            mNickname = email;
        }

        @Override
        protected Boolean doInBackground(Void... params) {
            try {
                if (mSavedIdentity.equals(mNickname)) {

                    // User already registered. Login with key stored at preferences
                    SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(LoginActivity.this);
                    login(prefs.getString(ApplicationConstants.Prefs.PUBLIC_KEY, ""));
                    prefs.edit()
                            .putBoolean(ApplicationConstants.Prefs.LOGGED_IN, true)
                            .commit();

                    return true;
                }

                // Try to register new identity
                ClientFactory clientFactory = new ClientFactory(mVirgilToken);

                // Find Public Key at Virgil Key service
                SearchCriteria.Builder searchCriteriaBuilder = new SearchCriteria.Builder();
                searchCriteriaBuilder
                        .setType(ApplicationConstants.IDENTITY_TYPE)
                        .setValue(mNickname);

                List<VirgilCard> cards = clientFactory.getPublicKeyClient().search(searchCriteriaBuilder.build());
                Log.d(TAG, "Found " + cards.size() + " user's cards");

                if (cards.isEmpty()) {
                    // Register new Virgil Card

                    // Generate new Key Pair
                    KeyPair keyPair = KeyPairGenerator.generate();
                    PublicKey publicKey = keyPair.getPublic();
                    PrivateKey privateKey = keyPair.getPrivate();

                    // Login Virgil IP Messaging service
                    LoginResponse loginResponse = login(publicKey.getAsString());

                    // Register new Virgil Card
                    ValidatedIdentity identity = new ValidatedIdentity(ApplicationConstants.IDENTITY_TYPE, mNickname);
                    identity.setToken(loginResponse.getValidationToken());

                    VirgilCardTemplate.Builder cardTemplateBuilder = new VirgilCardTemplate.Builder();
                    cardTemplateBuilder.addData("public_key_signature", loginResponse.getApplicationSign());
                    cardTemplateBuilder.setIdentity(identity);
                    cardTemplateBuilder.setPublicKey(publicKey);

                    VirgilCard registeredCard = clientFactory.getPublicKeyClient().createCard(cardTemplateBuilder.build(), privateKey);
                    String cardId = registeredCard.getId();
                    Log.d(TAG, "New Virgil Card registered: " + cardId);

                    // Save identity data for future usage
                    SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(LoginActivity.this);
                    prefs.edit().putString(ApplicationConstants.Prefs.IDENTITY, mNickname)
                            .putString(ApplicationConstants.Prefs.CARD_ID, cardId)
                            .putString(ApplicationConstants.Prefs.PUBLIC_KEY, publicKey.getAsString())
                            .putString(ApplicationConstants.Prefs.PRIVATE_KEY, privateKey.getAsString())
                            .putBoolean(ApplicationConstants.Prefs.LOGGED_IN, true)
                            .commit();
                } else {
                    // This user is already registered from other device
                    Log.d(TAG, "User is already registered from other device");
                    mErrorMessage = "User is already registered from other device";
                    return false;
                }
            } catch (Exception e) {
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
                openMainActivity();
            } else {
                mNicknameView.setError(mErrorMessage);
                mNicknameView.requestFocus();
            }
        }

        @Override
        protected void onCancelled() {
            mAuthTask = null;
            showProgress(false);
        }

        private LoginResponse login(String publicKey) {
            LoginRequest loginRequest = new LoginRequest(mNickname, publicKey);
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

