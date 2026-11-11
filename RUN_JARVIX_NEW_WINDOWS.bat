@echo off
setlocal
cd /d "%~dp0"
title JARVIX NEW - Windows local test
if not exist "vendor\voiceos\main.py" (
  echo Missing vendored VoiceOS. Use the jarvis-new branch.
  pause
  exit /b 1
)
if "%LOCALAPPDATA%"=="" (
  echo LOCALAPPDATA is unavailable.
  pause
  exit /b 1
)
set "STATE=%LOCALAPPDATA%\JARVIX_NEW"
set "VENV=%STATE%\venv"
if not exist "%STATE%" mkdir "%STATE%"
if not exist "%VENV%\Scripts\python.exe" (
  py -3 -m venv "%VENV%"
  if errorlevel 1 (
    echo Install Python 3.10 or newer from python.org, then restart.
    pause
    exit /b 1
  )
)
"%VENV%\Scripts\python.exe" -c "import sys; assert sys.version_info >= (3,10), 'Python 3.10+ required'"
if errorlevel 1 (
  echo Python 3.10 or newer is required.
  pause
  exit /b 1
)
"%VENV%\Scripts\python.exe" -m pip install --disable-pip-version-check "Pillow==11.3.0" "imageio-ffmpeg==0.6.0"
if errorlevel 1 (
  echo Could not install local image/video packages.
  pause
  exit /b 1
)
if /I "%~1"=="voice" (
  echo Installing original VoiceOS dependencies (optional large download).
  "%VENV%\Scripts\python.exe" -m pip install -r "vendor\voiceos\requirements.txt"
  if errorlevel 1 (
    echo VoiceOS requirements installation failed.
    pause
    exit /b 1
  )
  "%VENV%\Scripts\python.exe" -m pip install -e "vendor\voiceos"
  if errorlevel 1 (
    echo VoiceOS package installation failed.
    pause
    exit /b 1
  )
)
"%VENV%\Scripts\python.exe" -m jarvis_new.desktop
if errorlevel 1 (
  echo JARVIX NEW Desktop could not be started.
  pause
  exit /b 1
)
endlocal
