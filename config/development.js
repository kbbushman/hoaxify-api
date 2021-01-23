module.exports = {
  database: {
    database: 'hoaxify',
    username: 'db-user',
    password: 'db-user-password',
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: true,
  },
  mail: {
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'nicolas3@ethereal.email',
      pass: 'BbeNyDZpTgW7EN94Nq',
    },
  },
};
