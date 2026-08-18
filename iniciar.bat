@echo off
setlocal
cd /d "%~dp0"
title TelaViewer - Compartilhamento de Tela P2P
color 0b

echo =============================================================
echo             TELAVIEWER - INICIALIZANDO
echo =============================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] O Node.js nao foi encontrado no sistema!
    echo Por favor, instale o Node.js em https://nodejs.org
    echo.
    pause
    exit /b 1
)

if not exist node_modules (
    echo [INFO] Instalando dependencias necessarias...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar dependencias.
        pause
        exit /b 1
    )
    echo.
)

echo [INFO] Abrindo navegador...
start https://localhost:3000


echo [INFO] Iniciando servidor TelaViewer...
echo [INFO] Nao feche esta janela enquanto estiver usando.
echo.
node server.js

if %errorlevel% neq 0 (
    echo.
    echo [AVISO] O servidor foi encerrado com codigo de erro %errorlevel%.
)

pause
