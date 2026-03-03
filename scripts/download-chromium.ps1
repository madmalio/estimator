param(
    [string]$Channel = "Stable",
    [string]$DestinationDir = "tools/chromium"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-AbsolutePath {
    param([Parameter(Mandatory = $true)][string]$Path)
    return [System.IO.Path]::GetFullPath($Path)
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-AbsolutePath (Join-Path $scriptDir "..")
$targetDir = Resolve-AbsolutePath (Join-Path $repoRoot $DestinationDir)

if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir | Out-Null
}

$manifestUrl = "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json"
Write-Host "Fetching Chrome for Testing manifest..."
$manifest = Invoke-RestMethod -Uri $manifestUrl -Method Get

$channelNode = $manifest.channels.$Channel
if ($null -eq $channelNode) {
    throw "Channel '$Channel' not found. Valid values include Stable, Beta, Dev, Canary."
}

$win64Download = $channelNode.downloads.chrome | Where-Object { $_.platform -eq "win64" } | Select-Object -First 1
if ($null -eq $win64Download) {
    throw "No win64 Chromium download found for channel '$Channel'."
}

$zipUrl = $win64Download.url
$version = $channelNode.version
$zipPath = Join-Path $targetDir "chromium-win64-$version.zip"
$extractParent = Join-Path $targetDir "chrome-win64-$version"

Write-Host "Downloading Chromium $version ($Channel)..."
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath

if (Test-Path $extractParent) {
    Remove-Item $extractParent -Recurse -Force
}

Write-Host "Extracting archive..."
Expand-Archive -Path $zipPath -DestinationPath $extractParent -Force

$chromeExe = Join-Path $extractParent "chrome-win64\chrome.exe"
if (-not (Test-Path $chromeExe)) {
    throw "Downloaded archive extracted but chrome.exe not found at expected location: $chromeExe"
}

Write-Host "Chromium ready."
Write-Host "Set env var for this terminal:"
Write-Host "  `$env:CABCON_CHROMIUM_PATH=\"$chromeExe\""
Write-Host "Then run:"
Write-Host "  .\scripts\bundle-chromium.ps1 -ChromiumPath \"$chromeExe\" -Build"
