@echo off
rem =====================================================================
rem Router7 Automated Windows Installer for Command Prompt (CMD)
rem Usage:
rem   curl -fsSL https://raw.githubusercontent.com/sivnsh7/router7/main/install.cmd -o %TEMP%\r7-install.cmd && %TEMP%\r7-install.cmd
rem =====================================================================
setlocal EnableDelayedExpansion

echo 🌐 Configuring Router7 AI Gateway ^& Dashboard for Windows...

if exist "%~dp0install.ps1" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/sivnsh7/router7/main/install.ps1 | iex"
)
