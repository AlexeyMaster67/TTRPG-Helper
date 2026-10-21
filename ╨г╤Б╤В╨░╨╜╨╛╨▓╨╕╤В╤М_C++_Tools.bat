@echo off
chcp 65001 > nul
echo ========================================================
echo   Запуск Visual Studio Installer для C++ Build Tools
echo ========================================================
echo.
echo Сейчас откроется Visual Studio Installer с предвыбранными
echo компонентами C++ и Windows SDK.
echo.
echo Нажмите "Изменить" (Modify) в открывшемся окне.
echo.

powershell -Command "Start-Process 'C:\Program Files (x86)\Microsoft Visual Studio\Installer\setup.exe' -ArgumentList 'modify --installPath \"\"\"C:\Program Files\Microsoft Visual Studio\18\Community\"\"\" --add Microsoft.VisualStudio.Workload.NativeDesktop --includeRecommended' -Verb RunAs"

pause
