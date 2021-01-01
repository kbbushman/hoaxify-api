const bcrypt = require('bcrypt');
const User = require('./User');

const create = async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10);
    const user = { ...req.body, password: hash };
    await User.create(user);
    return res.send({ message: 'User created successfully' });
  } catch (err) {
    return res
      .status(400)
      .send({ validationErrors: { email: 'Email already in use' } });
  }
};

module.exports = {
  create,
};
