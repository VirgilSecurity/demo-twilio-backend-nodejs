const virgil = require('virgil-sdk');

const APP_ID = process.env.APP_CARD_ID;
const APP_PRIVATE_KEY = virgil.crypto.importPrivateKey(
	process.env.APP_PRIVATE_KEY,
	process.env.APP_PRIVATE_KEY_PASSWORD
);

module.exports = function deleteUser(user) {
	const request = virgil.revokeCardRequest(user.virgilCardId);
	const signer = virgil.requestSigner(virgil.crypto);
	signer.authoritySign(request, APP_ID, APP_PRIVATE_KEY);

	const client = virgil.client(
		process.env.VIRGIL_ACCESS_TOKEN,
		{
			cardsReadBaseUrl: process.env.VIRGIL_CARDS_READ_URI,
			cardsBaseUrl: process.env.VIRGIL_CARDS_URI
		}
	);

	return client.revokeCard(request);
};