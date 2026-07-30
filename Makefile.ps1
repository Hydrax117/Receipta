# Receipta - PowerShell Makefile
# Windows-compatible build automation

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

function Show-Help {
    Write-Host "Receipta - Build Commands" -ForegroundColor Cyan
    Write-Host "==========================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Setup & Installation:" -ForegroundColor Yellow
    Write-Host "  .\Makefile.ps1 install          - Install all dependencies"
    Write-Host "  .\Makefile.ps1 install-backend  - Install backend dependencies"
    Write-Host "  .\Makefile.ps1 install-frontend - Install frontend dependencies"
    Write-Host ""
    Write-Host "Development:" -ForegroundColor Yellow
    Write-Host "  .\Makefile.ps1 dev-backend      - Start backend"
    Write-Host "  .\Makefile.ps1 dev-frontend     - Start frontend"
    Write-Host ""
    Write-Host "Building:" -ForegroundColor Yellow
    Write-Host "  .\Makefile.ps1 build            - Build all components"
    Write-Host "  .\Makefile.ps1 build-backend    - Build backend"
    Write-Host "  .\Makefile.ps1 build-frontend   - Build frontend"
    Write-Host ""
    Write-Host "Testing:" -ForegroundColor Yellow
    Write-Host "  .\Makefile.ps1 test             - Run all tests"
    Write-Host "  .\Makefile.ps1 test-backend     - Run backend tests"
    Write-Host "  .\Makefile.ps1 test-frontend    - Run frontend tests"
    Write-Host ""
    Write-Host "Utilities:" -ForegroundColor Yellow
    Write-Host "  .\Makefile.ps1 clean            - Clean build artifacts"
    Write-Host "  .\Makefile.ps1 status           - Show project status"
    Write-Host "  .\Makefile.ps1 setup-env        - Create .env from template"
    Write-Host ""
}

function Install-All {
    Write-Host "Installing all dependencies..." -ForegroundColor Green
    Install-Backend
    Install-Frontend
    Write-Host "All dependencies installed!" -ForegroundColor Green
}

function Install-Backend {
    Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
    Set-Location backend
    npm install
    Set-Location ..
    Write-Host "Backend dependencies installed!" -ForegroundColor Green
}

function Install-Frontend {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    Set-Location frontend
    npm install
    Set-Location ..
    Write-Host "Frontend dependencies installed!" -ForegroundColor Green
}

function Start-DevBackend {
    Write-Host "Starting backend on http://localhost:3001..." -ForegroundColor Cyan
    Set-Location backend
    npm run dev
    Set-Location ..
}

function Start-DevFrontend {
    Write-Host "Starting frontend on http://localhost:3000..." -ForegroundColor Cyan
    Set-Location frontend
    npm run dev
    Set-Location ..
}

function Build-All {
    Write-Host "Building all components..." -ForegroundColor Green
    Build-Backend
    Build-Frontend
    Write-Host "All components built!" -ForegroundColor Green
}

function Build-Backend {
    Write-Host "Building backend..." -ForegroundColor Cyan
    Set-Location backend
    npm run build
    Set-Location ..
    Write-Host "Backend built!" -ForegroundColor Green
}

function Build-Frontend {
    Write-Host "Building frontend..." -ForegroundColor Cyan
    Set-Location frontend
    npm run build
    Set-Location ..
    Write-Host "Frontend built!" -ForegroundColor Green
}

function Test-All {
    Write-Host "Running all tests..." -ForegroundColor Green
    Test-Backend
    Test-Frontend
    Write-Host "All tests passed!" -ForegroundColor Green
}

function Test-Backend {
    Write-Host "Running backend tests..." -ForegroundColor Cyan
    Set-Location backend
    npm test
    Set-Location ..
}

function Test-Frontend {
    Write-Host "Running frontend tests..." -ForegroundColor Cyan
    Set-Location frontend
    npm test
    Set-Location ..
}

function Clean-All {
    Write-Host "Cleaning build artifacts..." -ForegroundColor Yellow
    
    if (Test-Path "backend\dist") {
        Remove-Item -Recurse -Force "backend\dist"
    }
    if (Test-Path "backend\node_modules") {
        Remove-Item -Recurse -Force "backend\node_modules"
    }
    if (Test-Path "frontend\.next") {
        Remove-Item -Recurse -Force "frontend\.next"
    }
    if (Test-Path "frontend\node_modules") {
        Remove-Item -Recurse -Force "frontend\node_modules"
    }
    if (Test-Path "node_modules") {
        Remove-Item -Recurse -Force "node_modules"
    }
    
    Write-Host "Cleaned!" -ForegroundColor Green
}

function Show-Status {
    Write-Host "Project Status" -ForegroundColor Cyan
    Write-Host "==============" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Backend:" -ForegroundColor Yellow
    if (Test-Path "backend\node_modules") {
        Write-Host "  Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  Dependencies not installed" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Frontend:" -ForegroundColor Yellow
    if (Test-Path "frontend\node_modules") {
        Write-Host "  Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  Dependencies not installed" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Environment:" -ForegroundColor Yellow
    if (Test-Path ".env") {
        Write-Host "  .env exists" -ForegroundColor Green
    } else {
        Write-Host "  .env missing" -ForegroundColor Red
    }
}

function Setup-Environment {
    if (Test-Path ".env") {
        Write-Host ".env already exists" -ForegroundColor Green
    } else {
        Write-Host "Creating .env from .env.example..." -ForegroundColor Cyan
        Copy-Item ".env.example" ".env"
        Write-Host ".env created! Please update with your values." -ForegroundColor Green
    }
}

function Onboard {
    Write-Host "Starting onboarding..." -ForegroundColor Cyan
    Setup-Environment
    Install-All
    Build-All
    Write-Host ""
    Write-Host "Onboarding complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Update .env with your configuration"
    Write-Host "  2. Run '.\Makefile.ps1 dev-backend' in one terminal"
    Write-Host "  3. Run '.\Makefile.ps1 dev-frontend' in another terminal"
    Write-Host "  4. Open http://localhost:3000"
    Write-Host ""
}

# Command router
switch ($Command.ToLower()) {
    "help" { Show-Help }
    "install" { Install-All }
    "install-backend" { Install-Backend }
    "install-frontend" { Install-Frontend }
    "dev-backend" { Start-DevBackend }
    "dev-frontend" { Start-DevFrontend }
    "build" { Build-All }
    "build-backend" { Build-Backend }
    "build-frontend" { Build-Frontend }
    "test" { Test-All }
    "test-backend" { Test-Backend }
    "test-frontend" { Test-Frontend }
    "clean" { Clean-All }
    "status" { Show-Status }
    "setup-env" { Setup-Environment }
    "onboard" { Onboard }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host ""
        Show-Help
    }
}
