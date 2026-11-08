@echo off
chcp 65001 >nul
title DeepSyQ Local Preview Server ($0 Bandwidth Mode)
cd /d "%~dp0"
echo ========================================================
echo   DEEPSYQ LOCAL PREVIEW SERVER (ZERO COST / 0 GB CLOUD)
echo ========================================================
echo.
echo Starting local server on http://localhost:31990 ...
start "" "http://localhost:31990/deepsyq.html"
node server/deepsyq-preview.js
pause
