loginOrRegister()
    .then(firstUserData => joinOrCreateChannel(firstUserData))
    .then(firstUserData => subscribeOnMessage(firstUserData))
    .then(secondUserData => loginOrRegister(secondUserData.identity)
    .then(secondUserData => joinOrCreateChannel(secondUserData))
    .then(secondUserData => send(secondUserData)));

function loginOrRegister(prevIdentity) {
    let promptMessage = `type identity of the ${prevIdentity ? 'second' : 'first'} user`;
    const identity = prompt(promptMessage).trim().toLowerCase();
    if (prevIdentity === identity) {
        return loginOrRegister('identity shouldn\'t be the same!');
    }
    return authenticate(identity).then(authToken => Promise.all([
        E3kit.EThree.initialize(() => getVirgilToken(authToken)),
        getTwilioToken(authToken).then(twilioToken => Twilio.Chat.Client.create(twilioToken))
    ]))
    .then(([e3kit, twilioChat]) => {
        return e3kit.register()
            .then(() => {
                displayMessage('register', identity);
            })
            .catch(e => {
                if (e.name === 'IdentityAlreadyExistsError') {
                    displayMessage('login', `${identity} is already registered`);
                } else {
                    console.log('oops, unexpected error:');
                    console.error(e);
                    return e3kit.rotatePrivateKey();
                }
            }).then(() => ({ identity, e3kit, twilioChat }))
    });
}

function joinOrCreateChannel({ identity, e3kit, twilioChat }) {
    return getChannel(twilioChat, 'general').then((channel) => {
        if (channel) {
            return joinChannel(twilioChat, 'general').catch(() => {
                displayMessage(identity, 'user already in channel');
                return channel;
            });
        } else {
            displayMessage('creating channel');
            return createChannel(twilioChat, 'general');
        }
    }).then(channel => {
        displayMessage(identity, 'joined to channel');
        return { identity, e3kit, twilioChat, channel };
    });
}

function subscribeOnMessage({ channel, identity, e3kit, twilioChat }) {
    channel.on('messageAdded', async message => {
        displayMessage('encrypted message received', message.body);
        try {
            let decryptedMessage = await decryptMessage(e3kit, message);
            displayMessage(`${identity} decrypts message`, decryptedMessage)
        } catch (error) {
            console.log(error);
            displayMessage('decryption error', error)
        }
    });
    return { identity, e3kit, twilioChat };
}

function send({ identity, channel, e3kit }) {
    const message = prompt('type message here');
    displayMessage(identity + ' sends message', message);
    return sendMessage(e3kit, channel, message);
}

function displayMessage(header, text) {
    const p = document.createElement('p');
    const author = document.createElement('b');
    author.innerText = header + ': ';
    const body = document.createTextNode(text);
    p.appendChild(author);
    if (text) p.appendChild(body);
    document.body.appendChild(p);
}
