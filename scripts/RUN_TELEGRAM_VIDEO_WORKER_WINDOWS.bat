@echo off
setlocal
cd /d "%~dp0.."
title Video Uniquifier - Telegram Windows Worker
where node >nul 2>nul || (echo Please install Node.js 20+ first. & pause & exit /b 1)
where ffmpeg >nul 2>nul || (echo Please install FFmpeg and add it to PATH first. & pause & exit /b 1)
where ffprobe >nul 2>nul || (echo Please install ffprobe with FFmpeg first. & pause & exit /b 1)
if not exist "scripts\telegram-video-worker.env" (
  copy "scripts\telegram-video-worker.env.example" "scripts\telegram-video-worker.env" >nul
  echo Set your Telegram BotFather token in the opened file, save, then run this BAT again.
  notepad "scripts\telegram-video-worker.env"
  pause
  exit /b 0
)
node scripts\telegram-video-worker.mjs
if errorlevel 1 echo Worker stopped with an error. Check your .env, network, FFmpeg and Render video flag.
pause
