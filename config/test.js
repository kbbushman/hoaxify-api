module.exports = {
  database: {
    database: 'hoaxify',
    username: 'db-user',
    password: 'db-user-password',
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  },
  mail: {
    host: 'localhost',
    port: 8587,
    tls: {
      rejectUnauthorized: false,
    },
  },
};
