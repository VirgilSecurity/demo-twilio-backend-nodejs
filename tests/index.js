require('dotenv').config();
const request = require('supertest');
const test = require('tape');
const createUser = require('./helpers/createUser');
const obtainAccessToken = require('./helpers/obtainAccessToken');
const deleteUser = require('./helpers/deleteUser');

const app = require('../app');
const api = request(app);

const USER_IDENTITY = 'twilio_chat_test_user';
let user;

const base64Decode = input => Buffer.from(input, 'base64').toString('utf8');

test('setup', t => {
	user = createUser(USER_IDENTITY);
	t.end();
});

test('two POST /users with same identity simultaneously', t => {
	const identity = Math.random().toString(36).substr(2, 8);
	const user1 = createUser(identity);
	const user2 = createUser(identity);

	Promise.all([
		api.post('/v1/users')
			.send({ csr: user1.csr }),
		api.post('/v1/users')
			.send({ csr: user2.csr })
	]).then((responses) => {
		const successResponse = responses.find(r => r.status === 200);
		const errorResponse = responses.find(r => r.status === 400);

		t.ok(successResponse, 'one of requests succeeded');
		t.ok(errorResponse, 'one of requests failed');

		t.ok(successResponse.body.virgil_card, 'virgil card published');
		t.equal(errorResponse.body.errorCode, 40003, 'failed with expected error');
		t.end();
	});
});

test('POST /users', t => {
	api.post('/v1/users')
		.send({ csr: user.csr })
		.expect(200)
		.expect(res => {
			const cardDto = res.body.virgil_card;
			const virgilCard = JSON.parse(base64Decode(cardDto));

			t.ok(virgilCard.id, 'Virgil Card has id');
			user.virgilCardId = virgilCard.id;

			t.ok(virgilCard.content_snapshot, 'Virgil Card has snapshot');
			t.ok(virgilCard.meta, 'Virgil Card has meta');
			t.ok(virgilCard.meta.signs, 'Virgil Card has signatures');
			const signatures = Object.keys(virgilCard.meta.signs);
			t.equals(signatures.length, 3, 'Virgil Card is signed by the App and Cards Service');


		})
		.end((err, res) => {
			if (err) {
				return t.end(err);
			}

			t.test('GET /tokens/twilio', st => {
				obtainAccessToken(user)
					.then(accessToken => {
						api.get('/v1/tokens/twilio')
							.set('Authorization', `Bearer ${accessToken}`)
							.expect(200)
							.expect(res => {
								st.ok(res.body.twilioToken, 'Twilio token received');
							})
							.end((err, res) => {
								if (err) {
									return st.end(err);
								}

								st.end();
							});
					}).catch(e => st.end(e));
			});

			t.end();
		});
});

test('POST /users with invalid CSR', t => {
	api.post('/v1/users')
		.send({ csr: 'invalid_csr' })
		.expect(400)
		.expect(res => {
			const error = res.body;
			t.equals(error.status, 400, 'Error has status');
			t.equals(error.errorCode, 40001, 'Error has error code');
			t.ok(error.message, 'Error has message');
		})
		.end((err, res) => {
			if (err) {
				return t.end(err);
			}

			t.end();
		});
});

test('POST /users without device id', t => {
	const csrWithoutDeviceId = 'eyJjb250ZW50X3NuYXBzaG90IjoiZXlKcFpHVnVkR2' +
		'wwZVNJNkltbGZaRzl1WDNSZmFHRjJaVjlrWlhacFkyVmZhV1FpTENKcFpHVnVkR2w' +
		'wZVY5MGVYQmxJam9pZFhObGNtNWhiV1VpTENKelkyOXdaU0k2SW1Gd2NHeHBZMkYw' +
		'YVc5dUlpd2ljSFZpYkdsalgydGxlU0k2SWsxRGIzZENVVmxFU3pKV2QwRjVSVUV2U' +
		'TBkMWJYcHRNR053SzJORGRXOWFPRGxZZHk5WVZHc3dSa3hqY1c5RFRsSlhWV3hCVn' +
		'pSSFUwdHJQU0o5IiwibWV0YSI6eyJzaWducyI6eyIyZjZmNzBjMDRjMzc3NWE3YTI' +
		'yZDkyYWI4ZTFjYjc0NjMzYmRjODM3ZTQ4NmFmNmIxOTFkYmZkNzA3MGRjMWNhIjoi' +
		'TUZFd0RRWUpZSVpJQVdVREJBSUNCUUFFUUtremZFQ0VUQlR4bXlBRGNYVzFKdC9kd' +
		'DB1Vks0dDZUUWZTbGcraTc0RFJjN1RlK3NrNkxsSFEwTWF4WlFoVTBTQUMzbjl6VG' +
		'NnNFFjNFJmZ3JDTEFJPSIsImRhNmIyNzM5ZjQ1MzkwNzg3NTFlMzNjMDZlNjlhMDB' +
		'iM2EwMWY0YWE0Mzg5NmI0MTM5MGY0MDZiMmFmZGY0ZjUiOiJNRkV3RFFZSllJWklB' +
		'V1VEQkFJQ0JRQUVRSGpWejJzanpwbTc4bHd0MUZ5bHdTejBlK2p6ZDJKc25lOG1Wd' +
		'UNNNzJMRjJhNDcxSkR4SEVkd2pIeVhHUmpYYW5MS0lOcFpJNkF3akNJM1VVS21uQU' +
		'k9In19fQ==';

	api.post('/v1/users')
		.send({ csr: csrWithoutDeviceId })
		.expect(400)
		.expect(res => {
			const error = res.body;
			t.equals(error.status, 400, 'Error has status');
			t.equals(error.errorCode, 40002, 'Error has error code');
			t.ok(error.message, 'Error has message');
		})
		.end((err, res) => {
			if (err) {
				return t.end(err);
			}

			t.end();
		});
});

test('POST /users with duplicate identity', t => {
	const duplicateUser = createUser(USER_IDENTITY);

	api.post('/v1/users')
		.send({ csr: duplicateUser.csr })
		.expect(400)
		.expect(res => {
			const error = res.body;
			t.equals(error.status, 400, 'Error has status');
			t.equals(error.errorCode, 40003, 'Error has error code');
			t.ok(error.message, 'Error has message');
		})
		.end((err, res) => {
			if (err) {
				return t.end(err);
			}

			t.end();
		});
});

test('GET /tokens/twilio without auth header', t => {
	api.get('/v1/tokens/twilio')
		.expect(401)
		.expect(res => {
			const error = res.body;
			t.equals(error.status, 401, 'Error has status');
			t.equals(error.errorCode, 40101, 'Error has error code');
			t.ok(error.message, 'Error has message');
		})
		.end((err, res) => {
			if (err) {
				return t.end(err);
			}

			t.end();
		});
});

test('GET /tokens/twilio with invalid token', t => {
	api.get('/v1/tokens/twilio')
		.set('Authorization', 'Bearer invalid_access_token')
		.expect(401)
		.expect(res => {
			const error = res.body;
			t.equals(error.status, 401, 'Error has status');
			t.equals(error.errorCode, 40102, 'Error has error code');
			t.ok(error.message, 'Error has message');
		})
		.end((err, res) => {
			if (err) {
				return t.end(err);
			}

			t.end();
		});
});

test('teardown', t => {
	if (!user.virgilCardId) {
		return t.end();
	}

	deleteUser(user)
		.then(() => t.end())
		.catch(e => t.end(e));
});