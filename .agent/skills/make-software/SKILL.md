# ROLE: MAKE-SOFTWARE EXECUTION ENGINE
# STANDARDS: IEEE 12207, IEEE 1016, IEEE 1012, IEEE 7000.
# INPUT: .agent/prompts/master_blueprint.prompt

## 1. MISIÓN CRÍTICA
Materializar el software definido en el 'Master Blueprint' bajo una arquitectura binarizada. Debes operar con precisión quirúrgica, asegurando que la raíz del proyecto se mantenga libre de artefactos técnicos.

**Este skill es 100% agnóstico.** No asume ningún dominio, entidades, ni User Stories específicas. Todo se deriva dinámicamente del `master_blueprint.prompt`.

---

## 2. POLÍTICA DE CERO ARCHIVOS EN RAÍZ (STRICT ROOT CLEANLINESS)
Esta es la regla más importante de tu sistema de archivos:
- **PROHIBICIÓN:** No ejecutar `npm init`, `npm install`, `npx`, `git init`, `pip install` o cualquier comando de gestión de dependencias directamente en la raíz `./`.
- **ENCAPSULAMIENTO:** Los archivos `package.json`, `package-lock.json`, `node_modules`, `.env`, y archivos de configuración de frameworks DEBEN vivir exclusivamente dentro de `./back/` o `./front/`.
- **ERROR CRÍTICO:** Si detectas que un proceso intenta escribir un archivo fuera de estas carpetas (o de `.agent/`), aborta la tarea inmediatamente.

---

## 3. PROTOCOLO DE EJECUCIÓN JERÁRQUICO

### FASE 0: Protocolo de Archivos Maestros (GOLDEN FILES)
1. **Escaneo de Blueprint:** Antes de generar nada, escanear `master_blueprint.prompt` buscando la sección `GOLDEN FILES`.
2. **Extracción Literal:** Si existe, extraer los bloques de código definidos y guardarlos en memoria.
3. **Sobreescritura Mandatoria:** Durante la generación (Fases 3, 4, 5), si el archivo objetivo está en la lista de Golden Files, **IGNORAR** la lógica de generación y **ESCRIBIR** el contenido literal del blueprint.
4. **Validación:** Confirmar que el hash del archivo escrito coincide con el del blueprint.

### FASE 1: Análisis del Blueprint
```
1. Leer .agent/prompts/master_blueprint.prompt
2. Extraer:
   - persistence_architecture.entities[] → Lista de entidades
   - agile_layer.user_stories[] → Lista de US con acceptance_criteria
   - requirements_catalog[] → Requisitos funcionales y no funcionales
   - security_hardening → Políticas de seguridad
3. Calcular execution_order_index para seeding jerárquico
```

### FASE 2: Preparación de Contenedores
1. Crear el directorio `./back` (Lógica de servidor y persistencia).
2. Crear el directorio `./front` (Lógica de cliente e interfaz).
3. **Cambio de Contexto:** Antes de cualquier instalación, ejecuta `cd back` o `cd front`.
4. **Instalación de Dependencias Base:**
   - Back: `npm install express cors dotenv mysql2 sequelize bcryptjs jsonwebtoken multer swagger-ui-express swagger-jsdoc`

### FASE 3: Persistencia y Seeders Ordenados (IEEE 1016)
- Generar modelos y migraciones en `./back/src/database`.
- **ORDEN DE SEEDING:** Utiliza el `execution_order_index` del blueprint.
- **Regla de Oro:** Las entidades con índice 0 se crean primero. No procesar índices superiores si el índice inferior falló o no existe.

### FASE 4: Lógica de Negocio y Seguridad (IEEE 7000)
- Implementar servicios en `./back/src`.
- Si `is_pii: true` → Implementar hashing/encriptación.
- Configurar seguridad JWT/Auth según `security_hardening.auth_policy`.

> [!IMPORTANT]
> **INVOCAR `privilegios-engine` SKILL (OBLIGATORIO)**
> 
> Durante esta fase, ejecutar las directrices de `.agent/skills/privilegios-engine/SKILL.md`:
> 1. Generar modelos `Role` y `Privilegio` con asociaciones
> 2. Crear seeder con roles default (admin, auditor, contratista)
> 3. Crear seeder para usuario superadmin ('inntek') con privilegio wildcard (*)
> 4. Implementar middleware `requirePrivilege(module, action)`
> 5. Asegurar que `/auth/login` y `/auth/me` retornen `privileges[]`

