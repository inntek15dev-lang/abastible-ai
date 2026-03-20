// IEEE Trace: All Entities | models/index.js
const sequelize = require('../index');

// Import models (order by execution_order_index)
// Sprint 1
const Role = require('./Role');
const Privilegio = require('./Privilegio');
const Gerencia = require('./Gerencia');
const Subgerencia = require('./Subgerencia');
const Dependencia = require('./Dependencia');
const Programa = require('./Programa');
const Configuracion = require('./Configuracion');
const TipoContratista = require('./TipoContratista');
const Elemento = require('./Elemento');
const Actividad = require('./Actividad');
const User = require('./User');
const ContratistaAsignacion = require('./ContratistaAsignacion');
const Registro = require('./Registro');
const RegistroActividad = require('./RegistroActividad');
const RegistroLog = require('./RegistroLog');

// Sprint 2
const Evidencia = require('./Evidencia');
const Hallazgo = require('./Hallazgo');
const Compromiso = require('./Compromiso');
const AuditoriaComentario = require('./AuditoriaComentario');

// Sprint 3
const SolicitudReapertura = require('./SolicitudReapertura');

// Sprint 5
const Documento = require('./Documento');

// Sprint 9 (Refactor)
const Contratista = require('./Contratista');
const Vinculacion = require('./Vinculacion');
const Administracion = require('./Administracion');
const VinculacionUsuario = require('./VinculacionUsuario');

// ============= SPRINT 1 ASSOCIATIONS =============

// Role -> Privilegios (1:N)
Role.hasMany(Privilegio, { foreignKey: 'role_id', as: 'privilegios' });
Privilegio.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

// Gerencia -> Subgerencia (1:N)
Gerencia.hasMany(Subgerencia, { foreignKey: 'gerencia_id', as: 'subgerencias' });
Subgerencia.belongsTo(Gerencia, { foreignKey: 'gerencia_id', as: 'gerencia' });

// Subgerencia -> Dependencia (1:N)
Subgerencia.hasMany(Dependencia, { foreignKey: 'subgerencia_id', as: 'dependencias' });
Dependencia.belongsTo(Subgerencia, { foreignKey: 'subgerencia_id', as: 'subgerencia' });

// Programa -> TipoContratista (1:N)
Programa.hasMany(TipoContratista, { foreignKey: 'programa_id', as: 'tiposContratista' });
TipoContratista.belongsTo(Programa, { foreignKey: 'programa_id', as: 'programa' });

// Programa -> Elementos (1:N)
Programa.hasMany(Elemento, { foreignKey: 'programa_id', as: 'elementos' });
Elemento.belongsTo(Programa, { foreignKey: 'programa_id', as: 'programa' });

// Elemento -> Actividades (1:N)
Elemento.hasMany(Actividad, { foreignKey: 'elemento_id', as: 'actividades' });
Actividad.belongsTo(Elemento, { foreignKey: 'elemento_id', as: 'elemento' });

// User -> Self (parent hierarchy for contratista_user)
User.hasMany(User, { foreignKey: 'parent_id', as: 'operativos' });
User.belongsTo(User, { foreignKey: 'parent_id', as: 'parent' });

// User -> TipoContratista
User.belongsTo(TipoContratista, { foreignKey: 'tipo_contratista_id', as: 'tipoContratista' });
TipoContratista.hasMany(User, { foreignKey: 'tipo_contratista_id', as: 'usuarios' });

// User -> Dependencia
User.belongsTo(Dependencia, { foreignKey: 'dependencia_id', as: 'dependencia' });
Dependencia.hasMany(User, { foreignKey: 'dependencia_id', as: 'usuarios' });

// ContratistaAsignacion -> User (contratista)
ContratistaAsignacion.belongsTo(User, { foreignKey: 'user_id', as: 'contratista' });
User.hasMany(ContratistaAsignacion, { foreignKey: 'user_id', as: 'asignaciones' });

// ContratistaAsignacion -> User (admin_contrato)
ContratistaAsignacion.belongsTo(User, { foreignKey: 'administrador_contrato_id', as: 'administradorContrato' });

// ContratistaAsignacion -> TipoContratista
ContratistaAsignacion.belongsTo(TipoContratista, { foreignKey: 'tipo_contratista_id', as: 'tipoContratista' });

// ContratistaAsignacion -> Dependencia
ContratistaAsignacion.belongsTo(Dependencia, { foreignKey: 'dependencia_id', as: 'dependencia' });

