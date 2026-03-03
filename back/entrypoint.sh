#!/bin/sh
# Esperar a que la DB responda (puedes usar herramientas como wait-for-it)
echo "Ejecutando migraciones y seeds..."
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all

echo "Iniciando servidor..."
npm start