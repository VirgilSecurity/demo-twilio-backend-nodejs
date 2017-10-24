const request = require('superagent');
const url = require('url');
const config = require('../config');
const errors = require('./errors');
const logger = require('./logger');

module.exports = function makeAuthenticator() {
	return (req, res, next) => {
		const authHeader = req.get('Authorization');
		if (!authHeader) {
			next(errors.MISSING_AUTHORIZATION());
			return;
		}

		getCardIdForToken(authHeader.split(' ')[1])
			.then(userCardId => {
				if (userCardId) {
					req.userCardId = userCardId;
					next();
				} else {
					next(errors.INVALID_ACCESS_TOKEN());
				}
			})
			.catch(e => {
				logger.error('Failed to verify access token.', e);
				next(errors.VIRGIL_AUTH_ERROR());
			});
	};
};

function getCardIdForToken(token) {
	return request.post(
		url.resolve(
			config.virgil.authBaseUrl,
			'/v4/authorization/actions/verify'
		)
	)
	.send({ access_token: token })
	.then(res => res.body.resource_owner_virgil_card_id)
	.catch(err => {
		if (err.status === 400) {
			logger.info('Token verification failed.', err.response.text);
			return null;
		}
		throw err;
	});
}