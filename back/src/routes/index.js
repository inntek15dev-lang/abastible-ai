// IEEE Trace: All Endpoints | routes/index.js
const express = require('express');
const router = express.Router();

// Middleware
const auth = require('../middleware/auth');
const requirePrivilege = require('../middleware/requirePrivilege');
const upload = require('../middleware/upload');

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints
 *   - name: Programas
 *     description: Gestión de Programas OIEM
 *   - name: Elementos
 *     description: Gestión de Elementos del Programa
 *   - name: Actividades
 *     description: Gestión de Actividades del Programa
 *   - name: Registros
 *     description: Gestión de Registros Mensuales y Auditoría
 *   - name: Evidencias
 *     description: Gestión de Archivos de Evidencia
 *   - name: Hallazgos
 *     description: Gestión de Hallazgos de Auditoría
 *   - name: Compromisos
 *     description: Gestión de Compromisos
 *   - name: Reaperturas
 *     description: Solicitudes de Reapertura
 *   - name: Dashboard
 *     description: KPIs y Métricas
 *   - name: Reportes
 *     description: Generación de PDF y Reportes
 *   - name: Usuarios
 *     description: Gestión de Usuarios
 */

// Sprint 1 Controllers
const authController = require('../controllers/authController');
const programaController = require('../controllers/programaController');
const elementoController = require('../controllers/elementoController');
const actividadController = require('../controllers/actividadController');
const registroController = require('../controllers/registroController');
const usuarioController = require('../controllers/usuarioController');

// Sprint 2 Controllers
const auditoriaController = require('../controllers/auditoriaController');
const evidenciaController = require('../controllers/evidenciaController');
const hallazgoController = require('../controllers/hallazgoController');
const compromisoController = require('../controllers/compromisoController');

// ============= PUBLIC ROUTES =============
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@abastible.cl
 *               password:
 *                 type: string
 *                 format: password
 *                 example: User123*
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 */
router.post('/auth/login', authController.login);

// ============= PROTECTED ROUTES =============

// Auth
/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.get('/auth/me', auth, authController.me);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user (invalidate token if applicable)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/auth/logout', auth, authController.logout);

// Programas (Admin only)
/**
 * @swagger
 * /programas:
 *   get:
 *     summary: List all programs
 *     tags: [Programas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of programs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Programa'
 *   post:
 *     summary: Create a new program
 *     tags: [Programas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Programa'
 *     responses:
 *       201:
 *         description: Program created
 */
router.get('/programas', auth, programaController.index);
router.get('/programas/:id', auth, programaController.show);
router.post('/programas', auth, requirePrivilege('Programas', 'write'), programaController.store);
router.put('/programas/:id', auth, requirePrivilege('Programas', 'write'), programaController.update);
router.delete('/programas/:id', auth, requirePrivilege('Programas', 'excec'), programaController.destroy);

// Elementos (Admin only)
/**
 * @swagger
 * /elementos:
 *   get:
 *     summary: List all elements
 *     tags: [Elementos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of elements
 *   post:
 *     summary: Create element
 *     tags: [Elementos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Elemento'
 *     responses:
 *       201:
 *         description: Created
 */
router.get('/elementos', auth, elementoController.index);
router.post('/elementos', auth, requirePrivilege('Programas', 'write'), elementoController.store);
router.put('/elementos/:id', auth, requirePrivilege('Programas', 'write'), elementoController.update);
router.delete('/elementos/:id', auth, requirePrivilege('Programas', 'excec'), elementoController.destroy);

// Actividades (Admin only)
/**
 * @swagger
 * /actividades:
 *   get:
 *     summary: List activities
 *     tags: [Actividades]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of activities
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Actividad'
 *   post:
 *     summary: Create activity
 *     tags: [Actividades]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Actividad'
 *     responses:
 *       201:
 *         description: Created
 */
router.get('/actividades', auth, actividadController.index);
router.post('/actividades', auth, requirePrivilege('Programas', 'write'), actividadController.store);
router.put('/actividades/:id', auth, requirePrivilege('Programas', 'write'), actividadController.update);
router.delete('/actividades/:id', auth, requirePrivilege('Programas', 'excec'), actividadController.destroy);

// Registros (role-based filtering applied in controller)
/**
 * @swagger
 * /registros:
 *   get:
 *     summary: List monthly registers (filtered by role)
 *     tags: [Registros]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of registers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Registro'
 *   post:
 *     summary: Create a new register
 *     tags: [Registros]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               periodo:
 *                 type: string
 *                 format: date
 *               contratista_asignacion_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Register created
 */
router.get('/registros', auth, registroController.index);
router.get('/registros/:id', auth, registroController.show);
router.post('/registros', auth, requirePrivilege('Registros', 'write'), registroController.store);
router.put('/registros/:id', auth, requirePrivilege('Registros', 'write'), registroController.update);
router.delete('/registros/:id', auth, requirePrivilege('Registros', 'excec'), registroController.destroy);

