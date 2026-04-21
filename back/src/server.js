// IEEE Trace: Server Entry Point | server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./database/models');
const routes = require('./routes');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Trust Proxy (Required for Nginx/Load Balancers to handle CORS/IPs correctly)
app.set('trust proxy', 1);

// Middleware de CORS Atómico (OPCIÓN NUCLEAR - Misión Crítica)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Loguear solo en desarrollo para no saturar logs de prod, 
    // pero habilitar headers para cualquier subdominio de inntek.cl
    if (origin) {
        const isInntek = origin.toLowerCase().includes('inntek.cl') || 
                         origin.includes('localhost') || 
                         origin.includes('127.0.0.1');

        if (isInntek) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Api-Key');
    res.setHeader('X-CORS-Status', 'Nuclear-Applied'); // Header de depuración

    // Manejo Inmediato y Agresivo de Preflight (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve Storage
app.use('/api/storage', express.static(path.join(__dirname, '../../storage')));

// Health check
app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            message: error.message
        });
    }
});

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpecs);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
const swaggerUrl = process.env.NODE_ENV === 'production'
    ? 'https://a-oiem-api.onrender.com/api-docs'
    : `http://localhost:${PORT}/api-docs`;
console.log(`📄 Swagger Docs available at ${swaggerUrl}`);

// Routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
});

// Start server
async function start() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a base de datos establecida');

        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
            console.log(`📋 Health check: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        console.error('❌ Error al iniciar servidor:', error);
        console.error(`🔍 Configuración intentada: Host=${process.env.DB_HOST}, User=${process.env.DB_USER}, DB=${process.env.DB_NAME}`);
        process.exit(1);
    }
}

start();
