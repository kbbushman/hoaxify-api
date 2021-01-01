const bcrypt = require('bcrypt');
const User = require('./User');

const create = async (req, res) => {
  const { username, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const user = { username, email, password: hash };
  await User.create(user);
  return res.send({ message: req.t('user_create_success') });
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

module.exports = {
  create,
  findByEmail,
};
