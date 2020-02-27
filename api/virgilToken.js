const { JwtGenerator } = require('virgil-sdk');
const { initCrypto, VirgilCrypto, VirgilAccessTokenSigner } = require('virgil-crypto');
const config = require('./config');

async function getJwtGenerator() {
	await initCrypto();

	const virgilCrypto = new VirgilCrypto();

	return new JwtGenerator({
		appId: config.virgil.appId,
		apiKeyId: config.virgil.appKeyId,
		apiKey: virgilCrypto.importPrivateKey(config.virgil.appKey),
		accessTokenSigner: new VirgilAccessTokenSigner(virgilCrypto)
	});
}

const generatorPromise = getJwtGenerator();

const generateVirgilJwt = async (req, res) => {
	const generator = await generatorPromise;
  const virgilJwtToken = generator.generateToken(req.user.identity);

  res.json({ virgilToken: virgilJwtToken.toString() });
}

module.exports = { generateVirgilJwt };
