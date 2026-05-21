@echo off
echo CaromChamps - Instalacion limpia v6.4
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /q package-lock.json
call npm.cmd config set registry https://registry.npmjs.org/
call npm.cmd install --registry=https://registry.npmjs.org/
call npm.cmd run check:syntax
call npm.cmd run build
powershell.exe -ExecutionPolicy Bypass -File "%~dp0START_CAROMCHAMPS.ps1"
