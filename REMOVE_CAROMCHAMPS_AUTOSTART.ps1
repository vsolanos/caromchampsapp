$TaskName = "CaromChamps Local Server"
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "Tarea programada removida: $TaskName" -ForegroundColor Green
