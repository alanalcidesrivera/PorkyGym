@echo off
title PorkyGym - Backend (Django en puerto 8000)
cd /d "%~dp0"

call venv\Scripts\activate.bat
if errorlevel 1 (
    echo.
    echo No se pudo activar el entorno virtual (venv).
    echo Crea uno nuevo con:  python -m venv venv
    echo Luego instala las dependencias:  pip install -r requirements.txt
    pause
    exit /b 1
)

REM Aplica migraciones pendientes si las hay (no falla si ya estan al dia)
python manage.py migrate

echo.
echo ============================================
echo  Backend corriendo en  http://127.0.0.1:8000
echo  Admin Django:         http://127.0.0.1:8000/admin/
echo  Para cerrar: presiona Ctrl+C
echo ============================================
echo.
python manage.py runserver 127.0.0.1:8000
pause
