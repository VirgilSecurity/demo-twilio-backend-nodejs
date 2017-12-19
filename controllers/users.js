const virgil = require('virgil-sdk');
const queue = require('async/queue');
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

const publishQueue = queue(publish);

function publish(task, callback) {
	const cardRequest = task.cardRequest;

	checkIdentityUnique(cardRequest.identity)
		.then(isUnique => {
			if (!isUnique) {
				return callback(errors.INVALID_IDENTITY());
			}

			virgilClient.publishCard(signCardRequest(cardRequest))
				.then(card => {
					callback(null, serializeCard(card));
				})
				.catch(e => {
					logger.error('Failed to publish Virgil Card.', e);
					callback(errors.VIRGIL_CARDS_ERROR());
				});
		})
		.catch(e => {
			logger.error('Failed to search Virgil Card.', e);
			callback(errors.VIRGIL_CARDS_ERROR());
		});
}

function register(req, res, next) {
	const csr = req.body.csr;

	if (!csr) {
		return next(errors.MISSING_CSR());
	}

	let cardRequest;
	try {
		cardRequest = virgil.publishCardRequest.import(csr);
	} catch (e) {
		return next(errors.INVALID_CSR());
	}

	if (!(cardRequest.data && cardRequest.data.deviceId)) {
		return next(errors.MISSING_DEVICE_ID());
	}

	publishQueue.push({ cardRequest }, (err, result) => {
		if (err) {
			return next(err);
		}

		res.status(200).send(result);
	});
}

function serializeCard(card) {
	const str = JSON.stringify(card.export());
	const buf = Buffer.from(str);
	return { virgil_card: buf.toString('base64') };
}

function checkIdentityUnique(identity) {
	return virgilClient.searchCards(identity)
		.then(cards => cards.length === 0)
		.catch(e => {
			if (e instanceof TypeError) {
				// workaround the bug in virgil-sdk where it throws when
				// search returns null instead of an empty array.
				// Assume identity is unique in this case;
				return true;
			}
			return Promise.reject(e);
		});
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