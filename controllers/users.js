const virgil = require('virgil-sdk');
const config = require('../config');
const errors = require('../services/errors');
const logger = require('../services/logger');
const cache = require('../services/cache');

const virgilClient = virgil.client(
	config.virgil.accessToken,
	{
		cardsBaseUrl: config.virgil.cardsBaseUrl,
		cardsReadBaseUrl: config.virgil.cardsReadBaseUrl
	}
);

module.exports = {
	register
};

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

	publish(cardRequest)
		.then(result => res.status(200).send(result))
		.catch(err => next(err));
}

function publish(cardRequest) {
	return withLock(cardRequest.identity, lockTaken => {
		if (!lockTaken) {
			return Promise.reject(errors.INVALID_IDENTITY());
		}

		return checkIdentityUnique(cardRequest.identity)
			.then(isUnique => {
				if (!isUnique) {
					return Promise.reject(errors.INVALID_IDENTITY());
				}

				return virgilClient.publishCard(signCardRequest(cardRequest))
					.then(serializeCard);
			})
			.catch(e => {
				if (e instanceof errors.ApiError) {
					return Promise.reject(e);
				}

				logger.error('Unexpected error Virgil Cards error', e);
				return Promise.reject(errors.VIRGIL_CARDS_ERROR());
			});
	});
}

function withLock(identity, fn) {
	function cleanup() {
		unlockIdentity(identity)
			.catch(e => {
				logger.error('Failed to release identity lock', e);
			});
	}

	return lockIdentity(identity)
		.then(lockTaken => {
			return Promise.resolve(fn(lockTaken));
		})
		.then(res => {
			cleanup();
			return res;
		})
		.catch(err => {
			cleanup();
			return Promise.reject(err);
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

function lockIdentity(identity) {
	return new Promise((resolve, reject) => {
		cache.add(identity, 1, 10, (err, res) => {
			if (err) {
				if (err.notStored) {
					return resolve(false);
				}
				reject(err);
			}
			resolve(true);
		});
	});
}

function unlockIdentity(identity) {
	return new Promise((resolve, reject) => {
		cache.del(identity, (err, res) => {
			if (err) {
				return reject(new Error(err));
			}

			resolve(res);
		})
	})
}