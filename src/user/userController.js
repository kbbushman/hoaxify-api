const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('./User');
const emailService = require('../email/emailService');
const sequelize = require('../config/database');
const EmailException = require('../email/EmailException');

const generateToken = (length) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

const create = async (req, res) => {
  const { username, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const user = {
    username,
    email,
    password: hash,
    activationToken: generateToken(16),
  };

  const transaction = await sequelize.transaction();

  try {
    await User.create(user, { transaction });
    await emailService.sendAccountActivation(email, user.activationToken);
    await transaction.commit();
    return res.send({ message: req.t('user_create_success') });
  } catch (err) {
    transaction.rollback();
    const { message } = new EmailException();
    return res.status(502).send({ message: req.t(message) });
  }
};

const activate = async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({ where: { activationToken: token } });
  user.inactive = false;
  await user.save();
  return res.sendStatus(200);
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

module.exports = {
  create,
  activate,
  findByEmail,
};
