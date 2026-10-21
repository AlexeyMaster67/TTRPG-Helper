@echo off
chcp 65001 > nul
echo ========================================================
echo   Сборка установщика TTRPG Helper (Setup.exe)
echo ========================================================
echo.

set PATH=C:\Program Files\nodejs;%USERPROFILE%\.cargo\bin;%PATH%

cd /d "%~dp0"

echo 1. Проверка окружения...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден в PATH!
    pause
    exit /b 1
)

where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Cargo/Rust не найден в PATH!
    pause
    exit /b 1
)

echo 2. Запуск сборки и копирования в корень проекта...
call npm run build:setup

echo.
echo ========================================================
echo   Готово!
echo ========================================================
pause
