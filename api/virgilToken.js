const { JwtGenerator } = require('virgil-sdk');
const { VirgilCrypto, VirgilAccessTokenSigner } = require('virgil-crypto');
const config = require('./config');

const virgilCrypto = new VirgilCrypto();

const generator = new JwtGenerator({
  appId: config.virgil.appId,
  apiKeyId: config.virgil.apiKeyId,
  apiKey: virgilCrypto.importPrivateKey(config.virgil.apiPrivateKey),
  accessTokenSigner: new VirgilAccessTokenSigner(virgilCrypto)
});

const generateVirgilJwt = (req, res) => {
  const virgilJwtToken = generator.generateToken(req.user.identity);

  res.json({ virgilToken: virgilJwtToken.toString() });
}

module.exports = { generateVirgilJwt };