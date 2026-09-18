@echo off
cd /d "%~dp0"
set STATIC_ROOT=web-build
set PORT=8083
echo Abrindo Minhas Financas no notebook...
echo URL: http://localhost:8083
start "" http://localhost:8083
node server\serve.js
