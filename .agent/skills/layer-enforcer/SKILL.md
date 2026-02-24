---
name: layer-enforcer
description: Auditoría MANDATORIA de consistencia entre capas (Back, Front, Swagger, Env, DB).
---

# Layer Enforcer Protocol

Este skill tiene como único propósito asegurar la integridad y consistencia completa del sistema antes de cualquier sincronización de Blueprint.

## 1. Misión
Verificar que cada cambio implementado se refleje correctamente en TODAS las capas del sistema. No se permite dejar "cabos sueltos".

## 2. Checklist de Verificación (MANDATORY)

Para *cada* funcionalidad o entidad modificada, se DEBE verificar lo siguiente:

### A. Capa de Datos (DB & Models)
- [ ] **Modelos Sequelize**: ¿Se crearon/actualizaron los archivos en `back/src/database/models`?
- [ ] **Migraciones/Sync**: ¿La base de datos real tiene las tablas y columnas correspondientes?
- [ ] **Seeders**: ¿Se requiere data inicial? ¿Se actualizó `seed.js`?

### B. Capa Backend (API)
- [ ] **Controladores**: ¿Existe la lógica de negocio en `back/src/controllers`?
- [ ] **Rutas**: ¿Están los endpoints registrados en `back/src/routes/index.js`?
- [ ] **Permisos**: ¿Se integraron los middlewares `auth` y `requirePrivilege`?

### C. Capa de Documentación (Swagger)
- [ ] **Swagger Docs**: ¿Se actualizaron las definiciones JSDoc en `back/src/routes/index.js` o configuraciones?
- [ ] **Endpoints**: ¿La documentación coincide con la implementación real?

### D. Capa Frontend (UI/UX)
- [ ] **Componentes/Vistas**: ¿Existen las pantallas para ver/editar la data?
- [ ] **Integración API**: ¿El frontend consume los nuevos endpoints correctamente?
- [ ] **Feedback Usuario**: ¿Hay indicadores de carga, mensajes de éxito/error (Toast)?

### E. Entorno (Environment)
- [ ] **.env**: ¿Se requieren nuevas variables de entorno?
- [ ] **Config**: ¿Están cargadas en `back/src/config` o `front/src/config`?

## 3. Acciones de Corrección
Si **cualquiera** de los puntos anteriores falla:
1.  **DETENER** el proceso de entrega.
2.  **IMPLEMENTAR** el componente faltante inmediatamente.
3.  **RE-VERIFICAR** usando este checklist.

## 4. Salida
Solo cuando todas las capas están sincronizadas, se puede proceder a la actualización del Blueprint.
