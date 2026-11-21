param([string]$Directory)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFolder, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Pdf.PdfPageRenderOptions, Windows.Data.Pdf, ContentType = WindowsRuntime] | Out-Null

$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$expected = [IO.Path]::GetFullPath((Join-Path $workspace 'specs/captures/documents'))
$customExamples = [IO.Path]::GetFullPath((Join-Path $workspace 'specs/captures/documents-pdf'))
if (-not $Directory) { $Directory = $expected }
$resolved = [IO.Path]::GetFullPath($Directory)
if (-not $resolved.Equals($expected, [StringComparison]::OrdinalIgnoreCase) -and -not $resolved.Equals($customExamples, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Rendering is restricted to specs/captures/documents and specs/captures/documents-pdf.'
}
$expected = $resolved
$folder = Get-Item -LiteralPath $resolved
if (-not $folder.PSIsContainer) { throw 'The examples directory does not exist.' }

$operationConverter = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
$actionConverter = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and -not $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'
} | Select-Object -First 1

function Wait-Operation($Operation, [Type]$ResultType) {
  $task = $operationConverter.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
  $task.GetAwaiter().GetResult()
}

function Wait-Action($Action) {
  $task = $actionConverter.Invoke($null, @($Action))
  $null = $task.GetAwaiter().GetResult()
}

$outputFolder = Wait-Operation ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($resolved)) ([Windows.Storage.StorageFolder])
$report = @()
foreach ($pdf in (Get-ChildItem -LiteralPath $resolved -File -Filter '*.pdf' | Sort-Object Name)) {
  $source = Wait-Operation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($pdf.FullName)) ([Windows.Storage.StorageFile])
  $document = Wait-Operation ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($source)) ([Windows.Data.Pdf.PdfDocument])
  $pngs = @()
  for ($index = 0; $index -lt $document.PageCount; $index++) {
    $page = $document.GetPage($index)
    $stream = $null
    try {
      $name = '{0}-page-{1:D3}.png' -f $pdf.BaseName, ($index + 1)
      $file = Wait-Operation ($outputFolder.CreateFileAsync($name, [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])
      $stream = Wait-Operation ($file.OpenAsync([Windows.Storage.FileAccessMode]::ReadWrite)) ([Windows.Storage.Streams.IRandomAccessStream])
      $options = New-Object Windows.Data.Pdf.PdfPageRenderOptions
      $options.DestinationWidth = [uint32][Math]::Ceiling($page.Size.Width * 2)
      $options.DestinationHeight = [uint32][Math]::Ceiling($page.Size.Height * 2)
      Wait-Action ($page.RenderToStreamAsync($stream, $options))
      $pngs += $name
    } finally {
      if ($stream) { $stream.Dispose() }
      $page.Dispose()
    }
  }
  foreach ($existing in (Get-ChildItem -LiteralPath $resolved -File -Filter ($pdf.BaseName + '-page-*.png'))) {
    if ($pngs -notcontains $existing.Name -and $existing.Name -match ('^' + [regex]::Escape($pdf.BaseName) + '-page-\d{3}\.png$')) {
      $existingPath = [IO.Path]::GetFullPath($existing.FullName)
      if (-not $existingPath.StartsWith($expected + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'A stale rendering is outside the expected directory.'
      }
      Remove-Item -LiteralPath $existingPath
    }
  }
  $report += [PSCustomObject]@{ fichier = $pdf.Name; pages = [int]$document.PageCount; captures = $pngs }
}
$json = $report | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText((Join-Path $resolved 'rendus.json'), $json, (New-Object Text.UTF8Encoding($false)))
$count = ($report | ForEach-Object { $_.captures.Count } | Measure-Object -Sum).Sum
Write-Output ('Rendered {0} PDF files into {1} PNG pages locally.' -f $report.Count, $count)
