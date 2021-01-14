const jwt = require('jsonwebtoken');

const createToken = (user) => {
  return jwt.sign({ id: user.id }, 'temporary-secret');
};

const verify = (token) => {
  return jwt.verify(token, 'temporary-secret');
};

module.exports = {
  createToken,
  verify,
};
