const app = require('./src/server');
const sequelize = require('./src/config/database');
const User = require('./src/user/User');
const PORT = process.env.PORT || 4000;

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@test.com`,
      inactive: i >= activeUserCount,
    });
  }
};

// {force: true} sync database with latest updates
sequelize.sync({ force: true }).then(async () => {
  await addUsers(25);
});

app.listen(PORT, () => console.log(`Server is running on ${PORT}`));
