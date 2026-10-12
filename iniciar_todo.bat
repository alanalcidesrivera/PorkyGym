@echo off
title PorkyGym - Arrancar todo
echo.
echo   Arrancando Backend (Django) y Frontend (Vite)...
echo   Se abriran dos ventanas, una para cada uno.
echo   La primera vez el frontend puede tardar unos segundos en cargar.
echo.

start "" "%~dp0Backend\iniciar_backend.bat"

REM Espera a que el backend levante antes de abrir el frontend
timeout /t 5 /nobreak >nul

start "" "%~dp0Fronted\iniciar_frontend.bat"

echo   Listo. Abre en el navegador:  http://localhost:3000
echo.
timeout /t 5 >nul
