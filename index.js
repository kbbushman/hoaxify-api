const app = require('./src/server');
const sequelize = require('./src/config/database');
const bcrypt = require('bcrypt');
const User = require('./src/user/User');
const tokenService = require('./src/auth/tokenService');
const PORT = process.env.PORT || 4000;

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  const hash = await bcrypt.hash('P4ssword', 10);
  for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@test.com`,
      inactive: i >= activeUserCount,
      password: hash,
    });
  }
};

// {force: true} sync database with latest updates
sequelize.sync({ force: true }).then(async () => {
  await addUsers(25);
});

tokenService.scheduleCleanup();

app.listen(PORT, () => console.log(`Server is running on ${PORT}`));
