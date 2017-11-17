const request = require('superagent');
const url = require('url');
const virgil = require('virgil-sdk');

const getAbsoluteUrl = (path) => url.resolve(process.env.VIRGIL_AUTH_URI, path);

module.exports = function obtainAccessToken({ virgilCardId, privateKey }) {
	return request
		.post(getAbsoluteUrl('/v4/authorization-grant/actions/get-challenge-message'))
		.send({ resource_owner_virgil_card_id: virgilCardId })
		.then(res => {
			const { authorization_grant_id, encrypted_message } = res.body;
			return request.post(getAbsoluteUrl(`/v4/authorization-grant/${authorization_grant_id}/actions/acknowledge`))
				.send({ encrypted_message: reEncryptForAuth(encrypted_message, privateKey) })
				.then(res => res.body.code);
		})
		.then(grantCode => {
			return request.post(getAbsoluteUrl(`/v4/authorization/actions/obtain-access-token`))
				.send({ grant_type: 'access_code', code: grantCode })
				.then(res => res.body.access_token);
		})
		.catch(e => {
			console.log(`Failed to obtain access token`, e);
			throw new Error('Failed to obtain access token');
		});
};

function reEncryptForAuth(ciphertext, privateKey) {
	const decrypted = virgil.crypto.decrypt(ciphertext, privateKey);
	const authPublicKey = virgil.crypto.importPublicKey(process.env.VIRGIL_AUTH_PUBLIC_KEY);
	return virgil.crypto.encrypt(decrypted, authPublicKey).toString('base64');
}