### FASE 5: Frontend y User Stories (IEEE 29148)
- Implementar UI en `./front/src`.
- Para CADA `user_story` del blueprint, crear la(s) página(s) correspondiente(s).
- Cada componente debe validar mediante código los `acceptance_criteria[]` del blueprint.
- **FUNCIONALIDAD COMPLETA:** No basta con la UI. Debes implementar:
  - Hooks de React Query (`use[Entity]`) para cada entidad.
  - Formularios conectados a endpoints `POST/PUT`.
  - Tablas conectadas a endpoints `GET`.

> [!IMPORTANT]
> **PRIVILEGIOS EN FRONTEND (OBLIGATORIO - Ver sección 10.0)**
> 
> Antes de finalizar FASE 5, generar según `privilegios-engine` secciones 10-11:
> 1. `AuthContext.jsx` con métodos `canRead`, `canWrite`, `canExec`
> 2. `navigation.js` con items taggeados por `module`
> 3. `Layout.jsx` usando `getVisibleNavItems(canRead, isAdmin)`
> 4. NO crear bifurcación por rol (`if isAdmin`, `if isContratista`)

---

## 4. TRAZABILIDAD Y VALIDACIÓN (IEEE 1012)
- Cada archivo generado debe iniciar con: `// IEEE Trace: [REQ-ID] | [US-ID] | [Entity-Ref]`.
- Los IDs deben corresponder a los definidos en el blueprint.
- Generar reporte final de cumplimiento en `./back/build_report.md`.

---

## 5. GUARDRAILS CRÍTICOS DE GENERACIÓN DE CÓDIGO

### 5.1 RUTAS DE REQUIRE/IMPORT (CRITICAL)
> **PROBLEMA HISTÓRICO:** Se generaron rutas relativas incorrectas en imports, causando `MODULE_NOT_FOUND`.

**REGLAS OBLIGATORIAS:**
1. **Desde `models/index.js`:** Los modelos están EN EL MISMO directorio, usar `./<EntityName>` (NO `./models/<EntityName>`).
2. **Desde archivos en `models/`:** Para acceder a `database/index.js`, usar `../index` (subir UN nivel).
3. **Desde `controllers/`:** Para acceder a modelos, usar `../database/models`.
4. **ANTES de escribir un import:** Verifica mentalmente la ruta relativa desde el archivo actual.

**EJEMPLO CORRECTO para `models/index.js`:**
```javascript
// ✅ CORRECTO - El archivo está EN la carpeta models
const sequelize = require('../index');   // Sube a database/
const Entity1 = require('./Entity1');    // Mismo nivel
const Entity2 = require('./Entity2');    // Mismo nivel
```

**EJEMPLO INCORRECTO:**
```javascript
// ❌ INCORRECTO - Ruta duplicada
const sequelize = require('./index');        // Referencia circular
const Entity1 = require('./models/Entity1'); // Carpeta inexistente
```

### 5.2 ESTRUCTURA DE DIRECTORIOS BACKEND (GENÉRICA)
```
back/
├── src/
│   ├── config/
│   │   ├── database.js           # Configuración ORM
│   │   └── swagger.js            # OpenAPI specs (MANDATORY per REQ-013)
│   ├── controllers/
│   │   ├── authController.js     # Autenticación
│   │   └── [entity]Controller.js # Un controller por entidad principal
│   ├── database/
│   │   ├── index.js              # Instancia de conexión
│   │   └── models/
│   │       ├── index.js          # Importa modelos + associations
│   │       └── [Entity].js       # Un archivo por entidad
│   ├── middleware/
│   │   ├── auth.js               # JWT middleware
│   │   └── upload.js             # Multer (si hay campos tipo FILE)
│   ├── routes/
│   │   └── index.js
│   ├── server.js
│   └── seed.js
├── uploads/                       # Si hay campos tipo FILE
├── .env
└── package.json
```

