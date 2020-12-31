const bcrypt = require('bcrypt');
const User = require('./User');

const create = async (req, res) => {
  if (req.body.username === null) {
    return res.status(400).json({ validationErrors: {} });
  }
  const hash = await bcrypt.hash(req.body.password, 10);
  const user = { ...req.body, password: hash };
  await User.create(user);
  return res.send({ message: 'User created successfully' });
};

module.exports = {
  create,
};
