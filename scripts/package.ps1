$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path $PSScriptRoot -Parent
$source = Join-Path $root 'extension'
$destination = Join-Path $root 'dist'
[System.IO.Directory]::CreateDirectory($destination) | Out-Null
$files = @(Get-ChildItem -LiteralPath $source -Recurse -File -Force | Sort-Object FullName)
if ($files | Where-Object { $_.FullName -match '[\\/](node_modules|tests?|\.git)[\\/]' }) {
    throw 'Unexpected development files inside extension/. Inspect before packaging.'
}
$manifestText = [System.IO.File]::ReadAllText((Join-Path $source 'manifest.json'))
$manifest = $manifestText | ConvertFrom-Json
if ($manifest.manifest_version -ne 3) { throw 'Expected Manifest V3.' }

# Firefox uses an event page for the same module, and requires an MV3 add-on ID
# and a data-collection declaration. Only the packaged manifest is adapted.
$firefox = $manifestText | ConvertFrom-Json
$firefox.background = [ordered]@{ scripts = @('background.js'); type = 'module' }
$firefox | Add-Member -NotePropertyName browser_specific_settings -NotePropertyValue @{
    gecko = [ordered]@{
        id = 'scamsniff@jevgenijostin.github.io'
        strict_min_version = '140.0'
        data_collection_permissions = @{ required = @('none') }
    }
    gecko_android = @{ strict_min_version = '142.0' }
}
$firefoxBytes = [System.Text.Encoding]::UTF8.GetBytes(($firefox | ConvertTo-Json -Depth 20) + "`n")

foreach ($target in @('extension', 'firefox')) {
    $zipPath = Join-Path $destination "scamsniff-$target.zip"
    $stream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::Create)
    $archive = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($file in $files) {
            $name = $file.FullName.Substring($source.Length + 1).Replace('\', '/')
            $entry = $archive.CreateEntry($name, [System.IO.Compression.CompressionLevel]::Optimal)
            # Stable metadata makes repeat packaging reproducible on the same runtime.
            $entry.LastWriteTime = [DateTimeOffset]::new(2020, 1, 1, 0, 0, 0, [TimeSpan]::Zero)
            $output = $entry.Open()
            try {
                $bytes = if ($target -eq 'firefox' -and $name -eq 'manifest.json') {
                    $firefoxBytes
                } else { [System.IO.File]::ReadAllBytes($file.FullName) }
                $output.Write($bytes, 0, $bytes.Length)
            } finally { $output.Dispose() }
        }
    } finally { $archive.Dispose(); $stream.Dispose() }
    Write-Output "Created $zipPath ($($files.Count) files, manifest.json at root)"
}
