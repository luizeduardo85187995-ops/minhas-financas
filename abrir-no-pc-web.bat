@echo off
setlocal
cd /d "%~dp0"

echo.
echo ==========================================
echo   Minhas Financas - versao PC/Web
echo ==========================================
echo.

where pnpm >nul 2>nul
if errorlevel 1 (
  echo PNPM nao encontrado. Instale as dependencias primeiro ou abra pelo Codex/terminal configurado.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando dependencias...
  pnpm install
  if errorlevel 1 (
    echo Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)

echo Gerando versao Web...
pnpm run build:web
if errorlevel 1 (
  echo Falha ao gerar versao Web.
  pause
  exit /b 1
)

echo Abrindo no navegador...
start "" "http://localhost:4173"
pnpm run preview:web

pause
