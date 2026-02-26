require('dotenv').config();
const sequelize = require('./src/database');

sequelize.authenticate()
    .then(() => {
        console.log('SUCCESS: Connection to Aiven established successfully.');
        process.exit(0);
    })
    .catch(err => {
        console.error('ERROR: Unable to connect to Aiven:', err);
        process.exit(1);
    });
