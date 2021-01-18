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

const verify = async (token) => {
  const tokenInDB = await Token.findOne({ where: { token } });
  const userId = tokenInDB.userId;
  return { id: userId };
};

const deleteToken = async (token) => {
  await Token.destroy({ where: { token } });
};

const deleteUserTokens = async (userId) => {
  await Token.destroy({ where: { userId } });
};

module.exports = {
  createToken,
  verify,
  deleteToken,
  deleteUserTokens,
};
