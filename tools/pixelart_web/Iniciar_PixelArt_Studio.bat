@echo off
title Pixel Art AI Studio
chcp 65001 > nul
echo ==============================================
echo   Iniciando Pixel Art AI Studio...
echo   Porta: 7860 (Porta 5000 liberada!)
echo ==============================================
echo.
cd /d "%~dp0"
"C:\Users\Deon\AppData\Local\PixelAI\runtime\python\python.exe" app.py --port 7860
pause
