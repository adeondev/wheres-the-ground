Add-Type -AssemblyName System.Drawing

$spriteDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../assets/sprites/player/spr_gabriel'))
$sourceDir = Join-Path $spriteDir 'source'
New-Item -ItemType Directory -Path $sourceDir -Force | Out-Null

# As mesmas cores de src/palette.js. Altere ambas se quiser outra paleta.
$outer = [System.Drawing.ColorTranslator]::FromHtml('#7a43ff')
$middle = [System.Drawing.ColorTranslator]::FromHtml('#21cfff')
$core = [System.Drawing.ColorTranslator]::FromHtml('#f3ffff')

$sheets = @(
  @{ Name = 'spritesheet_boost.png'; Colors = @{ 'FFDF7126' = $outer; 'FFDB0E0E' = $middle; 'FFFBF236' = $core } },
  @{ Name = 'spritesheet_dash.png'; Colors = @{ 'FFDF7126' = $outer; 'FFFF0000' = $middle; 'FFFBF236' = $core } }
)

foreach ($sheet in $sheets) {
  $target = Join-Path $spriteDir $sheet.Name
  $source = Join-Path $sourceDir $sheet.Name
  if (-not (Test-Path -LiteralPath $source)) {
    Copy-Item -LiteralPath $target -Destination $source
  }

  $bitmap = [System.Drawing.Bitmap]::new($source)
  $changed = 0
  try {
    for ($y = 0; $y -lt $bitmap.Height; $y++) {
      for ($x = 0; $x -lt $bitmap.Width; $x++) {
        $pixel = $bitmap.GetPixel($x, $y)
        $key = $pixel.ToArgb().ToString('X8')
        if ($sheet.Colors.ContainsKey($key)) {
          $bitmap.SetPixel($x, $y, $sheet.Colors[$key])
          $changed++
        }
      }
    }
    $temp = "$target.tmp.png"
    $bitmap.Save($temp, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $bitmap.Dispose()
  }
  Move-Item -LiteralPath $temp -Destination $target -Force
  Write-Output "$($sheet.Name): $changed pixels do fogo recoloridos"
}
