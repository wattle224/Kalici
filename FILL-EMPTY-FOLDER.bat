@echo off
setlocal EnableExtensions
title Fill empty Desktop\Investment Management folder
color 0B
echo.
echo  Filling C:\Users\...\Desktop\Investment Management from GitHub...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Install-To-Desktop.ps1"
if errorlevel 1 (
  color 0C
  echo.
  echo  Install failed. If scripts\ is missing, use the PowerShell block in README instead.
  pause
  exit /b 1
)
exit /b 0