// ============= SPRINT 2: AUDITORÍA =============

// Auditoría (Admin/Admin Contrato)
/**
 * @swagger
 * /registros/{id}/auditar:
 *   post:
 *     summary: Start auditoria for a register
 *     tags: [Registros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Auditoria started
 */
router.post('/registros/:id/auditar', auth, requirePrivilege('Auditoria', 'write'), auditoriaController.iniciarAuditoria);
router.put('/registros/:id/actividades/:actividadId/auditar', auth, requirePrivilege('Auditoria', 'write'), auditoriaController.auditarActividad);
router.post('/registros/:id/finalizar-auditoria', auth, requirePrivilege('Auditoria', 'write'), auditoriaController.finalizarAuditoria);
router.post('/registros/:id/comentarios', auth, auditoriaController.agregarComentario);

// Evidencias
/**
 * @swagger
 * /evidencias:
 *   post:
 *     summary: Upload evidence file
 *     tags: [Evidencias]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               archivo:
 *                 type: string
 *                 format: binary
 *               registro_actividad_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: File uploaded
 *   get:
 *     summary: List evidences
 *     tags: [Evidencias]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of evidences
 */
router.get('/evidencias', auth, evidenciaController.index);
router.post('/evidencias', auth, upload.single('archivo'), evidenciaController.store);
router.get('/evidencias/:id/download', auth, evidenciaController.download);
router.delete('/evidencias/:id', auth, requirePrivilege('Evidencias', 'excec'), evidenciaController.destroy);

// Hallazgos
/**
 * @swagger
 * /hallazgos:
 *   get:
 *     summary: List findings
 *     tags: [Hallazgos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of findings
 *   post:
 *     summary: Create finding
 *     tags: [Hallazgos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Finding created
 */
router.get('/hallazgos', auth, hallazgoController.index);
router.get('/hallazgos/:id', auth, hallazgoController.show);
router.post('/hallazgos', auth, requirePrivilege('Auditoria', 'write'), hallazgoController.store);
router.put('/hallazgos/:id', auth, requirePrivilege('Auditoria', 'write'), hallazgoController.update);
router.delete('/hallazgos/:id', auth, requirePrivilege('Auditoria', 'write'), hallazgoController.destroy);

// Compromisos
/**
 * @swagger
 * /compromisos:
 *   get:
 *     summary: List commitments
 *     tags: [Compromisos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of commitments
 */
router.get('/compromisos', auth, compromisoController.index);
router.get('/compromisos/:id', auth, compromisoController.show);
router.post('/compromisos', auth, requirePrivilege('Compromisos', 'write'), compromisoController.store);
router.put('/compromisos/:id', auth, requirePrivilege('Compromisos', 'write'), compromisoController.update);
router.patch('/compromisos/:id/cumplir', auth, compromisoController.cumplir);
router.delete('/compromisos/:id', auth, requirePrivilege('Compromisos', 'excec'), compromisoController.destroy);

// ============= SPRINT 3: REAPERTURAS =============
const reaperturaController = require('../controllers/reaperturaController');

// Reaperturas
/**
 * @swagger
 * /reaperturas:
 *   get:
 *     summary: List reopen requests
 *     tags: [Reaperturas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of requests
 *   post:
 *     summary: Create reopen request
 *     tags: [Reaperturas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Request created
 */
router.get('/reaperturas', auth, reaperturaController.index);
router.post('/reaperturas', auth, reaperturaController.store);
router.put('/reaperturas/:id/aprobar', auth, requirePrivilege('Auditoria', 'write'), reaperturaController.aprobar);
router.put('/reaperturas/:id/rechazar', auth, requirePrivilege('Auditoria', 'write'), reaperturaController.rechazar);
router.post('/reaperturas/directa', auth, requirePrivilege('Reaperturas', 'excec'), reaperturaController.reabrirDirectamente);

// ============= SPRINT 4: DASHBOARD & REPORTES =============
const dashboardController = require('../controllers/dashboardController');
const reporteController = require('../controllers/reporteController');

// Dashboard
/**
 * @swagger
 * /dashboard/kpis:
 *   get:
 *     summary: Get main KPIs
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard KPIs
 */
router.get('/dashboard/kpis', auth, dashboardController.kpis);

/**
 * @swagger
 * /dashboard/cumplimiento:
 *   get:
 *     summary: Get compliance stats
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compliance data
 */
router.get('/dashboard/cumplimiento', auth, dashboardController.cumplimiento);
router.get('/dashboard/cumplimiento', auth, dashboardController.cumplimiento);
router.get('/dashboard/historico', auth, dashboardController.historico);
router.get('/dashboard/actividad', auth, dashboardController.actividadReciente);