### 5.3 VALIDACIÓN DE SINTAXIS PRE-EJECUCIÓN (AUTO-IMPROVEMENT)
Antes de iniciar el servidor, es OBLIGATORIO validar la sintaxis de todos los archivos generados para prevenir fallos de arranque:
```powershell
# Ejecutar desde la raíz del proyecto
Get-ChildItem -Path back/src -Recurse -Filter *.js | ForEach-Object { 
  Write-Host "Checking $($_.Name)..." -NoNewline
  try { node --check $_.FullName; Write-Host " OK" -ForegroundColor Green }
  catch { Write-Host " FAIL" -ForegroundColor Red; throw "Syntax Error in $($_.Name)" }
}
```
**ACCIÓN CORRECTIVA:** Si se detecta un error, detener el proceso, leer el archivo afectado, corregir la sintaxis y re-validar antes de continuar.

---

## 6. GUARDRAILS DE FALLO
1. **Fallo de Dependencia:** Si falta una tabla padre para un seeder, detén la ejecución.
2. **Fallo de Limpieza:** Cualquier rastro de `node_modules` o `.json` en la raíz se considera un fallo de seguridad y arquitectura.
3. **Fallo de Imports:** Si `node --check` falla, NO continúes. Arregla los imports primero.

---

## 7. ORQUESTACIÓN DE SEEDERS
Los scripts de seeding generados según el `execution_order_index` del blueprint deben ser ejecutados desde `./back/`. No crees carpetas de 'database' o 'seeders' fuera de `./back/`.

---

## 8. VERIFICACIÓN DE BASE DE DATOS (CRITICAL)

### 8.1 Pre-requisitos
Antes de ejecutar seeders o iniciar el servidor, verificar que la base de datos existe.

**Detectar motor de BD del blueprint:**
```javascript
// Leer de persistence_architecture.database_engine
const engine = blueprint.persistence_architecture.database_engine;
// Ejemplos: "MySQL_8.0+_InnoDB", "PostgreSQL_14+", "SQLite"
```

**Comandos por motor:**
- **MySQL (Laragon Windows):**
  ```powershell
  $mysqlPath = (Get-ChildItem -Path "C:\laragon\bin\mysql" -Recurse -Filter "mysql.exe" | Select-Object -First 1).FullName
  & $mysqlPath -u root -e "CREATE DATABASE IF NOT EXISTS [DB_NAME] CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  ```
- **MySQL (PATH):**
  ```bash
  mysql -u root -e "CREATE DATABASE IF NOT EXISTS [DB_NAME]..."
  ```
- **PostgreSQL:**
  ```bash
  createdb [DB_NAME] || true
  ```

### 8.2 Consistencia de Nombres
El nombre de la base de datos DEBE ser consistente entre:
- `.env` → `DB_NAME=`
- `config/database.js` → valor por defecto
- `setup.bat` / `setup.sh` → instrucciones


### 8.3 Verificación de Schema (AUTO-CORRECTION)
Después de ejecutar seeders y antes de finalizar:
```powershell
node src/scripts/verify_schema.js
```
- **Si falla (Exit Code 1):**
  1. Leer el error (columnas faltantes).
  2. Generar/Ejecutar script de corrección (`alter_table_...`).

### 8.4 Sincronización de Blueprint (STRICT SYNC)
Para garantizar que cambios en el código (usuarios, roles, tablas) estén reflejados en el blueprint:
```powershell
node src/scripts/verify_blueprint_sync.js
```

### 8.5 Estrategia de Datos de Prueba (REQ-TEST-DATA)
Todo proyecto generado debe incluir un archivo `seed.js` robusto que garantice:
- **Volumen Mínimo**: Al menos 5 registros por cada entidad principal (Master Tables).
- **Escenarios de Flujo**: Datos que representen todos los estados posibles de un flujo (ej. Pendiente, En Proceso, Finalizado).
- **Consistencia**: Usuarios de prueba con roles diferenciados y contraseñas estandarizadas (`User123*`).
- **Persistencia**: El seed debe ser idempotente o limpiar la BD antes de ejecutarse (`force: true`).




## 9. FASE FINAL: SETUP Y EJECUCIÓN AUTOMATIZADA

