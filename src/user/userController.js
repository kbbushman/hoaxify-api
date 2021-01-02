const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('./User');
const emailService = require('../email/emailService');

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

  try {
    await User.create(user);
    await emailService.sendAccountActivation(email, user.activationToken);
    return res.send({ message: req.t('user_create_success') });
  } catch (err) {
    return res.status(502).send({ message: req.t('email_failure') });
  }
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

module.exports = {
  create,
  findByEmail,
};
