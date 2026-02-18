require('dotenv').config();
const { Role } = require('../database/models');

async function listRoles() {
    try {
        const roles = await Role.findAll();
        console.log('ROLES:', JSON.stringify(roles, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

listRoles();
