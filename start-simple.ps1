# FilaOps Simple Startup Script
# Starts both servers in separate windows (simpler approach)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "FilaOps ERP System - Starting Up" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Set database to FilaOps
$env:DB_NAME = "FilaOps"
Write-Host "`n[CONFIG] Database: FilaOps" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "backend" -PathType Container)) {
    Write-Host "[ERROR] Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Check if npm is available
$npmCheck = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCheck) {
    Write-Host "[WARNING] npm not found. Frontend may not start." -ForegroundColor Yellow
}

# Start backend in new window
Write-Host "`n[BACKEND] Starting FastAPI server in new window..." -ForegroundColor Yellow
$backendScript = @"
`$env:DB_NAME = 'FilaOps'
Set-Location '$PWD\backend'
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
pause
"@
$backendScript | Out-File -FilePath "$env:TEMP\start-backend-temp.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-File", "$env:TEMP\start-backend-temp.ps1"

# Wait a moment
Start-Sleep -Seconds 2

# Start frontend in new window
if ($npmCheck) {
    Write-Host "[FRONTEND] Starting Vite dev server in new window..." -ForegroundColor Yellow
    $frontendScript = @"
Set-Location '$PWD\frontend'
npm run dev
pause
"@
    $frontendScript | Out-File -FilePath "$env:TEMP\start-frontend-temp.ps1" -Encoding UTF8
    Start-Process powershell -ArgumentList "-NoExit", "-File", "$env:TEMP\start-frontend-temp.ps1"
} else {
    Write-Host "[SKIP] Frontend not started (npm not found)" -ForegroundColor Yellow
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "FilaOps is starting up!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Backend API:  http://localhost:8001" -ForegroundColor White
Write-Host "API Docs:     http://localhost:8001/docs" -ForegroundColor White
Write-Host "Frontend:     http://localhost:5173" -ForegroundColor White
Write-Host "`nBoth servers are running in separate windows." -ForegroundColor Yellow
Write-Host "Close those windows to stop the servers." -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

