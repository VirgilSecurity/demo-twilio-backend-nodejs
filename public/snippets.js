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

// This function makes authenticated request to GET /virgil-jwt endpoint
// The token serves to make authenticated requests to Virgil Cloud
async function getVirgilToken(authToken) {
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

// This function makes authenticated request to GET /twilio-jwt endpoint
// Returned token is used by twilio library
async function getTwilioToken(authToken) {
    const response = await fetch('http://localhost:3000/twilio-jwt', {
        headers: {
            Authorization: `Bearer ${authToken}`,
        }
    })
    if (!response.ok) {
        throw new Error(`Error code: ${response.status} \nMessage: ${response.statusText}`);
    }
    return response.json().then(data => data.twilioToken);
}

async function createChannel(twilioChat, name) {
    return await twilioChat.createChannel({
        uniqueName: name,
        friendlyName: name,
    });
}

async function joinChannel(twilioChat, name) {
    const channel = await getChannel(twilioChat, name);
    return channel.join();
}

async function getChannel(twilioChat, name) {
    const paginator = await twilioChat.getPublicChannelDescriptors();
    for (i = 0; i < paginator.items.length; i++) {
        const channelDescriptor = paginator.items[i];
        if (channelDescriptor.uniqueName === name) {
            const channel = await channelDescriptor.getChannel();
            return channel;
        }
    }
    return null;
}

async function decryptMessage(e3kit, message) {
    const authorPublicKey = await e3kit.lookupPublicKeys(message.author);
    return await e3kit.decrypt(message.body, authorPublicKey);
}

async function sendMessage(e3kit, channel, message) {
    const membersIdentities = await channel.getMembers().then(members => members.map(member => member.identity));
    const publicKeys = await e3kit.lookupPublicKeys(membersIdentities);
    const encryptedMessage = await e3kit.encrypt(message, publicKeys);
    return channel.sendMessage(encryptedMessage);
}
