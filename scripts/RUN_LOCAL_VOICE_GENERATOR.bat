@echo off
chcp 65001 >nul
title DEEPSYQ JARVIX - Генерация 500 ответов 2000 MP3
echo =======================================================
echo     DEEPSYQ JARVIX: ПАКЕТНАЯ ГЕНЕРАЦИЯ 2000 MP3
echo     Голос: Tour-v3 Эталон владельца
echo     Языки: Русский, Английский, Испанский, Французский
echo =======================================================
echo.

cd /d "C:\Users\velot\Jarvis"

rem Проверяем, запущен ли голосовой сервер на порту 8765
netstat -ano | findstr 8765 >nul
if errorlevel 1 goto start_server
goto server_ok

:start_server
echo Запуск VoxCPM2 на порту 8765...
start "JARVIS - ГОЛОС 8765" powershell -NoExit -Command "cd 'C:\Users\velot\Jarvis'; .\.venv\Scripts\python.exe -m uvicorn jarvis_server:app --host 127.0.0.1 --port 8765"
timeout /t 10 >nul
goto run_gen

:server_ok
echo Голосовой сервер уже активен на порту 8765.

:run_gen
echo.
echo Запуск скрипта генерации 2000 аудиофайлов...
"C:\Users\velot\Jarvis\.venv\Scripts\python.exe" -u "C:\Users\velot\.gemini\antigravity\scratch\f1-smart-decision\scripts\generate_unified_500_clips.py"

echo.
echo =======================================================
echo   Все файлы сохранены в:
echo   f1-smart-decision\app\src\main\assets\media\jarvix\clips\
echo =======================================================
pause
