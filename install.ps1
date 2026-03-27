# -----------------------------------------------
#  Cubicle Cat Club — one-line installer (Windows)
#
#  irm https://raw.githubusercontent.com/mnuva21/cubicle-cat-club/main/install.ps1 | iex
# -----------------------------------------------

$ErrorActionPreference = "Stop"
$INSTALL_DIR = "$HOME\.cubicle-cat-club"
$REPO_URL = "https://github.com/mnuva21/cubicle-cat-club.git"

Write-Host ""
Write-Host "  Installing Cubicle Cat Club..." -ForegroundColor Cyan
Write-Host ""

# --- Node.js ---
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  Node.js not found - installing..."

    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    } else {
        Write-Host "  winget not available. Downloading Node.js installer..."
        $nodeInstaller = "$env:TEMP\node-setup.msi"
        Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.19.0/node-v20.19.0-x64.msi" -OutFile $nodeInstaller
        Start-Process msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /qn" -Wait
        Remove-Item $nodeInstaller
    }

    # Refresh PATH so node/npm are available in this session
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host ""
        Write-Host "  Node.js installation failed." -ForegroundColor Red
        Write-Host "  Please install manually from: https://nodejs.org"
        Write-Host ""
        exit 1
    }
    Write-Host "  Node.js $(node --version) installed!"
}

# --- Git check ---
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "  Git is not installed." -ForegroundColor Red
    Write-Host "  Please install Git from: https://git-scm.com/downloads/win"
    Write-Host ""
    exit 1
}

# --- Clone or update ---
if (Test-Path $INSTALL_DIR) {
    Write-Host "  Updating existing install..."
    Push-Location $INSTALL_DIR
    git pull --ff-only
} else {
    Write-Host "  Downloading Cubicle Cat Club..."
    git clone $REPO_URL $INSTALL_DIR
    Push-Location $INSTALL_DIR
}

# --- Install, build, link ---
Write-Host "  Installing dependencies..."
npm install

Write-Host "  Building..."
npm run build

Write-Host "  Setting up global command..."
npm link

Pop-Location

Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Cyan
Write-Host "                                            " -ForegroundColor Cyan
Write-Host "     Cubicle Cat Club installed!            " -ForegroundColor Cyan
Write-Host "                                            " -ForegroundColor Cyan
Write-Host "     Just type:  cubicle-cats               " -ForegroundColor Cyan
Write-Host "                                            " -ForegroundColor Cyan
Write-Host "  ==========================================" -ForegroundColor Cyan
Write-Host ""
