$ErrorActionPreference = "Stop"
$ProjectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectPath

Write-Host "CaromChamps - iniciando servidor local..." -ForegroundColor Cyan

if (!(Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js / npm no esta instalado o no esta en PATH. Instale Node.js LTS." -ForegroundColor Red
  Read-Host "Presione ENTER para salir"
  exit 1
}

if (!(Test-Path "node_modules")) {
  Write-Host "Instalando dependencias..." -ForegroundColor Yellow
  npm.cmd install --registry=https://registry.npmjs.org/
}

$port = 5173
$serverRunning = $false
try {
  $serverRunning = [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
} catch {
  $serverRunning = $false
}

if (-not $serverRunning) {
  Write-Host "Levantando Vite en http://localhost:5173 ..." -ForegroundColor Green
  Start-Process powershell.exe -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "cd `"$ProjectPath`"; npm.cmd run dev") -WindowStyle Minimized
  Start-Sleep -Seconds 5
} else {
  Write-Host "El servidor ya esta activo en el puerto 5173." -ForegroundColor Green
}

Start-Process "http://localhost:5173/#tab=grand"