// Registro -> User (creator)
Registro.belongsTo(User, { foreignKey: 'user_id', as: 'usuario' });
User.hasMany(Registro, { foreignKey: 'user_id', as: 'registros' });

// Registro -> User (auditor)
Registro.belongsTo(User, { foreignKey: 'auditado_por', as: 'auditor' });

// Registro -> Programa
Registro.belongsTo(Programa, { foreignKey: 'programa_id', as: 'programa' });
Programa.hasMany(Registro, { foreignKey: 'programa_id', as: 'registros' });

// Registro -> Dependencia
Registro.belongsTo(Dependencia, { foreignKey: 'dependencia_id', as: 'dependenciaEntidad' });
Dependencia.hasMany(Registro, { foreignKey: 'dependencia_id', as: 'registros' });

// Registro -> ContratistaAsignacion (legacy)
Registro.belongsTo(ContratistaAsignacion, { foreignKey: 'contratista_asignacion_id', as: 'asignacion' });
ContratistaAsignacion.hasMany(Registro, { foreignKey: 'contratista_asignacion_id', as: 'registros' });

// Registro -> Vinculacion (new: FK now references vinculaciones table)
Registro.belongsTo(Vinculacion, { foreignKey: 'contratista_asignacion_id', as: 'vinculacionEntidad' });
Vinculacion.hasMany(Registro, { foreignKey: 'contratista_asignacion_id', as: 'registros' });

// RegistroActividad -> Registro
RegistroActividad.belongsTo(Registro, { foreignKey: 'registro_id', as: 'registro' });
Registro.hasMany(RegistroActividad, { foreignKey: 'registro_id', as: 'actividades' });

// RegistroActividad -> Actividad
RegistroActividad.belongsTo(Actividad, { foreignKey: 'actividad_id', as: 'actividad' });
Actividad.hasMany(RegistroActividad, { foreignKey: 'actividad_id', as: 'registroActividades' });

// RegistroLog -> Registro
RegistroLog.belongsTo(Registro, { foreignKey: 'registro_id', as: 'registro' });
Registro.hasMany(RegistroLog, { foreignKey: 'registro_id', as: 'logs' });

// RegistroLog -> User
RegistroLog.belongsTo(User, { foreignKey: 'user_id', as: 'usuario' });

// ============= SPRINT 2 ASSOCIATIONS =============

// Evidencia -> RegistroActividad
Evidencia.belongsTo(RegistroActividad, { foreignKey: 'registro_actividad_id', as: 'registroActividad' });
RegistroActividad.hasMany(Evidencia, { foreignKey: 'registro_actividad_id', as: 'evidencias' });

// Evidencia -> User
Evidencia.belongsTo(User, { foreignKey: 'user_id', as: 'usuario' });

// Hallazgo -> Registro
Hallazgo.belongsTo(Registro, { foreignKey: 'registro_id', as: 'registro' });
Registro.hasMany(Hallazgo, { foreignKey: 'registro_id', as: 'hallazgos' });

// Hallazgo -> RegistroActividad
Hallazgo.belongsTo(RegistroActividad, { foreignKey: 'registro_actividad_id', as: 'registroActividad' });
RegistroActividad.hasMany(Hallazgo, { foreignKey: 'registro_actividad_id', as: 'hallazgos' });

// Hallazgo -> User (auditor)
Hallazgo.belongsTo(User, { foreignKey: 'auditor_id', as: 'auditor' });

// Compromiso -> Hallazgo
Compromiso.belongsTo(Hallazgo, { foreignKey: 'hallazgo_id', as: 'hallazgo' });
Hallazgo.hasMany(Compromiso, { foreignKey: 'hallazgo_id', as: 'compromisos' });

// Compromiso -> Registro
Compromiso.belongsTo(Registro, { foreignKey: 'registro_id', as: 'registro' });
Registro.hasMany(Compromiso, { foreignKey: 'registro_id', as: 'compromisos' });

// Compromiso -> User (responsable)
Compromiso.belongsTo(User, { foreignKey: 'responsable_id', as: 'responsable' });

// Compromiso -> User (creador)
Compromiso.belongsTo(User, { foreignKey: 'creado_por_id', as: 'creadoPor' });

// Compromiso -> ContratistaAsignacion
// Compromiso.belongsTo(ContratistaAsignacion, { foreignKey: 'contratista_asignacion_id', as: 'asignacion' });
// ContratistaAsignacion.hasMany(Compromiso, { foreignKey: 'contratista_asignacion_id', as: 'compromisos' });

