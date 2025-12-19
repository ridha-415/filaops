# FilaOps Startup Script
# Starts both backend and frontend servers

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

# Check if virtual environment exists (optional)
if (Test-Path "backend\venv") {
    Write-Host "[INFO] Activating virtual environment..." -ForegroundColor Yellow
    & "backend\venv\Scripts\Activate.ps1"
}

# Start backend in background
Write-Host "`n[BACKEND] Starting FastAPI server..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    $env:DB_NAME = "FilaOps"
    Set-Location backend
    python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
}

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Check if npm is available
$npmPath = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmPath) {
    Write-Host "[ERROR] npm not found in PATH. Please install Node.js or add npm to your PATH." -ForegroundColor Red
    Stop-Job -Id $backendJob.Id -ErrorAction SilentlyContinue
    Remove-Job -Id $backendJob.Id -ErrorAction SilentlyContinue
    exit 1
}

# Start frontend in a new PowerShell window
Write-Host "[FRONTEND] Starting Vite dev server..." -ForegroundColor Yellow
$frontendScript = @"
Set-Location '$PWD\frontend'
npm run dev
"@
$frontendScript | Out-File -FilePath "$env:TEMP\start-frontend.ps1" -Encoding UTF8
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-File", "$env:TEMP\start-frontend.ps1" -PassThru

# Wait a moment for frontend to start
Start-Sleep -Seconds 3

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "FilaOps is starting up!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Backend API:  http://localhost:8001" -ForegroundColor White
Write-Host "API Docs:     http://localhost:8001/docs" -ForegroundColor White
Write-Host "Frontend:     http://localhost:5173" -ForegroundColor White
Write-Host "`nPress Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

# Monitor backend job
Write-Host "`n[INFO] Backend is running in background. Check http://localhost:8001/docs" -ForegroundColor Cyan
Write-Host "[INFO] Frontend is running in a separate window." -ForegroundColor Cyan
Write-Host "`nTo stop:" -ForegroundColor Yellow
Write-Host "  1. Press Ctrl+C in this window (stops backend)" -ForegroundColor White
Write-Host "  2. Close the frontend window (stops frontend)" -ForegroundColor White

try {
    while ($true) {
        $backendStatus = Get-Job -Id $backendJob.Id | Select-Object -ExpandProperty State
        if ($backendStatus -eq "Failed" -or $backendStatus -eq "Completed") {
            Write-Host "`n[ERROR] Backend server stopped!" -ForegroundColor Red
            Receive-Job -Id $backendJob.Id
            break
        }
        
        if ($frontendProcess.HasExited) {
            Write-Host "`n[INFO] Frontend window was closed." -ForegroundColor Yellow
            break
        }
        
        Start-Sleep -Seconds 2
    }
} catch {
    Write-Host "`n[INFO] Shutting down..." -ForegroundColor Yellow
} finally {
    # Cleanup
    Write-Host "`n[SHUTDOWN] Stopping servers..." -ForegroundColor Yellow
    Stop-Job -Id $backendJob.Id -ErrorAction SilentlyContinue
    Remove-Job -Id $backendJob.Id -ErrorAction SilentlyContinue
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue -Force
    }
    Remove-Item "$env:TEMP\start-frontend.ps1" -ErrorAction SilentlyContinue
    Write-Host "[SHUTDOWN] Complete" -ForegroundColor Green
}

