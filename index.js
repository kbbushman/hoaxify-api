const app = require('./src/server');
const sequelize = require('./src/config/database');
const PORT = process.env.PORT || 4000;

sequelize.sync();

app.listen(PORT, () => console.log(`Server is running on ${PORT}`));
