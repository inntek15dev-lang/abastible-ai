#!/bin/sh

# Esperar a que la DB responda (DNS y Puerto)
echo "Esperando a que la base de datos ($DB_HOST) esté lista..."
MAX_RETRIES=50
COUNT=0

while ! nc -z $DB_HOST 3306; do
  COUNT=$((COUNT + 1))
  if [ $COUNT -gt $MAX_RETRIES ]; then
    echo "❌ Error: La base de datos no respondió tras $MAX_RETRIES segundos. Abortando."
    exit 1
  fi
  echo "⏳ Esperando a la base de datos ($COUNT/$MAX_RETRIES)..."
  sleep 1
done

echo "✅ Base de datos detectada. Sincronizando esquema..."
# Intentamos migrar pero no abortamos si falla (por columnas duplicadas en resets)
npx sequelize-cli db:migrate || echo "⚠️ Advertencia: Algunas migraciones fallaron o ya estaban aplicadas."

echo "🚀 Iniciando servidor..."
npm start