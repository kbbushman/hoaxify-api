const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const Token = require('../auth/Token');

const Model = Sequelize.Model;

class User extends Model {}

// init() creates a Model that represents db table
// Takes attributes object and options object
User.init(
  {
    username: {
      type: Sequelize.STRING,
    },
    email: {
      type: Sequelize.STRING,
      unique: true,
    },
    password: {
      type: Sequelize.STRING,
    },
    inactive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    activationToken: {
      type: Sequelize.STRING,
    },
    passwordResetToken: {
      type: Sequelize.STRING,
    },
    image: {
      type: Sequelize.STRING,
    },
  },
  {
    sequelize, // Sequelize instance
    modelName: 'user', // table name
  }
);

User.hasMany(Token, { onDelete: 'cascade', foreignKey: 'userId' });

module.exports = User;
