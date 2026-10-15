@echo off
title Sakk es Szudoku Online
cd /d "%~dp0"

echo ===================================================
echo     Sakk es Szudoku Online Inditasa...
echo ===================================================

where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    py server.py
    goto end
)

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    python server.py
    goto end
)

echo Python nem talalhato, megnyitas kozvetlenul a bongeszoben...
start index.html

:end
