# start-all.ps1 (PowerShell 5+)
$ErrorActionPreference = "Stop"

# Get the script directory (repo root)
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# backend window
$backendScript = Join-Path $scriptRoot "start-backend.ps1"
if (-not (Test-Path $backendScript)) {
  Write-Host "[start-all] start-backend.ps1 not found." -ForegroundColor Red
  exit 1
}
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-NoExit","-File","`"$backendScript`""

# frontend window
$frontendScript = Join-Path $scriptRoot "start-frontend.ps1"
if (Test-Path $frontendScript) {
  Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-NoExit","-File","`"$frontendScript`""
} else {
  Write-Host "[start-all] start-frontend.ps1 not found; skipping frontend." -ForegroundColor Yellow
}

Write-Host "`n[start-all] Launched backend and (if present) frontend in new windows." -ForegroundColor Green
Write-Host "[start-all] Backend will be at: http://localhost:8001" -ForegroundColor Cyan
Write-Host "[start-all] Frontend will be at: http://localhost:5173" -ForegroundColor Cyan

