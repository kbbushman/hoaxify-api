const Sequelize = require('sequelize');

const sequelize = new Sequelize('hoaxify', 'db-user', 'dp-pass', {
  dialect: 'sqlite',
  storage: './database.sqlite',
  // logging: false, // Add to prevent query logs in jest output
});

module.exports = sequelize;
