#!/bin/sh
# Recrear env-config.js usando la variable de entorno real
echo "window.ENV = {" > /usr/share/nginx/html/env-config.js
echo "  VITE_API_URL: \"$VITE_API_URL\"" >> /usr/share/nginx/html/env-config.js
echo "};" >> /usr/share/nginx/html/env-config.js

# Iniciar Nginx
exec "$@"
