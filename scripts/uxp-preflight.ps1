$ErrorActionPreference = 'Stop'

function Write-Check {
  param(
    [string]$Label,
    [bool]$Ok,
    [string]$Detail
  )

  $status = if ($Ok) { 'OK  ' } else { 'FAIL' }
  Write-Output ("[{0}] {1} - {2}" -f $status, $Label, $Detail)
}

function Parse-SemVer {
  param([string]$VersionString)

  if ([string]::IsNullOrWhiteSpace($VersionString)) {
    return $null
  }

  $match = [regex]::Match($VersionString, '\d+(\.\d+){0,3}')
  if (-not $match.Success) {
    return $null
  }

  try {
    return [version]$match.Value
  } catch {
    return $null
  }
}

function Get-ProcessInfo {
  param([string]$Pattern)

  $rows = Get-CimInstance Win32_Process |
    Where-Object { $_.Name -match $Pattern } |
    ForEach-Object {
      $exePath = $_.ExecutablePath
      $productVersion = $null
      if ($exePath -and (Test-Path $exePath)) {
        try {
          $productVersion = (Get-Item $exePath).VersionInfo.ProductVersion
        } catch {
          $productVersion = $null
        }
      }

      [PSCustomObject]@{
        Name = $_.Name
        ProcessId = $_.ProcessId
        ExecutablePath = $exePath
        ProductVersion = $productVersion
      }
    }

  return @($rows)
}

Write-Output '=== UXP / Premiere Preflight ==='

$repoRoot = Split-Path -Parent $PSScriptRoot
$pluginRoot = Join-Path $repoRoot 'premiere-uxp-plugin'
$manifestPath = Join-Path $pluginRoot 'manifest.json'

Write-Check 'Plugin directory' (Test-Path $pluginRoot) $pluginRoot
Write-Check 'Manifest file' (Test-Path $manifestPath) $manifestPath

if (-not (Test-Path $manifestPath)) {
  Write-Output ''
  Write-Output 'Hard stop: manifest.json was not found. Load the "premiere-uxp-plugin" folder in UDT.'
  exit 1
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json

$hostApp = $manifest.host.app
$minVersionText = $manifest.host.minVersion
$minVersion = Parse-SemVer $minVersionText

Write-Check 'Manifest host.app' ($hostApp -eq 'premierepro') ("{0}" -f $hostApp)
Write-Check 'Manifest host.minVersion' ($null -ne $minVersion) ("{0}" -f $minVersionText)
Write-Check 'Manifest main entry exists' (Test-Path (Join-Path $pluginRoot $manifest.main)) ("{0}" -f $manifest.main)

$settingsPath = Join-Path $env:CommonProgramFiles 'Adobe\UXP\Developer\settings.json'
$hasSettings = Test-Path $settingsPath
Write-Check 'UXP settings file' $hasSettings $settingsPath

if ($hasSettings) {
  try {
    $settingsObj = Get-Content $settingsPath -Raw | ConvertFrom-Json
    $keys = ($settingsObj.PSObject.Properties.Name | Sort-Object) -join ', '
    Write-Output ("[INFO] settings keys: {0}" -f $keys)
  } catch {
    Write-Output '[INFO] settings.json exists but could not be parsed as JSON.'
  }
}

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Write-Check 'Current shell elevated (Admin)' $isAdmin $env:USERNAME

$premiere = Get-ProcessInfo '^Adobe Premiere Pro( Beta)?\.exe$'
$udt = Get-ProcessInfo '^UXP Developer Tool\.exe$'

Write-Check 'Premiere process running' ($premiere.Count -gt 0) ("count={0}" -f $premiere.Count)
Write-Check 'UXP Developer Tool process running' ($udt.Count -gt 0) ("count={0}" -f $udt.Count)

if ($premiere.Count -gt 0) {
  foreach ($p in $premiere) {
    $versionLabel = if ($p.ProductVersion) { $p.ProductVersion } else { 'unknown' }
    Write-Output ("[INFO] Premiere: {0} (pid={1}, version={2})" -f $p.Name, $p.ProcessId, $versionLabel)
  }
}

if ($udt.Count -gt 0) {
  foreach ($u in $udt) {
    Write-Output ("[INFO] UDT: {0} (pid={1})" -f $u.Name, $u.ProcessId)
  }
}

$meetsMin = $null
if ($premiere.Count -gt 0 -and $minVersion) {
  $premiereVersionString = $premiere[0].ProductVersion
  $premiereVersion = Parse-SemVer $premiereVersionString
  if ($premiereVersion) {
    $meetsMin = $premiereVersion -ge $minVersion
    Write-Check 'Premiere version >= manifest minVersion' $meetsMin ("premiere={0}, required={1}" -f $premiereVersion, $minVersion)
  } else {
    Write-Output '[INFO] Could not parse Premiere version string for minVersion comparison.'
  }
}

Write-Output ''
Write-Output '=== Recommended Recovery Sequence ==='
Write-Output '1. Close Premiere and UXP Developer Tool.'
Write-Output '2. Start Premiere first and wait until fully loaded.'
Write-Output '3. Start UXP Developer Tool as Administrator.'
Write-Output '4. In Premiere: Preferences -> Plugins -> enable Developer mode, then restart Premiere.'
Write-Output '5. In UDT: verify Premiere appears as connected target, then load "premiere-uxp-plugin".'

if (-not $isAdmin) {
  Write-Output ''
  Write-Output '[ACTION] UDT should be launched as Administrator for reliable host connection.'
}

if ($premiere.Count -eq 0 -or $udt.Count -eq 0) {
  Write-Output ''
  Write-Output '[ACTION] Connection cannot happen if either Premiere or UDT is not running.'
}

if ($meetsMin -eq $false) {
  Write-Output ''
  Write-Output '[ACTION] Premiere is below required minVersion from manifest.json.'
}
