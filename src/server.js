const express = require('express');
const bcrypt = require('bcrypt');
const User = require('./user/User');

const app = express();

app.use(express.json());

app.post('/api/v1/users', (req, res) => {
  bcrypt.hash(req.body.password, 10).then((hash) => {
    const user = { ...req.body, password: hash };

    User.create(user).then(() => {
      return res.send({ message: 'User created successfully' });
    });
  });
});

module.exports = app;
