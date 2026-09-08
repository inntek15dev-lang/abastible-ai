# Plan de Migración: Control de Acceso 100% Basado en Matriz de Privilegios (Seeder Driven)

## 📋 Resumen Ejecutivo
El objetivo de este plan es eliminar todos los **hardcodeos y excepciones manuales por rol** existentes en el middleware de permisos (`requirePrivilege.js`), delegando la totalidad de las reglas de autorización a la **Matriz de Privilegios** persistida en la tabla `privilegios` de la base de datos MySQL.

El resultado esperado es que el sistema mantenga **exactamente la misma funcionalidad y nivel de seguridad**, pero con un control de acceso transparente, auditable y editable directamente desde la pantalla de la **Matriz de Privilegios** por los administradores.

---

## 🔍 Diagnóstico de Hardcodeos Actuales en Código

Actualmente en `back/src/middleware/requirePrivilege.js` existen las siguientes reglas por código:

1. **Excepción de Módulo OVAL**: Restringe el módulo `OVAL` exclusivamente al rol `oval` *(Regla de seguridad que se mantendrá como barrera de sistema)*.
2. **Bloqueo Estricto de Usuarios para Contratista User**: Bloquea a `contratista_user` en `Usuarios` y `Admin_Usuarios`.
3. **Bypass Completo de Admin y OVAL**: `admin` y `oval` se saltan la consulta a la matriz.
4. **Bypass de Usuarios para Contratista Admin**: Otorga acceso directo a `Usuarios` a `contratista_admin`.
5. **Bypass de Lectura de Usuarios para ADC**: Otorga acceso de lectura a `Usuarios` para `administrador_contrato`.
6. **Bypass de Módulos Operativos (Registros, Evidencias, Compromisos)**: Otorga acceso directo de lectura/escritura a `contratista_user`, `contratista_admin` y `administrador_contrato`.

---

## 🎯 Arquitectura Propuesta: Matriz Canónica por Seeder

Se creará un script seeder idempotente `back/scripts/seed_matrix_privileges.js` (e integrado a los flujos de CI/CD `deploy-prepro.yml` y `deploy-prod.yml`) que poblará y sincronizará la tabla `privilegios` con la siguiente matriz exacta:

### 📊 Matriz de Privilegios Objetivo por Rol

| Módulo / Componente | ADMIN | OVAL | ADMINISTRADOR_CONTRATO | CONTRATISTA_ADMIN | CONTRATISTA_USER |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Dashboard** | R/W/X | R | R | R | R |
| **Programas** | R/W/X | R | R | R | R |
| **Elementos** | R/W/X | R | R | — | — |
| **Actividades** | R/W/X | R | R/W | — | — |
| **Registros** | R/W/X | R | R/W | R/W/X | R/W |
| **Registros_Exportar** | R/W/X | R | R/W | R/W | R/W |
| **Auditoria** | R/W/X | R | R/W | — | — |
| **Hallazgos** | R/W/X | R | R/W/X | — | — |
| **Compromisos** | R/W/X | R | R/W | R/W | R/W |
| **Evidencias** | R/W/X | R | R/W | R/W/X | R/W/X |
| **Reaperturas** | R/W/X | R | R/W/X | — | — |
| **Usuarios** | R/W/X | — | R | R/W | — |
| **Admin_Usuarios** | R/W/X | — | — | — | — |
| **Gestion_Configuracion** | R/W/X | — | R/W | — | — |
| **Dependencias** | R/W/X | — | R/W | — | — |
| **Servicios** | R/W/X | — | R/W | — | — |
| **Vinculaciones** | R/W/X | — | R/W | R | R |
| **Licitaciones** | R/W/X | — | R | R | R |
| **Licitaciones_Crear** | R/W/X | — | — | — | — |
| **Licitaciones_Postular**| R/W/X | — | — | R/W | R/W |
| **OVAL** *(Facturación)* | — | R/W/X | — | — | — |

*Leyenda: **R** = Leer (Read), **W** = Escribir (Write), **X** = Ejecutar/Eliminar (Exec).*

---

## 🛠️ Pasos de Ejecución (Plan de Acción)

### Fase 1: Creación del Seeder Maestro de Privilegios
1. Crear el script `back/scripts/seed_matrix_privileges.js`.
2. Definir la matriz estructural objeto JSON en el script con todos los módulos y acciones (`read`, `write`, `excec`).
3. Aplicar inserción o actualización inteligente en `privilegios` mediante `bulkCreate` o `upsert` por `role_id` y `ref_modulo`.
4. Incluir log detallado de sincronización.

### Fase 2: Refactorización Limpia del Middleware `requirePrivilege.js`
1. Mantener la verificación de autenticación (`!req.user` -> 401).
2. Mantener la barrera de seguridad del módulo exclusivo `OVAL` (exclusivo para rol `oval`).
3. Eliminar todos los bloques `if (role === '...') return next();` hardcodeados para `Registros`, `Evidencias`, `Compromisos`, `Usuarios`, etc.
4. Evaluar la autorización **únicamente** contra `req.user.privileges`:
   - Verificar wildcard `*` o módulo específico `privileges[module]?.[action]`.
   - Si no existe el permiso habilitado en la matriz para ese rol, retornar 403 Access Denied.

### Fase 3: Integración en Pipeline de Despliegue (CI/CD)
1. Agregar la ejecución del seeder en `back/src/seed.js` para entornos locales.
2. Agregar la instrucción `node scripts/seed_matrix_privileges.js` en los workflows de GitHub Actions ([deploy-prepro.yml](file:///home/psolis/Desktop/GitHub/abastible-ai/.github/workflows/deploy-prepro.yml) y `deploy-prod.yml`).

---

## 🧪 Plan de Verificación y Pruebas

Para garantizar cero regresiones operativas, se ejecutarán las siguientes pruebas de humo por rol tras aplicar el seeder y refactor:

1. **Prueba `contratista_user`**:
   - `GET /api/registros` -> Status 200 (Lectura permitida).
   - `POST /api/registros` (Borrador) -> Status 201 (Escritura permitida por matriz).
   - `GET /api/usuarios` -> Status 403 (Sin permiso en matriz).
2. **Prueba `contratista_admin`**:
   - `POST /api/registros` -> Status 201.
   - `GET /api/usuarios` -> Status 200 (Permitido por matriz, filtrado a su empresa).
3. **Prueba `administrador_contrato`**:
   - `POST /api/registros/:id/auditar` -> Status 200.
   - `GET /api/usuarios` -> Status 200 (Solo lectura permitida por matriz).
4. **Prueba `admin`**:
   - Acceso total a todos los módulos salvo `OVAL` (Status 403 en `OVAL`).
5. **Prueba `oval`**:
   - `GET /api/reportes/oval/billing` -> Status 200 (Único rol con acceso).
