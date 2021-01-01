const crypto = require('crypto');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const nodemailerStub = require('nodemailer-stub');
const User = require('./User');

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
  await User.create(user);

  const transporter = nodemailer.createTransport(nodemailerStub.stubTransport);
  await transporter.sendMail({
    from: 'My App <info@any-app.com>',
    to: email,
    subject: 'Account Activation',
    html: `Token is ${user.activationToken}`,
  });

  return res.send({ message: req.t('user_create_success') });
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

module.exports = {
  create,
  findByEmail,
};
