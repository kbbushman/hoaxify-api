const express = require('express');
const User = require('./user/User');

const app = express();

app.use(express.json());

app.post('/api/v1/users', (req, res) => {
  User.create(req.body).then(() => {
    return res.send({ message: 'User created successfully' });
  });
});

module.exports = app;
