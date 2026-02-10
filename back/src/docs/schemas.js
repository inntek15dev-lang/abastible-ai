/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - role
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the user
 *         name:
 *           type: string
 *           description: The name of the user
 *         email:
 *           type: string
 *           description: The email of the user
 *         role:
 *           type: string
 *           enum: [admin, administrador_contrato, contratista_admin, contratista_user]
 *           description: The role of the user
 *         activo:
 *           type: boolean
 *           description: Whether the user is active
 *       example:
 *         id: 1
 *         name: John Doe
 *         email: john@example.com
 *         role: admin
 *         activo: true
 *
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *       example:
 *         email: admin@abastible.cl
 *         password: User123*
 *
 *     LoginResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT Access Token
 *         user:
 *           $ref: '#/components/schemas/User'
 *
 *     Programa:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         nombre:
 *           type: string
 *         descripcion:
 *           type: string
 *         activo:
 *           type: boolean
 *       example:
 *         id: 1
 *         nombre: OIM Distribución Granel
 *         descripcion: Programa de Operación Integrada
 *         activo: true
 *
 *     Elemento:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         numero:
 *           type: string
 *         nombre:
 *           type: string
 *         orden:
 *           type: integer
 *       example:
 *         id: 1
 *         numero: "1"
 *         nombre: Liderazgo
 *         orden: 1
 *
 *     Actividad:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         codigo:
 *           type: string
 *         actividad:
 *           type: string
 *         descripcion:
 *           type: string
 *         frecuencia:
 *           type: string
 *           enum: [mensual, trimestral, semestral, anual, cuando_aplique]
 *         requiere_evidencia:
 *           type: boolean
 *       example:
 *         id: 1
 *         codigo: "1.1"
 *         actividad: "Reuniones gerenciales"
 *         descripcion: "Realizar reunión mensual"
 *         frecuencia: mensual
 *         requiere_evidencia: true
 *
 *     Registro:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         periodo:
 *           type: string
 *           format: date
 *         porcentaje_cumplimiento:
 *           type: number
 *           format: float
 *         estado_auditoria:
 *           type: string
 *           enum: [pendiente, auditando, auditada_terreno, auditada_sistema, reabierto]
 *         auditado:
 *           type: integer
 *           description: 0 or 1
 *         cerrado:
 *           type: integer
 *           description: 0 or 1
 *       example:
 *         id: 10
 *         periodo: "2026-01-01"
 *         porcentaje_cumplimiento: 85.5
 *         estado_auditoria: "pendiente"
 *         auditado: 0
 *         cerrado: 0
 *
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         error:
 *           type: string
 *       example:
 *         message: "Recurso no encontrado"
 *         error: "Not Found"
 */
