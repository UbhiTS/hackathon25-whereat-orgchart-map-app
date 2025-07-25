# Quick Setup Script for Teams Org Map App

# This script helps set up the development environment

Write-Host "Setting up Teams Org Map App..." -ForegroundColor Green

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js 16+" -ForegroundColor Red
    exit 1
}

# Setup backend
Write-Host "`nSetting up backend..." -ForegroundColor Yellow
Set-Location backend

# Create virtual environment
if (!(Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Blue
    python -m venv venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Blue
& .\venv\Scripts\Activate.ps1

# Install Python dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Blue
pip install -r requirements.txt

# Create .env file if it doesn't exist
if (!(Test-Path ".env")) {
    Write-Host "Creating backend .env file..." -ForegroundColor Blue
    Copy-Item .env.example .env
    Write-Host "Please edit backend/.env with your Azure credentials" -ForegroundColor Yellow
}

# Go back to root
Set-Location ..

# Setup frontend
Write-Host "`nSetting up frontend..." -ForegroundColor Yellow
Set-Location frontend

# Install Node.js dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Blue
npm install

# Create .env file if it doesn't exist
if (!(Test-Path ".env")) {
    Write-Host "Creating frontend .env file..." -ForegroundColor Blue
    Copy-Item .env.example .env
    Write-Host "Please edit frontend/.env with your Azure Maps API key" -ForegroundColor Yellow
}

# Go back to root
Set-Location ..

Write-Host "`n✓ Setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Configure Azure AD app registration (see SETUP.md)" -ForegroundColor White
Write-Host "2. Create Azure Maps resource (see SETUP.md)" -ForegroundColor White
Write-Host "3. Update backend/.env with Azure credentials" -ForegroundColor White
Write-Host "4. Update frontend/.env with Azure Maps API key" -ForegroundColor White
Write-Host "5. Run 'python backend/app.py' to start backend" -ForegroundColor White
Write-Host "6. Run 'npm start' from frontend directory to start frontend" -ForegroundColor White
