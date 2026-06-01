require('dotenv').config();
const { Dependencia } = require('../database/models');

async function listDependencias() {
    try {
        const dependencias = await Dependencia.findAll();
        console.log('Dependencias:', JSON.stringify(dependencias, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

listDependencias();
