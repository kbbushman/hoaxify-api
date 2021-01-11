const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('./User');
const emailService = require('../email/emailService');
const sequelize = require('../config/database');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('./InvalidTokenException');
const UserNotFoundException = require('./UserNotFoundException');
const ForbiddenException = require('../error/ForbiddenException');

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
  const { size, page } = req.pagination;
  const usersWithCount = await User.findAndCountAll({
    where: { inactive: false },
    attributes: ['id', 'username', 'email'],
    limit: size,
    offset: page * size,
  });

  return res.send({
    content: usersWithCount.rows,
    page: page,
    size: size,
    totalPages: Math.ceil(usersWithCount.count / size),
  });
};

const getUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: { id: req.params.id, inactive: false },
      attributes: ['id', 'username', 'email'],
    });
    if (!user) {
      throw new UserNotFoundException();
    }
    return res.status(200).send(user);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  const authorization = req.headers.authorization;
  try {
    if (authorization) {
      const encoded = authorization.substring(6);
      const decoded = Buffer.from(encoded, 'base64').toString('ascii');
      const [email, password] = decoded.split(':');
      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new ForbiddenException('unauthorized_user_update');
      }

      if (user.id.toString() !== req.params.id) {
        throw new ForbiddenException('unauthorized_user_update');
      }

      if (user.inactive) {
        throw new ForbiddenException('unauthorized_user_update');
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        throw new ForbiddenException('unauthorized_user_update');
      }

      user.username = req.body.username;
      await user.save();

      return res.send();
    }
    throw new ForbiddenException('unauthorized_user_update');
  } catch (err) {
    next(err);
  }
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

module.exports = {
  create,
  activate,
  findByEmail,
  getUsers,
  getUser,
  update,
};
