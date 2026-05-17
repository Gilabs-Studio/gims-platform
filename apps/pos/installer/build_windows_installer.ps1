param(
  [string]$ApiUrl = '',
  [string]$IsccPath = ''
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$flutterArgs = @('build', 'windows', '--release')
if ($ApiUrl -ne '') {
  $flutterArgs += "--dart-define=GIMS_API_URL=$ApiUrl"
}

& flutter @flutterArgs
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

function Resolve-IsccPath {
  param(
    [string]$PreferredPath
  )

  $candidates = @()

  if ($PreferredPath -ne '') {
    $candidates += $PreferredPath
  }

  $registryPaths = @(
    'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
  )

  foreach ($entry in (Get-ItemProperty $registryPaths -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'Inno Setup*' })) {
    if ($entry.InstallLocation) {
      $candidates += (Join-Path $entry.InstallLocation 'ISCC.exe')
    }

    if ($entry.DisplayIcon) {
      $candidates += (Join-Path (Split-Path -Parent $entry.DisplayIcon) 'ISCC.exe')
      $candidates += (Split-Path -Parent $entry.DisplayIcon)
    }
  }

  $candidates += @(
    (Get-Command ISCC.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
    "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
    "$env:ProgramFiles(x86)\Inno Setup 6\ISCC.exe",
    "D:\Program Files\Inno Setup 6\ISCC.exe",
    "D:\Program Files (x86)\Inno Setup 6\ISCC.exe"
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -Path $candidate -PathType Leaf)) {
      return (Get-Item -LiteralPath $candidate).FullName
    }
  }

  throw 'ISCC.exe was not found. Set -IsccPath or install Inno Setup 6.'
}

$isccPathResolved = Resolve-IsccPath -PreferredPath $IsccPath
& $isccPathResolved "$PSScriptRoot\salesview_pos.iss"
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
