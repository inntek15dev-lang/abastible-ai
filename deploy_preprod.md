# Manual de Despliegue Docker (Pre-Producción)

Este documento detalla los pasos para levantar la infraestructura completa de **OIEM Abastible** en un VPS (ej: entorno Inntek), aislando el servicio mediante Docker Compose, y configurando la inyección dinámica de dominios.

## Requisitos Previos en el Servidor (VPS)
1. **Docker Engine y Docker Compose** instalados.
2. **Git** instalado.
3. Puertos libres: `4077` (Backend API), `8087` (Frontend Nginx).
4. Un proxy reservo (Nginx Proxy Manager, Traefik o Caddy) configurado para manejar los certificados SSL/TLS y apuntar los dominios a los puertos internos:
   - `oiem-abastible.inntek.cl` -> `localhost:8087`
   - `oiem-abastible-api.inntek.cl` -> `localhost:4077`

## Arquitectura de Entornos (Importante)
El código utiliza un orquestador de **3 contenedores**:
1. **db**: Instancia de MySQL 8 persistente.
2. **api**: Backend en Node.js conectado a la DB local.
3. **frontend**: SPA renderizada en Nginx con variables dinámicas en tiempo de ejecución.

El **Frontend recibe las variables de entorno en tiempo de ejecución (Run-time)** en lugar de tiempo de construcción (Build-time). Esto significa que **la misma imagen de Docker** puede utilizarse para Producción, Pre-Producción y Localhost simplemente cambiando el archivo `docker-compose.yml`.
- Local (Render): Continúa usando `import.meta.env`.
- Docker: El script `/docker-entrypoint.d/env.sh` genera un `env-config.js` que sobrescribe las variables y le enseña a Axios a dónde apuntar dinámicamente.

## Paso 1: Clonar y Preparar el Entorno
Descarga el código en el servidor:
```bash
git clone https://ruta-al-repositorio/oiem-abastible.git
cd oiem-abastible
```

*(Nota: Asegúrate de estar en la rama correcta como `main` o `preprod`).*

## Paso 2: Ajuste de Variables (`docker-compose.yml`)
Edita el archivo `docker-compose.yml` en la raíz del proyecto para ajustar las credenciales de la base de datos externa o contenedorizada. 

Las variables clave son:
- **Base de Datos (`db`)**:
  - `MYSQL_ROOT_PASSWORD`: Contraseña maestra para la BD.
  - `MYSQL_DATABASE`: Nombre de la base de datos que se creará automáticamente.
  *(Asegúrate de que estas variables coincidan con las del backend)*
- **Backend (`api`)**:
  - Usa por defecto `DB_HOST=db` para hablar con el contenedor de la base de datos por la subred interna.
  - `FRONTEND_URL`: URL exacta del Front (ej: `https://oiem-abastible.inntek.cl`).
- **Frontend (`frontend`)**:
  - `VITE_API_URL`: URL exacta del Backend (ej: `https://oiem-abastible-api.inntek.cl/api`). **Nota el /api al final**.

## Paso 3: Construir y Levantar Contenedores
Ejecuta el orquestador en segundo plano (detached):
```bash
docker compose up -d --build
```
*Este proceso instalará dependencias de Node.js, compilará la versión estática de React/Vite, e iniciará el Backend con PM2/Node.*

## Paso 4: Verificación y Logs
Valida que ambos contenedores estén en estado `Up`:
```bash
docker compose ps
```

Puedes ver los logs en tiempo real para asegurar la conexión a la Base de Datos:
```bash
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f db
```

### Rutas de Pruebas:
1. **Health Check API**: Abre en un navegador `https://oiem-abastible-api.inntek.cl/health` (debería retornar `{ "status": "ok", "database": "connected" }`).
2. **Swagger Docs**: Accede a `https://oiem-abastible-api.inntek.cl/api-docs` y verifica el selector "Servers".
3. **Frontend App**: Navega a `https://oiem-abastible.inntek.cl`. Revisa la consola devtools (F12) escribiendo `window.ENV.VITE_API_URL`. Debiese mostrar la ruta del punto 1.
4. **Seed de la BD**: Si recién has levantado el entorno y la BD está vacía, puedes ejecutar el seeder dentro del contenedor:
   ```bash
   docker exec -it oiem_abastible_api npm run seed
   ```

## Mantenimiento

**Para actualizar a una nueva versión:**
```bash
# 1. Bajar los últimos cambios
git pull origin main

# 2. Reconstruir las imágenes forzando la recreación
docker compose up -d --build --force-recreate
```

**Para detener el entorno:**
```bash
docker compose down
```

### Manejo de Archivos (Persistencia)
Los archivos subidos (Templates PDF, Evidencias, Imágenes) a través de la carpeta `storage` están mapeados como volumen en `docker-compose.yml`. Aunque destruyas el contenedor, los archivos persistirán físicamente en el servidor anfitrión dentro del directorio `./storage/`.
