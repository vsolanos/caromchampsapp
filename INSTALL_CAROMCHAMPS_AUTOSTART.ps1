$ErrorActionPreference = "Stop"
$ProjectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ScriptPath = Join-Path $ProjectPath "START_CAROMCHAMPS.ps1"
$TaskName = "CaromChamps Local Server"

if (!(Test-Path $ScriptPath)) {
  Write-Host "No se encontro START_CAROMCHAMPS.ps1 en $ProjectPath" -ForegroundColor Red
  exit 1
}

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Minimized -File `"$ScriptPath`""
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DisallowStartIfOnBatteries:$false -ExecutionTimeLimit (New-TimeSpan -Hours 12)
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Inicia CaromChamps localmente al iniciar sesion para evitar localhost refused to connect." -Force | Out-Null
Write-Host "Tarea programada instalada: $TaskName" -ForegroundColor Green
Write-Host "CaromChamps se levantara automaticamente al iniciar sesion. Tambien puede usar START_CAROMCHAMPS.bat." -ForegroundColor Cyan
