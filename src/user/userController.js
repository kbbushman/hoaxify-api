const bcrypt = require('bcrypt');
const User = require('./User');

const create = async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  const user = { ...req.body, password: hash };
  await User.create(user);
  return res.send({ message: 'User created successfully' });
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

module.exports = {
  create,
  findByEmail,
};
