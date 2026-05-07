# ============================================================
#  build-android.ps1
#  Build the CallRecorder Pro Android app via Expo / EAS
# ============================================================
#  Usage:
#    .\build-android.ps1                     # Default: EAS cloud build (preview profile)
#    .\build-android.ps1 -Mode local         # Local APK using expo run:android
#    .\build-android.ps1 -Mode eas           # EAS cloud build
#    .\build-android.ps1 -Mode eas -Profile production   # EAS production AAB
#    .\build-android.ps1 -Mode eas -Profile preview      # EAS preview APK (default)
# ============================================================

param(
    [ValidateSet("eas", "local")]
    [string]$Mode = "eas",

    [ValidateSet("development", "preview", "production")]
    [string]$Profile = "preview"
)

$ErrorActionPreference = "Stop"

# ── Helpers ────────────────────────────────────────────────
function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

function Assert-CommandExists {
    param([string]$Cmd, [string]$InstallHint)
    if (-not (Get-Command $Cmd -ErrorAction SilentlyContinue)) {
        Write-Host "[ERROR] '$Cmd' not found. $InstallHint" -ForegroundColor Red
        exit 1
    }
}

# ── Banner ─────────────────────────────────────────────────
Write-Header "CallRecorder Pro — Android Build"
Write-Host "  Mode    : $Mode" -ForegroundColor Yellow
if ($Mode -eq "eas") {
    Write-Host "  Profile : $Profile" -ForegroundColor Yellow
}
Write-Host ""

# ── Prerequisite checks ────────────────────────────────────
Write-Host "[1/4] Checking prerequisites..." -ForegroundColor Magenta

Assert-CommandExists "node" "Install Node.js from https://nodejs.org"
Assert-CommandExists "npx"  "Install Node.js (includes npx) from https://nodejs.org"

$nodeVersion = node --version
Write-Host "      Node.js : $nodeVersion" -ForegroundColor Green

if ($Mode -eq "local") {
    # Local build needs Android SDK / JAVA_HOME
    if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
        Write-Host "[WARN] ANDROID_HOME / ANDROID_SDK_ROOT is not set." -ForegroundColor Yellow
        Write-Host "       Make sure Android Studio is installed and the SDK path is configured." -ForegroundColor Yellow
    } else {
        $sdkPath = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { $env:ANDROID_SDK_ROOT }
        Write-Host "      Android SDK : $sdkPath" -ForegroundColor Green
    }

    if (-not $env:JAVA_HOME) {
        Write-Host "[WARN] JAVA_HOME is not set. Gradle may fail if Java is not on PATH." -ForegroundColor Yellow
    } else {
        Write-Host "      JAVA_HOME   : $env:JAVA_HOME" -ForegroundColor Green
    }
} else {
    Assert-CommandExists "eas" "Install EAS CLI with: npm install -g eas-cli"
    $easVersion = eas --version
    Write-Host "      EAS CLI : $easVersion" -ForegroundColor Green
}

# ── Install dependencies ───────────────────────────────────
Write-Header "[2/4] Installing npm dependencies"
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] npm install failed." -ForegroundColor Red; exit 1 }
Write-Host "Dependencies installed." -ForegroundColor Green

# ── Build ──────────────────────────────────────────────────
if ($Mode -eq "local") {
    Write-Header "[3/4] Running local Android build (expo run:android)"
    Write-Host "This will generate a debug APK and launch on a connected device/emulator." -ForegroundColor Yellow
    Write-Host ""

    npx expo run:android
    if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] expo run:android failed." -ForegroundColor Red; exit 1 }

    Write-Header "[4/4] Build complete"
    Write-Host "The APK was installed directly on your connected device/emulator." -ForegroundColor Green

} else {
    # ── Ensure eas.json exists ──────────────────────────────
    $easJson = Join-Path $PSScriptRoot "eas.json"
    if (-not (Test-Path $easJson)) {
        Write-Host "[INFO] eas.json not found. Creating default configuration..." -ForegroundColor Yellow

        $defaultEasJson = @"
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
"@
        $defaultEasJson | Out-File -FilePath $easJson -Encoding utf8
        Write-Host "      Created eas.json with development/preview/production profiles." -ForegroundColor Green
    }

    Write-Header "[3/4] Triggering EAS cloud build (profile: $Profile)"
    Write-Host "You may be prompted to log in to your Expo account." -ForegroundColor Yellow
    Write-Host ""

    eas build --platform android --profile $Profile --non-interactive
    if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] EAS build failed." -ForegroundColor Red; exit 1 }

    Write-Header "[4/4] Build submitted successfully"
    Write-Host "Monitor your build at: https://expo.dev/accounts/[your-account]/projects/call-recorder/builds" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Profile outputs:" -ForegroundColor Yellow
    Write-Host "  preview    -> APK  (sideloadable, good for testing)" -ForegroundColor White
    Write-Host "  production -> AAB  (for Google Play Store submission)" -ForegroundColor White
    Write-Host "  development -> APK with dev client" -ForegroundColor White
}
