$ErrorActionPreference = 'Stop'
node (Join-Path $PSScriptRoot 'filename-probe.mjs')
if ($LASTEXITCODE -ne 0) { throw 'ZIP fixture creation failed.' }
$archive = Join-Path $PSScriptRoot 'filename.zip'
$destination = Join-Path $PSScriptRoot 'filename-expansion'
$result = [ordered]@{ platform = $env:OS; entry = 'a:b-colorfetti.png'; command = 'Expand-Archive'; error = $null; extractedFiles = @() }
try {
  $messages = @(Expand-Archive -LiteralPath $archive -DestinationPath $destination -Force -ErrorAction Continue 2>&1)
  if ($messages.Count) { $result.error = ($messages | ForEach-Object { $_.ToString() }) -join "`n" }
}
catch { $result.error = $_.Exception.Message }
if (Test-Path -LiteralPath $destination) { $result.extractedFiles = @(Get-ChildItem -LiteralPath $destination -File | ForEach-Object Name) }
$json = $result | ConvertTo-Json -Depth 3
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot 'filename-portability.json'), $json)
$json
