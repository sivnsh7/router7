# =====================================================================
# Router7 One-Line Automated Windows Installer & Launcher Configurator
# Automatically detects/installs Node.js v22 LTS & sets up 'r7' command
#
# Usage (PowerShell):
#   irm https://raw.githubusercontent.com/sivnsh7/router7/main/install.ps1 | iex
# =====================================================================

$ErrorActionPreference = 'Continue'

Write-Host "🌐 Configuring Router7 AI Gateway & Dashboard for Windows..." -ForegroundColor Cyan

# ---------------------------------------------------------------------
# 1. Dependency Check & Self-Installation
# ---------------------------------------------------------------------
$hasNode = $false
try {
    $nodeCmd = Get-Command node -ErrorAction Stop
    $versionOut = (& node -v 2>$null).Trim().TrimStart('v')
    $major = [int]($versionOut.Split('.')[0])
    if ($major -ge 20) {
        $hasNode = $true
        Write-Host "✓ Found Node.js v$versionOut (v20+ requirement satisfied)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Existing Node.js v$versionOut is below v20. Upgrading to Node.js v22 LTS..." -ForegroundColor Yellow
    }
} catch {
    $hasNode = $false
}

if (-not $hasNode) {
    Write-Host "📦 Node.js not detected. Automatically installing Node.js (v22 LTS)..." -ForegroundColor Cyan
    $installed = $false

    # Try A: winget (Windows Package Manager - built-in on Windows 10/11)
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        try {
            Write-Host "→ Installing Node.js via winget..." -ForegroundColor Cyan
            & winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
            if ($LASTEXITCODE -eq 0) {
                $installed = $true
                Write-Host "✓ Node.js installed via winget!" -ForegroundColor Green
            }
        } catch {}
    }

    # Try B: Standalone official zip package from nodejs.org
    if (-not $installed) {
        try {
            Write-Host "→ Downloading official Node.js v22 standalone package..." -ForegroundColor Cyan
            $destDir = Join-Path $env:USERPROFILE ".local\lib\nodejs"
            $binDir = Join-Path $env:USERPROFILE ".local\bin"
            New-Item -ItemType Directory -Force -Path $destDir | Out-Null
            New-Item -ItemType Directory -Force -Path $binDir | Out-Null

            $zipUrl = "https://nodejs.org/dist/latest-v22.x/node-v22.23.4-win-x64.zip"
            $tmpZip = Join-Path $env:TEMP "node-v22-win-x64.zip"
            Invoke-WebRequest -Uri $zipUrl -OutFile $tmpZip -UseBasicParsing

            $extractDir = Join-Path $destDir "node-current"
            if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir -ErrorAction SilentlyContinue }
            Expand-Archive -Path $tmpZip -DestinationPath $destDir -Force
            Remove-Item -Force $tmpZip -ErrorAction SilentlyContinue

            $foundFolder = Get-ChildItem -Path $destDir -Directory -Filter "node-v22*" | Select-Object -First 1
            if ($foundFolder) {
                Rename-Item -Path $foundFolder.FullName -NewName "node-current" -Force
            }

            $nodeExe = Join-Path $extractDir "node.exe"
            if (Test-Path $nodeExe) {
                $installed = $true
                $env:Path = "$extractDir;$binDir;" + $env:Path
                $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
                if ($userPath -notmatch [regex]::Escape($extractDir)) {
                    [Environment]::SetEnvironmentVariable("Path", "$extractDir;$binDir;$userPath", "User")
                }
                Write-Host "✓ Standalone Node.js installed to $extractDir!" -ForegroundColor Green
            }
        } catch {
            Write-Warning "Standalone download failed: $_"
        }
    }
}

# ---------------------------------------------------------------------
# 2. Setup r7 & router7 Launchers (CMD + PowerShell)
# ---------------------------------------------------------------------
$localBin = Join-Path $env:USERPROFILE ".local\bin"
New-Item -ItemType Directory -Force -Path $localBin | Out-Null

$wrapperScript = @'
@echo off
setlocal
rem 1. Check standard global npm locations
if exist "%APPDATA%\npm\node_modules\router7\dist\index.js" (
  node "%APPDATA%\npm\node_modules\router7\dist\index.js" %*
  exit /b %ERRORLEVEL%
)
if exist "%LOCALAPPDATA%\npm\node_modules\router7\dist\index.js" (
  node "%LOCALAPPDATA%\npm\node_modules\router7\dist\index.js" %*
  exit /b %ERRORLEVEL%
)
if exist "%USERPROFILE%\.local\lib\nodejs\node-current\node_modules\router7\dist\index.js" (
  node "%USERPROFILE%\.local\lib\nodejs\node-current\node_modules\router7\dist\index.js" %*
  exit /b %ERRORLEVEL%
)