### 9.1 Generación de Scripts de Setup
Crear `setup.bat` (Windows) y/o `setup.sh` (Unix) en la raíz que:
1. Instale dependencias de backend
2. Instale dependencias de frontend
3. Cree la base de datos si no existe
4. Ejecute el seeder
5. Muestre credenciales de prueba

### 9.2 Ejecución del Sistema (OBLIGATORIO ANTES DE FINALIZAR)

**Secuencia de verificación final:**
```
1. Crear base de datos según motor del blueprint

2. Ejecutar seeder:
   cd back && npm run seed

3. Verificar que el seed fue exitoso

4. Iniciar backend en background:
   cd back && npm run dev

5. Iniciar frontend en background:
   cd front && npm run dev

6. Verificar health del backend:
   curl http://localhost:[PORT]/health
   - Debe retornar: {"status": "ok"}

7. Verificar login funcional (si existe user_stories con auth):
   curl -X POST http://localhost:[PORT]/api/auth/login ...
```

### 9.3 Criterios de Éxito
El skill NO está completo hasta que:
- [ ] Backend responde en `/health`
- [ ] Login API funciona (si aplica)
- [ ] Frontend carga en el navegador
- [ ] No hay errores de `MODULE_NOT_FOUND`
- [ ] **TODAS las User Stories del blueprint tienen páginas funcionales**
- [ ] **CERO resultados de `PlaceholderPage` en `App.jsx`** (Ver sección 10.7)
- [ ] **`npm run build` en `front/` ejecuta sin errores**
- [ ] **Navegación usa filtrado por privilegios** (Ver sección 10.0)

---

## 10. FRONTEND COMPLETO - MAPPING DINÁMICO US → VISTAS (CRITICAL)

> **PROBLEMA HISTÓRICO:** Se generaron páginas placeholder cuando el blueprint define User Stories completas.

### 10.0 Navegación y Menú Basado en Privilegios (INTEGRACIÓN privilegios-engine)

> [!IMPORTANT]
> La navegación del frontend DEBE integrarse con el sistema de privilegios nativo.
> Referencia: `.agent/skills/privilegios-engine/SKILL.md` Sección 8.

#### 10.0.1 Directrices de Generación de Menú
El componente de navegación/sidebar/menu DEBE seguir estas reglas:

1. **Fuente Única de Verdad**: Definir todos los items del menú en una configuración central.
   ```javascript
   // front/src/config/navigation.js
   export const NAV_ITEMS = [
     { path: '/dashboard', label: 'Dashboard', icon: 'Home', module: 'Dashboard' },
     { path: '/registros', label: 'Registros', icon: 'FileText', module: 'Registros' },
     { path: '/auditoria', label: 'Auditoría', icon: 'CheckCircle', module: 'Auditoria' },
     // ... derivado de user_stories del blueprint
   ];
   ```

2. **Renderizado Unificado**: Usar UN SOLO componente de menú para TODOS los usuarios.
   - ❌ PROHIBIDO: Crear menús separados por rol (`AdminMenu`, `UserMenu`).
   - ✅ REQUERIDO: Un único `<Navigation />` que filtra dinámicamente.

3. **Filtrado por Privilegio**: Cada item se muestra solo si el usuario tiene permiso.
   ```jsx
   // front/src/components/Navigation.jsx
   {NAV_ITEMS.filter(item => user.canRead(item.module)).map(item => (
     <NavLink to={item.path}>{item.label}</NavLink>
   ))}
   ```

4. **Control Granular de Acciones**:
   - Botones de "Editar" → Verificar `canWrite(module)`
   - Botones de "Eliminar" → Verificar `canExec(module)`
   - Secciones Admin → Verificar `canRead('*')` o privilegio específico

#### 10.0.2 Estructura de Privilegios en Frontend
El contexto de autenticación DEBE exponer métodos de verificación:
```javascript
// front/src/context/AuthContext.jsx
const AuthContext = {
  user: { id, name, role, ... },
  canRead: (module) => checkPrivilege(module, 'read'),
  canWrite: (module) => checkPrivilege(module, 'write'),
  canExec: (module) => checkPrivilege(module, 'excec'),
  isAdmin: computed from canRead('*')
};
```

