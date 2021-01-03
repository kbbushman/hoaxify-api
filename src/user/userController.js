const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('./User');
const emailService = require('../email/emailService');
const sequelize = require('../config/database');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('./InvalidTokenException');

const generateToken = (length) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

const create = async (req, res, next) => {
  const { username, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const user = {
    username,
    email,
    password: hash,
    activationToken: generateToken(16),
  };

  const transaction = await sequelize.transaction();
  await User.create(user, { transaction });

  try {
    await emailService.sendAccountActivation(email, user.activationToken);
    await transaction.commit();
    return res.send({ message: req.t('user_create_success') });
  } catch (err) {
    transaction.rollback();
    next(new EmailException());
  }
};

const activate = async (req, res, next) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({ where: { activationToken: token } });

    if (!user) {
      throw new InvalidTokenException();
    }

    user.inactive = false;
    user.activationToken = null;
    await user.save();
    return res.send({ message: req.t('account_activation_success') });
  } catch (err) {
    next(err);
  }
};

const getUsers = async (req, res) => {
  let page = req.query.page ? Number.parseInt(req.query.page) : 0;
  if (page < 0) {
    page = 0;
  }
  const pageSize = 10;
  const usersWithCount = await User.findAndCountAll({
    where: { inactive: false },
    attributes: ['id', 'username', 'email'],
    limit: pageSize,
    offset: page * pageSize,
  });

  return res.send({
    content: usersWithCount.rows,
    page: page,
    size: 10,
    totalPages: Math.ceil(usersWithCount.count / pageSize),
  });
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

module.exports = {
  create,
  activate,
  findByEmail,
  getUsers,
};
