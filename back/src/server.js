// IEEE Trace: Server Entry Point | server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { sequelize } = require('./database/models');
const routes = require('./routes');
const auth = require('./middleware/auth');
const storageController = require('./controllers/storageController');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Trust Proxy (Required for Nginx/Load Balancers to handle CORS/IPs correctly)
app.set('trust proxy', 1);

// HTTP Security Headers via Helmet & disable X-Powered-By (HU-OIEM-06 / F-06)
app.disable('x-powered-by');
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Strict CORS Whitelist (HU-01 / F-01)
const getAllowedOrigins = () => {
    const envOrigins = process.env.ALLOWED_ORIGINS;
    if (envOrigins && envOrigins.trim()) {
        return envOrigins
            .split(',')
            .map(o => o.trim().replace(/\/+$/, ''))
            .filter(Boolean);
    }

    if (process.env.NODE_ENV === 'production') {
        return ['https://oiem-abastible.ovalcontrol.com'];
    }
    if (process.env.NODE_ENV === 'preproduction') {
        return ['https://prepro-oiem-abastible.ovalcontrol.com'];
    }
    return ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];
};

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
    origin: (origin, callback) => {
        // Requests without Origin header (server-to-server, healthchecks, curl without Origin)
        // Return false so no Access-Control-Allow-Origin: * header is emitted
        if (!origin) {
            return callback(null, false);
        }
        const normalizedOrigin = origin.trim().replace(/\/+$/, '');
        if (allowedOrigins.includes(normalizedOrigin)) {
            return callback(null, true);
        }
        const corsError = new Error(`Origin ${origin} not allowed by CORS`);
        corsError.statusCode = 403;
        corsError.isCorsError = true;
        return callback(corsError);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Api-Key'],
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Authenticated & authorized storage access (HU-02 / F-02) - Bearer header required
const requireBearerHeader = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Token de acceso no proporcionado en cabecera Authorization'
        });
    }
    next();
};
app.get('/storage/*', requireBearerHeader, auth, storageController.serve);

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

// Swagger (Disabled in production - HU-OIEM-04 / F-04)
if (process.env.NODE_ENV !== 'production') {
    const swaggerUi = require('swagger-ui-express');
    const swaggerSpecs = require('./config/swagger');
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpecs);
    });
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
    const swaggerUrl = `http://localhost:${PORT}/api-docs`;
    console.log(`📄 Swagger Docs available at ${swaggerUrl}`);
}

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
    if (err?.isCorsError) {
        return res.status(403).json({
            success: false,
            message: 'Origin no permitido por política CORS'
        });
    }
    if (err?.name === 'MulterError' || err?.message?.includes('no permitido')) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
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

        // Self-healing schema migration for compromisos table
        try {
            const [columns] = await sequelize.query("SHOW COLUMNS FROM compromisos");
            const colNames = columns.map(c => c.Field);

            if (!colNames.includes('responsabilidad')) {
                await sequelize.query("ALTER TABLE compromisos ADD COLUMN responsabilidad ENUM('abastible', 'contratista') NOT NULL DEFAULT 'contratista' AFTER hallazgo_id");
                console.log('✅ Auto-migration: Added `responsabilidad` column to compromisos table');
            }
            if (!colNames.includes('responsable_cierre_id')) {
                await sequelize.query("ALTER TABLE compromisos ADD COLUMN responsable_cierre_id BIGINT UNSIGNED NULL AFTER creado_por_id");
                console.log('✅ Auto-migration: Added `responsable_cierre_id` column to compromisos table');
            }
        } catch (migErr) {
            console.warn('⚠️ Auto-migration check warning:', migErr.message);
        }

        // Self-healing schema migration for auditoria_comentarios (tipo ENUM includes participantes)
        try {
            const [columns] = await sequelize.query("SHOW COLUMNS FROM auditoria_comentarios WHERE Field = 'tipo'");
            if (columns && columns.length > 0) {
                const tipoType = (columns[0].Type || "").toLowerCase();
                if (!tipoType.includes("participantes")) {
                    await sequelize.query("ALTER TABLE auditoria_comentarios MODIFY COLUMN tipo ENUM('general', 'actividad', 'evidencia', 'participantes') NOT NULL DEFAULT 'general'");
                    console.log("✅ Auto-migration: Added `participantes` to `tipo` ENUM in auditoria_comentarios table");
                }
            }
        } catch (migErr) {
            console.warn("⚠️ Auto-migration check warning (auditoria_comentarios):", migErr.message);
        }

        // Self-healing schema migration for avisos table
        try {
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS avisos (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    titulo VARCHAR(255) NOT NULL,
                    contenido LONGTEXT NOT NULL,
                    fecha_desde DATE NOT NULL,
                    fecha_hasta DATE NOT NULL,
                    para_todos TINYINT(1) NOT NULL DEFAULT 0,
                    roles TEXT NULL,
                    activo TINYINT(1) NOT NULL DEFAULT 1,
                    creado_por_id BIGINT UNSIGNED NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_avisos_fechas (fecha_desde, fecha_hasta, activo)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
            console.log("✅ Auto-migration: Checked/Created `avisos` table");
        } catch (migErr) {
            console.warn("⚠️ Auto-migration check warning (avisos):", migErr.message);
        }

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