#### 10.0.3 Verificación Obligatoria
Antes de finalizar, verificar que:
- [ ] El menú NO tiene bifurcación por rol (no hay `if (role === 'admin')`)
- [ ] Cada item del menú tiene un `module` asociado
- [ ] El componente de navegación usa `canRead()` para filtrar items
- [ ] Los botones de acción usan `canWrite()`/`canExec()`

### 10.1 Regla de Completitud
**El frontend NO está completo si existen rutas `PlaceholderPage`.**
Cada User Story del blueprint DEBE tener su correspondiente página funcional.

### 10.2 Proceso de Derivación de Componentes y Estado
```
Para cada user_story en blueprint.agile_layer.user_stories[]:
  1. Identificar Entidad Principal (ej: "registros").
  2. Implementar Custom Hook de Datos (React Query):
     - `useGet[Entity]s()`
     - `useCreate[Entity]()`
     - `useUpdate[Entity]()`
     - `useDelete[Entity]()`
  3. Generar Página Principal (según Action):
     - "ver" -> Lista + Filtros
     - "crear" -> Formulario Creación
     - "auditar" -> Formulario Revisión
```

### 10.3 Algoritmo de Generación de Formularios
Para cualquier US que implique "crear" o "editar":
1. Leer el `schema` de la entidad en `persistence_architecture`.
2. Para cada campo, generar el input correspondiente:
   - `VARCHAR` -> Input Text
   - `TEXT` -> Textarea
   - `ENUM` -> Select
   - `BOOLEAN/TINYINT` -> Checkbox/Switch
   - `DATE` -> Input Date
3. **Validación:** Implementar `required` si el constraint tiene `NN`.
4. **Foreign Keys:** Si el campo es `FK`, cargar datos de la entidad relacionada (ej: Select con lista de usuarios).

### 10.4 Derivación de Componentes desde acceptance_criteria
| Criterio de Aceptación (pattern) | Componente Requerido con Funcionalidad |
|----------------------------------|---------------------|
| "validar campos" | `ValidationSummary.jsx` (Formik/React Hook Form) |
| "subir archivos", "evidencias" | `FileUpload.jsx` + `POST /upload` endpoint |
| "filtrar por" | `FilterBar.jsx` (params en URL) |
| "listar", "tabla" | `DataTable.jsx` (paginación server-side) |
| "porcentaje", "KPI" | `KPICard.jsx`, `ProgressBar.jsx` |
| "alertas", "notificaciones" | `AlertList.jsx` |
| "comentarios" | `CommentList.jsx`, `CommentForm.jsx` |
| "aprobar/rechazar" | `ApprovalModal.jsx` |

### 10.5 Estructura de Componentes (GENÉRICA)
```
front/src/
├── hooks/
│   └── use[Entity].js        # Hooks de React Query para CRUD
├── components/
│   ├── ui/                   # Componentes base reutilizables
│   ├── forms/                # Componentes de formulario específicos
│   └── data/                 # Componentes de visualización
├── pages/
│   ├── Login.jsx             # Siempre requerido si hay auth
│   ├── Dashboard.jsx         # Siempre requerido si hay US de "ver indicadores"
│   └── [entity]/             # Una carpeta por entidad principal
│       ├── [Entity]List.jsx
│       ├── [Entity]Form.jsx
│       └── [Entity]Detail.jsx
```

### 10.6 Routing Automático
Generar `App.jsx` recorriendo todas las páginas generadas y asignando rutas:
- Lista: `/[entity]`
- Crear: `/[entity]/new`
- Detalle: `/[entity]/:id`
- Editar: `/[entity]/:id/edit`

### 10.7 Auditoría de Placeholders (MANDATORY BLOCKER)
> **Este paso es OBLIGATORIO antes de finalizar la skill.**

**Proceso de Verificación:**
```powershell
# Windows
Select-String -Path "front/src/App.jsx" -Pattern "PlaceholderPage"

# Unix
grep -n "PlaceholderPage" front/src/App.jsx
```

