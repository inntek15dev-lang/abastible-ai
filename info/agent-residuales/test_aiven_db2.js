const { Sequelize } = require('sequelize');
const fs = require('fs');

const sequelize = new Sequelize('defaultdb', 'avnadmin', 'AVNS_ukUURAzdPt2-8Vd-jg0', {
    host: 'a-oiem-api-db-mysql-service-a-oiem-api-db.d.aivencloud.com',
    port: 26213,
    dialect: 'mysql',
    dialectOptions: {
        ssl: {
            ca: fs.readFileSync('../../back/certs/ca.pem'),
            rejectUnauthorized: true
        }
    }
});

sequelize.authenticate()
    .then(() => {
        console.log('SUCCESS: Connection to Aiven established successfully.');
        process.exit(0);
    })
    .catch(err => {
        console.error('ERROR: Unable to connect to Aiven:', err);
        process.exit(1);
    });
