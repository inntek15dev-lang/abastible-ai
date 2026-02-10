@echo off
echo ========================================
echo    OIEM Abastible - Sprint 1 MVP Setup
echo ========================================
echo.

echo [1/4] Instalando dependencias del backend...
cd back
call npm install
cd ..

echo [2/4] Instalando dependencias del frontend...
cd front
call npm install
cd ..

echo [3/4] Ejecutando seed de base de datos...
echo IMPORTANTE: Asegurese de tener MySQL corriendo y la base de datos configurada en back/.env
cd back
call node src/seed.js
cd ..

echo.
echo ========================================
echo    Setup completado!
echo ========================================
echo.
echo Para iniciar:
echo   Backend:  cd back ^&^& npm run dev
echo   Frontend: cd front ^&^& npm run dev
echo.
echo Credenciales de prueba:
echo   admin@abastible.cl / User123*
echo   contratista@demo.cl / User123*
echo.
pause
