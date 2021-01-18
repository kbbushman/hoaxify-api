const Sequelize = require('sequelize');
const Token = require('./Token');
const { randomString } = require('../shared/generator');

const createToken = async (user) => {
  const token = randomString(32);
  await Token.create({
    token,
    userId: user.id,
    lastUsedAt: new Date(),
  });
  return token;
};

const verify = async (token) => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const tokenInDB = await Token.findOne({
    where: {
      token,
      lastUsedAt: {
        [Sequelize.Op.gt]: oneWeekAgo,
      },
    },
  });
  tokenInDB.lastUsedAt = new Date();
  await tokenInDB.save();
  const userId = tokenInDB.userId;
  return { id: userId };
};

const deleteToken = async (token) => {
  await Token.destroy({ where: { token } });
};

const scheduleCleanup = async () => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await Token.destroy({
    where: {
      lastUsedAt: {
        [Sequelize.Op.lt]: oneWeekAgo,
      },
    },
  });
};

module.exports = {
  createToken,
  verify,
  deleteToken,
  scheduleCleanup,
};
