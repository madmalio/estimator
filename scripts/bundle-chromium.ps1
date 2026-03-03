param(
    [string]$ChromiumPath = $env:CABCON_CHROMIUM_PATH,
    [string]$BuildOutputDir = "build/bin",
    [switch]$Build
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-AbsolutePath {
    param([Parameter(Mandatory = $true)][string]$Path)
    return [System.IO.Path]::GetFullPath($Path)
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-AbsolutePath (Join-Path $scriptDir "..")

if ($Build) {
    Write-Host "Running wails build..."
    Push-Location $repoRoot
    try {
        wails build
    }
    finally {
        Pop-Location
    }
}

if ([string]::IsNullOrWhiteSpace($ChromiumPath)) {
    throw "Chromium path is required. Pass -ChromiumPath or set CABCON_CHROMIUM_PATH."
}

$resolvedChromiumPath = Resolve-AbsolutePath $ChromiumPath
if (-not (Test-Path $resolvedChromiumPath)) {
    throw "Chromium path does not exist: $resolvedChromiumPath"
}

$item = Get-Item $resolvedChromiumPath
$chromiumDir = if ($item.PSIsContainer) { $item.FullName } else { $item.DirectoryName }
$chromeExe = Join-Path $chromiumDir "chrome.exe"

if (-not (Test-Path $chromeExe)) {
    throw "chrome.exe not found. Provide folder or exe from a Chrome for Testing package."
}

$resolvedBuildOutputDir = Resolve-AbsolutePath (Join-Path $repoRoot $BuildOutputDir)
if (-not (Test-Path $resolvedBuildOutputDir)) {
    throw "Build output directory not found: $resolvedBuildOutputDir"
}

$targetChromiumDir = Join-Path $resolvedBuildOutputDir "chromium"

Write-Host "Bundling Chromium from: $chromiumDir"
Write-Host "Target directory:       $targetChromiumDir"

if (Test-Path $targetChromiumDir) {
    Remove-Item $targetChromiumDir -Recurse -Force
}

New-Item -ItemType Directory -Path $targetChromiumDir | Out-Null
Copy-Item -Path (Join-Path $chromiumDir "*") -Destination $targetChromiumDir -Recurse -Force

Write-Host "Done. Bundled Chromium runtime into build output."
Write-Host "Expected executable path: $(Join-Path $targetChromiumDir 'chrome.exe')"
