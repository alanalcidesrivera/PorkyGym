@echo off
title PorkyGym - Frontend (Vite en puerto 3000)
cd /d "%~dp0"

if not exist node_modules (
    echo.
    echo Instalando dependencias por primera vez, esto tarda un poco...
    call npm install --no-audit --no-fund
)

echo.
echo ============================================
echo  Frontend corriendo en  http://localhost:3000
echo  Para cerrar: presiona Ctrl+C
echo ============================================
echo.
npm run dev
pause
