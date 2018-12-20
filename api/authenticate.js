const { generateUserToken, pseudoEncodeToken } = require('./userValidation');

const authenticate = (req, res) => {
  if (!req.body || !req.body.identity) {
    res.statusMessage = 'You should specify identity in body';
    res.status(400).end();
    return;
  }
  const token = generateUserToken();

  pseudoEncodeToken(req.body.identity, token);

  res.json({ authToken: token });
}

module.exports = { authenticate };