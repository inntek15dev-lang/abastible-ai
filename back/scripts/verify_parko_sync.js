const axios = require('axios');
const { Sequelize } = require('sequelize');
// We need to load env vars to connect to DB
require('dotenv').config({ path: 'c:\\laragon\\www\\a-oiem-ai\\back\\.env' });
const { User } = require('../src/database/models');

const API_URL = 'http://localhost:4000/api';

async function verifySync() {
    try {
        console.log('🔍 1. Verificando integridad de usuario Admin...');
        const adminCount = await User.count({
            where: {
                role: { [Sequelize.Op.notIn]: ['contratista_admin', 'contratista_user'] }
            }
        });

        if (adminCount === 0) {
            console.error('❌ ERROR CRÍTICO: No se encontraron administradores. El usuario no podrá iniciar sesión.');
            process.exit(1);
        } else {
            console.log(`✅ Admin encontrado (Total no-contratistas: ${adminCount})`);
        }

        console.log('🔍 2. Verificando Endpoint de Comparación...');
        const compareRes = await axios.get(`${API_URL}/sync/compare`);

        if (!compareRes.data) {
            throw new Error('No data received from compare endpoint');
        }

        const { servicios, dependencias, contratistas, vinculaciones } = compareRes.data;

        console.log(`✅ Comparación exitosa. Datos detectados:`);
        console.log(`   - Servicios: ${servicios.length}`);
        console.log(`   - Dependencias: ${dependencias.length}`);
        console.log(`   - Contratistas: ${contratistas.length}`);
        console.log(`   - Vinculaciones: ${vinculaciones.length}`);

        // Sync Servicios
        if (servicios.length > 0) {
            console.log('🔄 Sincronizando Servicios...');
            await axios.post(`${API_URL}/sync/execute`, { type: 'servicios', items: servicios });
        }

        // Sync Dependencias
        if (dependencias.length > 0) {
            console.log('🔄 Sincronizando Dependencias...');
            await axios.post(`${API_URL}/sync/execute`, { type: 'dependencias', items: dependencias });
        }

        // Sync Contratistas
        if (contratistas.length > 0) {
            console.log('🔄 Sincronizando Contratistas...');
            // Need to map to structure expected by syncData if different from compareData
            await axios.post(`${API_URL}/sync/execute`, { type: 'contratistas', items: contratistas });
        }

        // Sync Vinculaciones
        if (vinculaciones.length > 0) {
            console.log('🔄 Sincronizando Vinculaciones...');
            await axios.post(`${API_URL}/sync/execute`, { type: 'vinculaciones', items: vinculaciones });
        }

        console.log('✨ Sincronización verificada y completada con éxito.');

    } catch (error) {
        console.error('❌ Error en verificación de sincronización:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        process.exit(1);
    }
}

verifySync();
