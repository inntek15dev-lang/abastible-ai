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
router.get('/elementos/:id', auth, elementoController.show);
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
router.post('/actividades', auth, requirePrivilege('Gestion_Configuracion', 'write'), upload.single('plantilla'), actividadController.store);
router.put('/actividades/:id', auth, requirePrivilege('Gestion_Configuracion', 'write'), upload.single('plantilla'), actividadController.update);
router.delete('/actividades/:id', auth, requirePrivilege('Gestion_Configuracion', 'excec'), actividadController.destroy);

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
 *     tags: [Auditoria]
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
 *
 * /registros/{id}/actividades/{actividadId}/auditar:
 *   put:
 *     summary: Audit a specific activity
 *     tags: [Auditoria]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: actividadId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [aprobado, rechazado]
 *               observacion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Activity audited
 *
 * /registros/{id}/finalizar-auditoria:
 *   post:
 *     summary: Finalize the audit process
 *     tags: [Auditoria]
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
 *         description: Audit finalized
 *
 * /registros/{id}/comentarios:
 *   post:
 *     summary: Add a comment to a register
 *     tags: [Auditoria]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comentario:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added
 */
router.post('/registros/:id/auditar', auth, requirePrivilege('Auditoria', 'write'), auditoriaController.iniciarAuditoria);
router.put('/registros/:id/actividades/:actividadId/auditar', auth, requirePrivilege('Auditoria', 'write'), auditoriaController.auditarActividad);
router.post('/registros/:id/finalizar-auditoria', auth, requirePrivilege('Auditoria', 'write'), auditoriaController.finalizarAuditoria);
router.post('/registros/:id/iniciar-revision', auth, requirePrivilege('Auditoria', 'write'), auditoriaController.iniciarRevision);
router.post('/registros/:id/finalizar-revision', auth, requirePrivilege('Auditoria', 'write'), auditoriaController.finalizarRevision);
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
router.get('/evidencias/bulk-download', auth, evidenciaController.downloadSelected);
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
// Multer for Reaperturas (if needed, though not explicitly used in routes)
const reaperturaController = require('../controllers/reaperturaController');

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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               registro_id:
 *                 type: integer
 *               motivo:
 *                 type: string
 *     responses:
 *       201:
 *         description: Request created
 *
 * /reaperturas/{id}/aprobar:
 *   put:
 *     summary: Approve reopen request
 *     tags: [Reaperturas]
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
 *         description: Request approved
 *
 * /reaperturas/{id}/rechazar:
 *   put:
 *     summary: Reject reopen request
 *     tags: [Reaperturas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo_rechazo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Request rejected
 *
 * /reaperturas/directa:
 *   post:
 *     summary: Directly reopen a register (Admin only)
 *     tags: [Reaperturas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               registro_id:
 *                 type: integer
 *               motivo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Register reopened
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

/**
 * @swagger
 * /dashboard/historico:
 *   get:
 *     summary: Get historical compliance data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historical data
 *
 * /dashboard/actividad:
 *   get:
 *     summary: Get recent activity logs
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity logs
 *
 * /dashboard/matrix:
 *   get:
 *     summary: Get compliance matrix
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: contratista_id
 *         schema:
 *           type: string
 *         description: Filter by company ID
 *       - in: query
 *         name: servicio_id
 *         schema:
 *           type: string
 *         description: Filter by service ID
 *       - in: query
 *         name: dependencia_id
 *         schema:
 *           type: string
 *         description: Filter by dependency ID
 *       - in: query
 *         name: programa_id
 *         schema:
 *           type: string
 *         description: Filter by program ID
 *       - in: query
 *         name: tiene_registros
 *         schema:
 *           type: string
 *           enum: [si, no]
 *         description: Filter by presence of records
 *     responses:
 *       200:
 *         description: Compliance matrix
 */
router.get('/dashboard/historico', auth, dashboardController.historico);
router.get('/dashboard/actividad', auth, dashboardController.actividadReciente);
router.get('/dashboard/matrix', auth, dashboardController.matrix);

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

/**
 * @swagger
 * /reportes/cumplimiento:
 *   get:
 *     summary: Generate general compliance report
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compliance report
 */
router.get('/reportes/cumplimiento', auth, reporteController.cumplimientoGeneral);
router.get('/reportes/cumplimiento/pdf', auth, reporteController.cumplimientoGeneralPdf);
router.get('/reportes/cumplimiento/excel', auth, reporteController.cumplimientoGeneralExcel);
router.get('/reportes/matrix/pdf', auth, reporteController.matrixPdf);
router.get('/reportes/matrix/excel', auth, reporteController.matrixExcel);

// ============= SPRINT 5: DOCUMENTOS =============
// Documentos
const documentoController = require('../controllers/documentoController');

/**
 * @swagger
 * /documentos:
 *   get:
 *     summary: List documents
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of documents
 * /documentos/upload:
 *   post:
 *     summary: Upload a document
 *     tags: [Documentos]
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
 *     responses:
 *       201:
 *         description: Document uploaded
 */
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
router.get('/usuarios/:id/asignaciones', auth, usuarioController.asignaciones);

// Resources (Dropdowns)
const resourceController = require('../controllers/resourceController');

/**
 * @swagger
 * /resources/dependencias:
 *   get:
 *     summary: List dependencies for dropdowns
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of dependencies
 *
 * /resources/tipos-contratista:
 *   get:
 *     summary: List contractor types (services) for dropdowns
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of types
 * 
 * /resources/gerencias:
 *   get:
 *     summary: List gerencias for dropdowns
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of gerencias
 * 
 * /resources/subgerencias:
 *   get:
 *     summary: List subgerencias for dropdowns
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of subgerencias
 * 
 * /resources/adc:
 *   get:
 *     summary: List Contract Managers
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of Administradores de Contrato
 */
router.get('/resources/dependencias', auth, resourceController.dependencias);
router.get('/resources/roles', auth, resourceController.roles);
router.get('/resources/tipos-contratista', auth, resourceController.tiposContratista);
router.get('/resources/gerencias', auth, resourceController.gerencias);
router.get('/resources/subgerencias', auth, resourceController.subgerencias);
router.get('/resources/adc', auth, resourceController.administradoresContrato);
router.get('/resources/adc-scope', auth, resourceController.adcScope);

// ============= SPRINT 7: GESTIÓN DE ROLES =============
const roleController = require('../controllers/roleController');

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: List all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Role'
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Role'
 *     responses:
 *       201:
 *         description: Role created
 *
 * /roles/{id}:
 *   put:
 *     summary: Update a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Role'
 *     responses:
 *       200:
 *         description: Role updated
 *   delete:
 *     summary: Delete a role
 *     tags: [Roles]
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
 *         description: Role deleted
 *
 * /roles/{id}/privileges:
 *   get:
 *     summary: Get privileges for a role
 *     tags: [Roles]
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
 *         description: List of privileges
 *   put:
 *     summary: Update privileges for a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               privileges:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Privileges updated
 */
router.get('/roles', auth, requirePrivilege('Admin_Usuarios', 'read'), roleController.index);
router.post('/roles', auth, requirePrivilege('Admin_Usuarios', 'write'), roleController.store);
router.put('/roles/:id', auth, requirePrivilege('Admin_Usuarios', 'write'), roleController.update);
router.delete('/roles/:id', auth, requirePrivilege('Admin_Usuarios', 'excec'), roleController.destroy);

router.get('/roles/:id/privileges', auth, requirePrivilege('Admin_Usuarios', 'read'), roleController.getPrivileges);
router.put('/roles/:id/privileges', auth, requirePrivilege('Admin_Usuarios', 'write'), roleController.updatePrivileges);

// ============= SPRINT 9: SERVICIOS Y DEPENDENCIAS =============
const dependenciaController = require('../controllers/dependenciaController');
const servicioController = require('../controllers/servicioController'); // Wraps TipoContratista

/**
 * @swagger
 * /dependencias:
 *   get:
 *     summary: List all dependencies
 *     tags: [Dependencias]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of dependencies
 *   post:
 *     summary: Create a dependency
 *     tags: [Dependencias]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Dependencia'
 *     responses:
 *       201:
 *         description: Created
 * /dependencias/{id}:
 *   get:
 *     summary: Get dependency by ID
 *     tags: [Dependencias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dependency details
 *   put:
 *     summary: Update dependency
 *     tags: [Dependencias]
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
 *         description: Updated
 *   delete:
 *     summary: Delete dependency
 *     tags: [Dependencias]
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
 *         description: Deleted
 */
// Dependencias
router.get('/dependencias', auth, dependenciaController.index);
router.get('/dependencias/:id', auth, dependenciaController.show);
router.post('/dependencias', auth, requirePrivilege('Gestion_Configuracion', 'write'), dependenciaController.store); // Sharing logic with Programas/Admin
router.put('/dependencias/:id', auth, requirePrivilege('Gestion_Configuracion', 'write'), dependenciaController.update);
router.delete('/dependencias/:id', auth, requirePrivilege('Gestion_Configuracion', 'excec'), dependenciaController.destroy);

/**
 * @swagger
 * /servicios:
 *   get:
 *     summary: List all services
 *     tags: [Servicios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of services
 *   post:
 *     summary: Create a service
 *     tags: [Servicios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Servicio'
 *     responses:
 *       201:
 *         description: Created
 * /servicios/{id}:
 *   get:
 *     summary: Get service by ID
 *     tags: [Servicios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Service details
 *   put:
 *     summary: Update service
 *     tags: [Servicios]
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
 *         description: Updated
 *   delete:
 *     summary: Delete service
 *     tags: [Servicios]
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
 *         description: Deleted
 */
// Servicios
router.get('/servicios', auth, servicioController.index);
router.get('/servicios/:id', auth, servicioController.show);
router.post('/servicios', auth, requirePrivilege('Gestion_Configuracion', 'write'), servicioController.store);
router.put('/servicios/:id', auth, requirePrivilege('Gestion_Configuracion', 'write'), servicioController.update);
router.delete('/servicios/:id', auth, requirePrivilege('Gestion_Configuracion', 'excec'), servicioController.destroy);

// ============= SPRINT 9 REFACTOR: CONTRATISTAS =============
const contratistaController = require('../controllers/contratistaController');

/**
 * @swagger
 * /contratistas:
 *   get:
 *     summary: List all contractors
 *     tags: [Contratistas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of contractors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Contratista'
 *   post:
 *     summary: Create a contractor
 *     tags: [Contratistas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Contratista'
 *     responses:
 *       201:
 *         description: Created
 * /contratistas/{id}:
 *   get:
 *     summary: Get contractor by ID
 *     tags: [Contratistas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contractor details
 *   put:
 *     summary: Update contractor
 *     tags: [Contratistas]
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
 *         description: Updated
 *   delete:
 *     summary: Delete contractor
 *     tags: [Contratistas]
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
 *         description: Deleted
 */
router.get('/contratistas', auth, contratistaController.index);
router.get('/contratistas/:id', auth, contratistaController.show);
router.post('/contratistas', auth, requirePrivilege('Gestion_Configuracion', 'write'), contratistaController.store);
router.put('/contratistas/:id', auth, requirePrivilege('Gestion_Configuracion', 'write'), contratistaController.update);
router.post('/contratistas/:id/admin', auth, requirePrivilege('Gestion_Configuracion', 'write'), contratistaController.assignAdmin);
router.delete('/contratistas/:id/admin/:adminId', auth, requirePrivilege('Gestion_Configuracion', 'write'), contratistaController.removeAdmin);
router.delete('/contratistas/:id', auth, requirePrivilege('Gestion_Configuracion', 'excec'), contratistaController.destroy);

// ============= SPRINT 10: SYNC (Parko) =============
const syncController = require('../controllers/syncController');

/**
 * @swagger
 * /sync/compare:
 *   get:
 *     summary: Compare local vs external data
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Comparison result
 * /sync/execute:
 *   post:
 *     summary: Execute synchronization
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               changes:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Sync completed
 */
router.get('/sync/compare', auth, requirePrivilege('Configuración', 'read'), syncController.compareData);
router.post('/sync/execute', auth, requirePrivilege('Configuración', 'write'), syncController.syncData);

// ============= VINCULACIONES MODULE =============
const vinculacionController = require('../controllers/vinculacionController');

/**
 * @swagger
 * /vinculaciones:
 *   get:
 *     summary: List all assignments
 *     tags: [Vinculaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assignments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Vinculacion'
 *   post:
 *     summary: Create assignment
 *     tags: [Vinculaciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Vinculacion'
 *     responses:
 *       201:
 *         description: Created
 * /vinculaciones/{id}:
 *   get:
 *     summary: Get assignment by ID
 *     tags: [Vinculaciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Details
 *   put:
 *     summary: Update assignment
 *     tags: [Vinculaciones]
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
 *         description: Updated
 *   delete:
 *     summary: Delete assignment
 *     tags: [Vinculaciones]
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
 *         description: Deleted
 */
router.get('/vinculaciones', auth, vinculacionController.index);
router.get('/vinculaciones/:id', auth, requirePrivilege('Vinculaciones', 'read'), vinculacionController.show);
router.post('/vinculaciones', auth, requirePrivilege('Vinculaciones', 'write'), vinculacionController.store);
router.post('/vinculaciones/:id/admin', auth, requirePrivilege('Vinculaciones', 'write'), vinculacionController.assignAdmin);
router.delete('/vinculaciones/:id/admin/:adminId', auth, requirePrivilege('Vinculaciones', 'write'), vinculacionController.removeAdmin);
router.post('/vinculaciones/:id/usuarios', auth, requirePrivilege('Vinculaciones', 'write'), vinculacionController.assignUser);
router.delete('/vinculaciones/:id/usuarios/:userId', auth, requirePrivilege('Vinculaciones', 'write'), vinculacionController.removeUser);
router.put('/vinculaciones/:id', auth, requirePrivilege('Vinculaciones', 'write'), vinculacionController.update);
router.delete('/vinculaciones/:id', auth, requirePrivilege('Vinculaciones', 'excec'), vinculacionController.destroy);

// End of Routes

module.exports = router;


