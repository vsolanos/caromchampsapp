Write-Host "CaromChamps - Instalacion limpia v6.4" -ForegroundColor Cyan
if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }
if (Test-Path package-lock.json) { Remove-Item -Force package-lock.json }
npm.cmd config set registry https://registry.npmjs.org/
npm.cmd install --registry=https://registry.npmjs.org/
npm.cmd run check:syntax
npm.cmd run build
Write-Host "Instalacion completada. Ejecutando aplicacion..." -ForegroundColor Green
powershell.exe -ExecutionPolicy Bypass -File "$PSScriptRoot\START_CAROMCHAMPS.ps1"
