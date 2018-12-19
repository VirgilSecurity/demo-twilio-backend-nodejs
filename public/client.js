// This function returns a token that will be used to authenticate requests
// to your backend.
// This is a simplified solution without any real protection, so here you need use your
// application authentication mechanism.
async function authenticate(identity) {
    const response = await fetch('http://localhost:3000/authenticate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            identity: identity
        })
    });
    if (!response.ok) {
        throw new Error(`Error code: ${response.status} \nMessage: ${response.statusText}`);
    }
    return response.json().then(data => data.authToken);
}

// Log in as `alice`
authenticate('alice').then(authToken => {
    showMessage('User with identity "alice" got authToken and start initializing e3kit');
    // E3kit will call this callback function and wait for the Promise resolve.
    // When it receives Virgil JWT it can do authorized requests to Virgil Cloud.
    // E3kit uses the identity encoded in the JWT as the current user's identity.
    E3kit.EThree.initialize(getVirgilToken)
        .then(e3kit => showMessage('e3kit ready for identity: ' + e3kit.identity));

    // This function makes authenticated request to GET /virgil-jwt endpoint
    // The token it returns serves to make authenticated requests to Virgil Cloud
    async function getVirgilToken() {
        const response = await fetch('http://localhost:3000/virgil-jwt', {
            headers: {
                // We use bearer authorization, but you can use any other mechanism.
                // The point is only, this endpoint should be protected.
                Authorization: `Bearer ${authToken}`,
            }
        })
        if (!response.ok) {
            throw new Error(`Error code: ${response.status} \nMessage: ${response.statusText}`);
        }

        // If request was successful we return Promise which will resolve with token string.
        return response.json().then(data => data.virgilToken);
    }
});

function showMessage(message) {
    const element = document.createElement("p");
    element.innerHTML = message;
    document.body.appendChild(element);
}