const app = require('./src/server');
const sequelize = require('./src/config/database');
const PORT = process.env.PORT || 4000;

// {force: true} sync database with latest updates
sequelize.sync({ force: true });

app.listen(PORT, () => console.log(`Server is running on ${PORT}`));
