const jwt = require('jsonwebtoken');
const Token = require('./Token');
const { randomString } = require('../shared/generator');

const createToken = async (user) => {
  const token = randomString(32);
  await Token.create({
    token,
    userId: user.id,
  });
  return token;
};

const verify = (token) => {
  return jwt.verify(token, 'temporary-secret');
};

module.exports = {
  createToken,
  verify,
};
