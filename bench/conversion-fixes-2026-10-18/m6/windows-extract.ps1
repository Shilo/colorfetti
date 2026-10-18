$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$temporaryRoot = [IO.Path]::GetFullPath((Join-Path $workspace '.tmp/m6-windows-extraction'))
if (-not $temporaryRoot.StartsWith(($workspace + [IO.Path]::DirectorySeparatorChar), [StringComparison]::OrdinalIgnoreCase)) { throw 'Temporary destination escaped workspace.' }
New-Item -ItemType Directory -Force -Path $temporaryRoot | Out-Null
node (Join-Path $PSScriptRoot 'windows-fixtures.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Fixture generation failed.' }
$expected = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'windows-expected.json') -Raw | ConvertFrom-Json
$archives = @([pscustomobject]@{ Label = 'programmatic'; Path = (Join-Path $PSScriptRoot 'programmatic.zip') })
foreach ($phase in @('before', 'after')) {
  $captureFile = Join-Path $PSScriptRoot ($phase + '-captures.json')
  if (Test-Path -LiteralPath $captureFile) {
    foreach ($capture in (Get-Content -LiteralPath $captureFile -Raw | ConvertFrom-Json)) {
      if ($capture.name -eq 'colorfetti.zip') { $archives += [pscustomobject]@{ Label = $phase; Path = (Join-Path $PSScriptRoot $capture.artifact) } }
    }
  }
}
$results = @()
foreach ($archive in $archives) {
  $destination = [IO.Path]::GetFullPath((Join-Path $temporaryRoot ($archive.Label + '-' + [Guid]::NewGuid().ToString('N'))))
  if (-not $destination.StartsWith(($temporaryRoot + [IO.Path]::DirectorySeparatorChar), [StringComparison]::OrdinalIgnoreCase)) { throw 'Extraction destination escaped task directory.' }
  $zip = Join-Path $temporaryRoot ($archive.Label + '.zip')
  Copy-Item -LiteralPath $archive.Path -Destination $zip -Force
  $problem = $null
  try {
    $messages = @(Expand-Archive -LiteralPath $zip -DestinationPath $destination -Force -ErrorAction Continue 2>&1)
    if ($messages.Count) { $problem = ($messages | ForEach-Object { $_.ToString() }) -join "`n" }
  } catch { $problem = $_.Exception.Message }
  $files = @()
  if (Test-Path -LiteralPath $destination) {
    $files = @(Get-ChildItem -LiteralPath $destination -File | ForEach-Object {
      [pscustomobject]@{ Name = $_.Name; SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
    })
  }
  if ($archive.Label -eq 'programmatic' -or $archive.Label -eq 'after') {
    $wanted = $expected
    if ($archive.Label -eq 'after') { $wanted = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'after-windows-expected.json') -Raw | ConvertFrom-Json }
    if ($problem -or $files.Count -ne $wanted.Count) { throw "Portable archive did not fully extract: $problem" }
    foreach ($entry in $wanted) {
      $found = @($files | Where-Object { [String]::Equals($_.Name, $entry.name, [StringComparison]::Ordinal) })
      if ($found.Count -ne 1 -or $found[0].SHA256 -ne $entry.sha256) { throw ('Extracted filename or content mismatch: ' + $entry.name) }
    }
  }
  if ($archive.Label -eq 'after' -and $problem) { throw "Actual App portable archive failed extraction: $problem" }
  $results += [pscustomobject]@{ Label = $archive.Label; Command = 'Expand-Archive'; Error = $problem; Count = $files.Count; Files = $files }
}
$report = [pscustomobject]@{ Platform = $env:OS; PowerShell = $PSVersionTable.PSVersion.ToString(); Results = $results }
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'windows-extraction-results.json')
$report | ConvertTo-Json -Depth 6