// Reportes
/**
 * @swagger
 * /reportes/registro/{id}/pdf:
 *   get:
 *     summary: Generate PDF report for register
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/reportes/registro/:id/pdf', auth, reporteController.registroPdf);
router.get('/reportes/cumplimiento', auth, reporteController.cumplimientoGeneral);

// ============= SPRINT 5: LICITACIONES & DOCUMENTOS =============
// Sprint 5 Controllers
const licitacionController = require('../controllers/licitacionController');
const postulacionController = require('../controllers/postulacionController');
// documentoController already imported or needs check? Let's fix duplicate import above.
const documentoController = require('../controllers/documentoController');

// Licitaciones
/**
 * @swagger
 * /licitaciones:
 *   get:
 *     summary: List available licitaciones
 *     tags: [Licitaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of licitaciones
 *   post:
 *     summary: Create a new licitacion
 *     tags: [Licitaciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Licitacion'
 *     responses:
 *       201:
 *         description: Licitacion created
 */
router.get('/licitaciones', auth, licitacionController.index);
router.get('/licitaciones/:id', auth, licitacionController.show);
router.post('/licitaciones', auth, requirePrivilege('Licitaciones_Crear', 'write'), licitacionController.store);
router.put('/licitaciones/:id', auth, requirePrivilege('Licitaciones_Crear', 'write'), licitacionController.update);
router.put('/licitaciones/:id/estado', auth, requirePrivilege('Licitaciones_Crear', 'write'), licitacionController.cambiarEstado);

// Postulaciones
/**
 * @swagger
 * /licitaciones/{id}/postular:
 *   post:
 *     summary: Postulate to a licitacion
 *     tags: [Licitaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Postulation sent
 */
router.post('/licitaciones/:id/postular', auth, requirePrivilege('Licitaciones_Postular', 'excec'), postulacionController.postular);
router.get('/mis-postulaciones', auth, postulacionController.misPostulaciones);

// Documentos
router.post('/documentos/upload', auth, upload.single('archivo'), documentoController.upload);
router.get('/documentos', auth, documentoController.index);

// Usuarios
/**
 * @swagger
 * /usuarios:
 *   get:
 *     summary: List all users
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *   post:
 *     summary: Create a new user
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User created
 */
router.get('/usuarios', auth, usuarioController.index);
router.get('/usuarios/:id', auth, usuarioController.show);
router.post('/usuarios', auth, requirePrivilege('Usuarios', 'write'), usuarioController.store);
router.put('/usuarios/:id', auth, requirePrivilege('Usuarios', 'write'), usuarioController.update);
router.delete('/usuarios/:id', auth, requirePrivilege('Usuarios', 'excec'), usuarioController.destroy);

// Resources (Dropdowns)
const resourceController = require('../controllers/resourceController');
router.get('/resources/dependencias', auth, resourceController.dependencias);
router.get('/resources/tipos-contratista', auth, resourceController.tiposContratista);

// ============= SPRINT 7: GESTIÓN DE ROLES =============
const roleController = require('../controllers/roleController');

router.get('/roles', auth, requirePrivilege('Admin_Usuarios', 'read'), roleController.index);
router.post('/roles', auth, requirePrivilege('Admin_Usuarios', 'write'), roleController.store);
router.put('/roles/:id', auth, requirePrivilege('Admin_Usuarios', 'write'), roleController.update);
router.delete('/roles/:id', auth, requirePrivilege('Admin_Usuarios', 'excec'), roleController.destroy);

router.get('/roles/:id/privileges', auth, requirePrivilege('Admin_Usuarios', 'read'), roleController.getPrivileges);
router.put('/roles/:id/privileges', auth, requirePrivilege('Admin_Usuarios', 'write'), roleController.updatePrivileges);

// ============= SPRINT 9: SERVICIOS Y DEPENDENCIAS =============
const dependenciaController = require('../controllers/dependenciaController');
const servicioController = require('../controllers/servicioController'); // Wraps TipoContratista

// Dependencias
router.get('/dependencias', auth, dependenciaController.index);
router.get('/dependencias/:id', auth, dependenciaController.show);
router.post('/dependencias', auth, requirePrivilege('Programas', 'write'), dependenciaController.store); // Sharing logic with Programas/Admin
router.put('/dependencias/:id', auth, requirePrivilege('Programas', 'write'), dependenciaController.update);
router.delete('/dependencias/:id', auth, requirePrivilege('Programas', 'excec'), dependenciaController.destroy);

// Servicios
router.get('/servicios', auth, servicioController.index);
router.get('/servicios/:id', auth, servicioController.show);
router.post('/servicios', auth, requirePrivilege('Programas', 'write'), servicioController.store);
router.put('/servicios/:id', auth, requirePrivilege('Programas', 'write'), servicioController.update);
router.delete('/servicios/:id', auth, requirePrivilege('Programas', 'excec'), servicioController.destroy);

// End of Routes

module.exports = router;


