const Sequelize = require('sequelize');

const sequelize = new Sequelize('hoaxify', 'db-user', 'dp-pass', {
  dialect: 'sqlite',
  storage: './database.sqlite',
});

module.exports = sequelize;
