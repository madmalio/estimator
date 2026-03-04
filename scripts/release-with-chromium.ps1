param(
    [string]$Channel = "Stable",
    [string]$DestinationDir = "tools/chromium",
    [switch]$SkipDownload,
    [switch]$SkipInstaller
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-AbsolutePath {
    param([Parameter(Mandatory = $true)][string]$Path)
    return [System.IO.Path]::GetFullPath($Path)
}

function Resolve-WailsCommand {
    $wailsCmd = Get-Command wails -ErrorAction SilentlyContinue
    if ($null -ne $wailsCmd) {
        return $wailsCmd.Source
    }

    $defaultGoBin = Join-Path $env:USERPROFILE "go\bin\wails.exe"
    if (Test-Path $defaultGoBin) {
        return $defaultGoBin
    }

    throw "Wails CLI not found. Install it or add it to PATH."
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-AbsolutePath (Join-Path $scriptDir "..")

if (-not $SkipDownload) {
    Write-Host "Step 1/3: Downloading Chromium ($Channel)..."
    & (Join-Path $scriptDir "download-chromium.ps1") -Channel $Channel -DestinationDir $DestinationDir
}

$targetDir = Resolve-AbsolutePath (Join-Path $repoRoot $DestinationDir)
if (-not (Test-Path $targetDir)) {
    throw "Chromium destination directory not found: $targetDir"
}

$chromeExe = Get-ChildItem -Path $targetDir -Recurse -Filter "chrome.exe" |
    Where-Object { $_.FullName -match "chrome-win64\\chrome.exe$" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if ($null -eq $chromeExe) {
    throw "Could not find chrome.exe under $targetDir. Run download-chromium first."
}

Write-Host "Step 2/3: Building app and bundling Chromium..."
& (Join-Path $scriptDir "bundle-chromium.ps1") -ChromiumPath $chromeExe.FullName -Build

if (-not $SkipInstaller) {
    Write-Host "Step 3/3: Building NSIS installer with bundled Chromium..."
    $wailsExe = Resolve-WailsCommand
    Push-Location $repoRoot
    try {
        & $wailsExe build -nsis -s
    }
    finally {
        Pop-Location
    }
}

Write-Host "Complete."
Write-Host "Built app path:   $(Join-Path $repoRoot 'build/bin')"
Write-Host "Bundled Chromium: $(Join-Path $repoRoot 'build/bin/chromium/chrome.exe')"
if (-not $SkipInstaller) {
    Write-Host "Installer path:   $(Join-Path $repoRoot 'build/bin/CabCon-amd64-installer.exe')"
}