// AuditoriaComentario -> Registro
AuditoriaComentario.belongsTo(Registro, { foreignKey: 'registro_id', as: 'registro' });
Registro.hasMany(AuditoriaComentario, { foreignKey: 'registro_id', as: 'comentarios' });

// AuditoriaComentario -> User
AuditoriaComentario.belongsTo(User, { foreignKey: 'user_id', as: 'usuario' });

// AuditoriaComentario -> RegistroActividad
AuditoriaComentario.belongsTo(RegistroActividad, { foreignKey: 'registro_actividad_id', as: 'registroActividad' });

// ============= SPRINT 3 ASSOCIATIONS =============

// SolicitudReapertura -> Registro
SolicitudReapertura.belongsTo(Registro, { foreignKey: 'registro_id', as: 'registro' });
Registro.hasMany(SolicitudReapertura, { foreignKey: 'registro_id', as: 'solicitudesReapertura' });

// SolicitudReapertura -> User (solicitante)
SolicitudReapertura.belongsTo(User, { foreignKey: 'solicitante_id', as: 'solicitante' });

// SolicitudReapertura -> User (aprobador)
SolicitudReapertura.belongsTo(User, { foreignKey: 'aprobador_id', as: 'aprobador' });

// ============= SPRINT 5 ASSOCIATIONS =============

// Licitacion -> Documentos (Polymorphic-ish)
// REMOVED

// Postulacion -> Documentos (Polymorphic-ish)
// REMOVED

// Postulacion -> User (contratista)
// REMOVED

// Documento -> User (uploader)
Documento.belongsTo(User, { foreignKey: 'user_id', as: 'uploader' });

// ============= SPRINT 9 ASSOCIATIONS =============

// Contratista -> Users (Operativos)
Contratista.hasMany(User, { foreignKey: 'contratista_id', as: 'usuarios' });
User.belongsTo(Contratista, { foreignKey: 'contratista_id', as: 'contratistaEntidad' });

// Vinculacion -> Contratista
Contratista.hasMany(Vinculacion, { foreignKey: 'contratista_id', as: 'vinculaciones' });
Vinculacion.belongsTo(Contratista, { foreignKey: 'contratista_id', as: 'contratista' });

// Vinculacion -> Servicio (TipoContratista)
TipoContratista.hasMany(Vinculacion, { foreignKey: 'servicio_id', as: 'vinculaciones' });
Vinculacion.belongsTo(TipoContratista, { foreignKey: 'servicio_id', as: 'servicio' });

// Vinculacion -> Dependencia
Dependencia.hasMany(Vinculacion, { foreignKey: 'dependencia_id', as: 'vinculaciones' });
Vinculacion.belongsTo(Dependencia, { foreignKey: 'dependencia_id', as: 'dependencia' });

// Administracion -> Vinculacion
Vinculacion.hasMany(Administracion, { foreignKey: 'vinculacion_id', as: 'administraciones' });
Administracion.belongsTo(Vinculacion, { foreignKey: 'vinculacion_id', as: 'vinculacion' });

// Administracion -> User (Admin Contrato)
User.hasMany(Administracion, { foreignKey: 'administrador_contrato_id', as: 'contratosAdministrados' });
Administracion.belongsTo(User, { foreignKey: 'administrador_contrato_id', as: 'administradorContrato' });

// VinculacionUsuario -> Vinculacion
Vinculacion.hasMany(VinculacionUsuario, { foreignKey: 'vinculacion_id', as: 'usuariosVinculados' });
VinculacionUsuario.belongsTo(Vinculacion, { foreignKey: 'vinculacion_id', as: 'vinculacion' });

// VinculacionUsuario -> User
User.hasMany(VinculacionUsuario, { foreignKey: 'user_id', as: 'vinculacionesAsignadas' });
VinculacionUsuario.belongsTo(User, { foreignKey: 'user_id', as: 'usuario', attributes: ['id', 'name', 'email', 'role'] });

module.exports = {
    sequelize,
    // Sprint 1
    Role,
    Privilegio,
    Gerencia,
    Subgerencia,
    Dependencia,
    Programa,
    Configuracion,
    TipoContratista,
    Elemento,
    Actividad,
    User,
    ContratistaAsignacion,
    Registro,
    RegistroActividad,
    RegistroLog,
    // Sprint 2
    Evidencia,
    Hallazgo,
    Compromiso,
    AuditoriaComentario,
    // Sprint 3
    SolicitudReapertura,
    // Sprint 5
    Documento,
    // Sprint 9 (Refactor)
    Contratista,
    Vinculacion,
    Administracion,
    VinculacionUsuario
};
