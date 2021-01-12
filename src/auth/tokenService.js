const jwt = require('jsonwebtoken');

const createToken = (user) => {
  return jwt.sign({ id: user.id }, 'temporary-secret');
};

module.exports = {
  createToken,
};