rem 2. Fallback to npx
npx -y router7 %*
exit /b %ERRORLEVEL%
'@

$ps1Wrapper = @'
$npmApp = Join-Path $env:APPDATA "npm\node_modules\router7\dist\index.js"
if (Test-Path $npmApp) {
    & node $npmApp $args
    exit $LASTEXITCODE
}
$localApp = Join-Path $env:LOCALAPPDATA "npm\node_modules\router7\dist\index.js"
if (Test-Path $localApp) {
    & node $localApp $args
    exit $LASTEXITCODE
}
$standalone = Join-Path $env:USERPROFILE ".local\lib\nodejs\node-current\node_modules\router7\dist\index.js"
if (Test-Path $standalone) {
    & node $standalone $args
    exit $LASTEXITCODE
}
& npx -y router7 $args
exit $LASTEXITCODE
'@

Set-Content -Path (Join-Path $localBin "r7.cmd") -Value $wrapperScript -Encoding ASCII
Set-Content -Path (Join-Path $localBin "router7.cmd") -Value $wrapperScript -Encoding ASCII
Set-Content -Path (Join-Path $localBin "r7.ps1") -Value $ps1Wrapper -Encoding UTF8
Set-Content -Path (Join-Path $localBin "router7.ps1") -Value $ps1Wrapper -Encoding UTF8

# If npm global folder exists, also place wrappers there for immediate resolution
try {
    $npmPrefix = (& npm config get prefix 2>$null)
    if ($npmPrefix) {
        $npmPrefix = $npmPrefix.Trim()
        if (Test-Path $npmPrefix) {
            Set-Content -Path (Join-Path $npmPrefix "r7.cmd") -Value $wrapperScript -Encoding ASCII
            Set-Content -Path (Join-Path $npmPrefix "router7.cmd") -Value $wrapperScript -Encoding ASCII
            Set-Content -Path (Join-Path $npmPrefix "r7.ps1") -Value $ps1Wrapper -Encoding UTF8
            Set-Content -Path (Join-Path $npmPrefix "router7.ps1") -Value $ps1Wrapper -Encoding UTF8
        }
    }
} catch {}

# Ensure $localBin is in User PATH
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notmatch [regex]::Escape($localBin)) {
    [Environment]::SetEnvironmentVariable("Path", "$localBin;$userPath", "User")
}
$env:Path = "$localBin;" + $env:Path
Write-Host "✓ Created executable launchers (r7.cmd, router7.cmd, r7.ps1, router7.ps1)" -ForegroundColor Green

# ---------------------------------------------------------------------
# 3. Configure PowerShell Profile Aliases
# ---------------------------------------------------------------------
try {
    $profilePath = $PROFILE
    if ($profilePath) {
        $profileDir = Split-Path -Parent $profilePath
        if (-not (Test-Path $profileDir)) {
            New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
        }
        $r7CmdPath = Join-Path $localBin "r7.cmd"
        $aliasBlock = "`n# Router7 Aliases`nSet-Alias -Name r7 -Value `"$r7CmdPath`" -ErrorAction SilentlyContinue`nSet-Alias -Name router7 -Value `"$r7CmdPath`" -ErrorAction SilentlyContinue`n"
        if (Test-Path $profilePath) {
            $existing = Get-Content -Path $profilePath -Raw
            if ($existing -notmatch "Set-Alias -Name r7") {
                Add-Content -Path $profilePath -Value $aliasBlock
            }
        } else {
            Set-Content -Path $profilePath -Value $aliasBlock
        }
        Write-Host "✓ Configured PowerShell profile aliases ($profilePath)" -ForegroundColor Green
    }
} catch {}

# ---------------------------------------------------------------------
# 4. Optional Pre-cache via npm
# ---------------------------------------------------------------------
Write-Host "→ Pre-caching Router7 package for high-speed startup..." -ForegroundColor Cyan
try {
    & npm install -g router7@latest 2>$null | Out-Null
} catch {}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  🎉 Setup Complete! You can run 'r7' in terminal from now to start the tool." -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Commands available:"
Write-Host "  r7              Start the server and launch the GUI dashboard" -ForegroundColor Cyan
Write-Host "  r7 --port 3001  Run on custom port (default: 3001)" -ForegroundColor Cyan
Write-Host "  r7 --no-open    Run headless without opening browser" -ForegroundColor Cyan
Write-Host "  r7 --help       View all options" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tip: If 'r7' is not recognized immediately in your current terminal session," -ForegroundColor Yellow
Write-Host "     simply restart PowerShell or Command Prompt, or run:"
Write-Host "     `$env:Path = [System.Environment]::GetEnvironmentVariable('Path','User') + ';' + [System.Environment]::GetEnvironmentVariable('Path','Machine')" -ForegroundColor DarkGray
Write-Host "======================================================================" -ForegroundColor Cyan