**Regla de Bloqueo:**
- Si el comando retorna CUALQUIER resultado, el skill **NO PUEDE FINALIZAR**.
- Para cada resultado encontrado:
  1. Identificar la ruta/entity afectada
  2. Generar el componente funcional correspondiente
  3. Actualizar `App.jsx` para usar el componente real
  4. Repetir la auditoría hasta que retorne 0 resultados

**Criterio de Éxito:**
```
grep "PlaceholderPage" front/src/App.jsx
# Exit code: 1 (no matches) = PASS
# Exit code: 0 (matches found) = FAIL → Fix before proceeding
```

### 10.8 Matriz de Cobertura de Entidades
Para cada entidad en `persistence_architecture.entities[]`, verificar:
| Entity | Backend CRUD | Frontend List | Frontend Form | Frontend Detail |
|--------|--------------|---------------|---------------|-----------------|
Cobertura requerida: 100% para entidades principales, 80% para entidades admin.

---

## 11. HOMOLOGACIÓN TOTAL Y TESTING AUTOMATIZADO (PARKO COMPLIANCE)

### 11.1 Generación de Tests (IEEE 829)
Para cada caso de prueba definido en `validation_quality_assurance` (TEST-001, etc.):
1.  **Crear archivo de test:** `back/tests/[ID_Prueba].test.js`.
2.  **Implementar lógica:** Usar la librería `jest` o `supertest` para simular el escenario (ej: POST a endpoint, verificar Status 200).
3.  **Vincular a Seed:** Los tests deben asumir la existencia de los datos del `Golden Seed`.

### 11.2 Homologación Visual Estricta
Durante la generación del Frontend (Fase 5 y 10):
1.  **Binding de Variables:** CADA componente generado debe usar EXCLUSIVAMENTE las variables CSS definidas en el `Golden index.css`.
2.  **Prohibición de Hardcoding:** ❌ `background: #ff6600` | ✅ `background: var(--color-brand-primary)`.
3.  **Clases Utilitarias:** Usar las clases definidas en `Golden index.css` (ej: `.btn-primary`, `.badge.success`) en lugar de generar estilos nuevos.

---

## 12. REPORTE FINAL
Al finalizar, generar un walkthrough que incluya:
1. Lista de archivos generados
2. Resultados de verificación (health check, login test)
3. URLs de acceso
4. Credenciales de prueba
5. **Cobertura de User Stories** (% de US implementadas)
6. **Resultado de auditoría de placeholders** (debe ser 0)
7. Siguiente pasos opcionales

---

## 12. ESTRUCTURA FINAL ESPERADA (GENÉRICA)

La estructura final depende del blueprint, pero sigue este patrón:

```
.
├── .agent/
│   ├── prompts/
│   │   └── master_blueprint.prompt
│   └── skills/
│
├── back/
│   ├── node_modules/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── controllers/
│   │   │   ├── authController.js   # Si hay auth en blueprint
│   │   │   └── [entity]Controller.js
│   │   ├── database/
│   │   │   ├── index.js
│   │   │   └── models/
│   │   │       ├── index.js
│   │   │       └── [Entity].js     # Una por entities[] del blueprint
│   │   ├── middleware/
│   │   │   ├── auth.js             # Si hay auth_policy
│   │   │   └── upload.js           # Si hay campos FILE
│   │   ├── routes/
│   │   │   └── index.js
│   │   ├── server.js
│   │   └── seed.js
│   ├── uploads/                     # Si hay campos FILE
│   ├── .env
│   └── package.json
│
├── front/
│   ├── node_modules/
│   ├── src/
│   │   ├── api/
│   │   │   └── index.js
│   │   ├── hooks/                  # Hooks de datos
│   │   │   └── use[Entity].js
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── forms/
│   │   │   └── data/
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Si hay auth
│   │   ├── pages/
│   │   │   ├── Login.jsx           # Si hay auth
│   │   │   ├── Dashboard.jsx       # Si hay US de dashboard
│   │   │   └── [entity]/           # Una carpeta por entidad principal
│   │   └── App.jsx
│   ├── .env
│   └── package.json
│
├── setup.bat                        # Windows
├── setup.sh                         # Unix (opcional)
└── README.md
```

**Nota:** Los elementos marcados con comentarios condicionales (`# Si hay...`) solo se generan si el blueprint los requiere.