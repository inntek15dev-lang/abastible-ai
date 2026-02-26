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
 *           enum: [pendiente, auditando, auditada, reabierto]
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
 *
 *     Vinculacion:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         contratista_id:
 *           type: integer
 *         servicio_id:
 *           type: integer
 *         dependencia_id:
 *           type: integer
 *         periodo_inicio:
 *           type: string
 *           format: date
 *         numero_contrato:
 *           type: string
 *           description: Numero de contrato asociado
 *         activo:
 *           type: boolean
 *       example:
 *         id: 1
 *         contratista_id: 10
 *         servicio_id: 2
 *         dependencia_id: 5
 *         periodo_inicio: "2024-01-01"
 *         numero_contrato: "CTR-2024-001"
 *         activo: true
 *
 *     Contratista:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         rut:
 *           type: string
 *         nombre:
 *           type: string
 *         direccion:
 *           type: string
 *         telefono:
 *           type: string
 *         email_contacto:
 *           type: string
 *         activo:
 *           type: boolean
 *       example:
 *         id: 1
 *         rut: "76.123.456-7"
 *         nombre: "Empresa Contratista SPA"
 *         email_contacto: "contacto@empresa.cl"
 *         activo: true
 *
 *     Dependencia:
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
 *         nombre: "Planta Maipú"
 *         activo: true
 *
 *     Servicio:
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
 *         nombre: "Servicios Generales"
 *         activo: true
 *
 *     Role:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         description:
 *           type: string
 *       example:
 *         id: 1
 *         name: "admin"
 *         description: "Administrador del Sistema"
 *
 *     Compromiso:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         origen:
 *           type: string
 *         descripcion:
 *           type: string
 *         fecha_limite:
 *           type: string
 *           format: date
 *         responsable_id:
 *           type: integer
 *         estado:
 *           type: string
 *           enum: [pendiente, completado, vencido]
 *       example:
 *         id: 1
 *         origen: "Reunión Gerencial"
 *         descripcion: "Actualizar matriz de riesgos"
 *         fecha_limite: "2024-12-31"
 *         estado: "pendiente"
 *
 *     Hallazgo:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         descripcion:
 *           type: string
 *         nivel_riesgo:
 *           type: string
 *           enum: [bajo, medio, alto, critico]
 *       example:
 *         id: 1
 *         descripcion: "Falta de señalética"
 *         nivel_riesgo: "medio"
 *
 *     Evidencia:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         archivo_url:
 *           type: string
 *         tipo_archivo:
 *           type: string
 *       example:
 *         id: 1
 *         archivo_url: "/uploads/evidencia1.pdf"
 *         tipo_archivo: "application/pdf"
 */
