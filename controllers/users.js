const virgil = require('virgil-sdk');
const config = require('../config');
const errors = require('../services/errors');
const logger = require('../services/logger');

const virgilClient = virgil.client(
	config.virgil.accessToken,
	{
		cardsBaseUrl: config.virgil.cardsBaseUrl,
		cardsReadBaseUrl: config.virgil.cardsReadBaseUrl
	}
);

function register(req, res, next) {
	const csr = req.body.csr;

	if (!csr) {
		return next(errors.MISSING_CSR());
	}

	let cardRequest;
	try {
		cardRequest = virgil.publishCardRequest.import(csr);
	} catch (e) {
		logger.error('Failed to import card request.', e);
		return next(errors.INVALID_CSR());
	}

	if (!(cardRequest.data && cardRequest.data.deviceId)) {
		return next(errors.MISSING_DEVICE_ID());
	}

	checkIdentityUnique(cardRequest.identity)
		.then(isUnique => {
			if (!isUnique) {
				return next(errors.INVALID_IDENTITY());
			}

			virgilClient.publishCard(signCardRequest(cardRequest))
				.then(card => {
					res.status(200).send(card.export());
				})
				.catch(e => {
					logger.error('Failed to publish Virgil Card.', e);
					next(errors.VIRGIL_CARDS_ERROR(e.toString()));
				});
		})
		.catch(e => {
			logger.error('Failed to search Virgil Card.', e);
			next(errors.VIRGIL_CARDS_ERROR(e.toString()));
		});
}

function checkIdentityUnique(identity) {
	return virgilClient.searchCards(identity)
		.then(cards => cards.length === 0);
}

function signCardRequest(cardRequest) {
	const appKey = virgil.crypto.importPrivateKey(
		config.app.privateKeyData,
		config.app.privateKeyPassword
	);
	const signer = virgil.requestSigner(virgil.crypto);
	signer.authoritySign(cardRequest, config.app.cardId, appKey);
	return cardRequest;
}

module.exports = {
	register
};