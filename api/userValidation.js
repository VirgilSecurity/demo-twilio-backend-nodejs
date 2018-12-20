const crypto = require('crypto');

const usersStorage = new Map();

const generateUserToken = () => crypto.randomBytes(32).toString('base64');
const pseudoEncodeToken = (identity, token) => usersStorage.set(token, identity);
const pseudoDecodeToken = (token) => usersStorage.get(token);
const pseudoVerifyToken = (token) => usersStorage.has(token);

const requireAuthHeader = (req, res, next) => {
  // 'Check if request is authorized with token from POST /authorize'
  if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer '))) {
    res.statusMessage = "No Authorization header";
    res.status(401).send('Unauthorized');
    return;
  }

  const userToken = req.headers.authorization.split('Bearer ')[1];

  if (!pseudoVerifyToken(userToken)) res.status(401).send('Unauthorized');

  req.user = { identity: pseudoDecodeToken(userToken) };
  next();
}

module.exports = {
  generateUserToken,
  pseudoEncodeToken,
  pseudoDecodeToken,
  pseudoVerifyToken,
  requireAuthHeader,
}