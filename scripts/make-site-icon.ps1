# Site icon from the owner's master image (2026-10-15 — the owner supplied docs/brand/site-icon-master.png and
# asked that it replace the old icon).
#
#   powershell -File scripts/make-site-icon.ps1
#
# Writes, from the one master:
#   src/app/icon.png        512 × 512  — the browser-tab / bookmark icon (Next links it from every page)
#   src/app/apple-icon.png  180 × 180  — iPhone / iPad home-screen icon, a little more white around the mark
#   src/app/favicon.ico     16 · 32 · 48 — for browsers and tools that ask for /favicon.ico by name
#
# The master is 640 × 640 with the mark in the middle (x 185–454, y 128–511). The icons crop to a square
# around the mark so it fills more of a 16- or 32-pixel tab; nothing in the drawing itself is changed.
# Uses .NET System.Drawing (Windows), so no image package is needed in the repo.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$master = Join-Path $root "docs/brand/site-icon-master.png"
$app = Join-Path $root "src/app"

function Render([System.Drawing.Image]$src, [int]$cropX, [int]$cropY, [int]$cropSide, [int]$size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $attr = New-Object System.Drawing.Imaging.ImageAttributes
  $attr.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $size, $size), $cropX, $cropY, $cropSide, $cropSide, [System.Drawing.GraphicsUnit]::Pixel, $attr)
  $g.Dispose()
  return $bmp
}
function PngBytes([System.Drawing.Bitmap]$bmp) {
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  return ,$ms.ToArray()
}

$src = [System.Drawing.Image]::FromFile($master)
try {
  # tab icon: a 448-pixel square centred on the mark (about 8% white above and below it)
  $tab = @{ x = 96; y = 96; side = 448 }
  # home-screen icon: 560 pixels, so the rounded corners the phone adds do not touch the mark
  $homeScreen = @{ x = 40; y = 40; side = 560 }

  $b = Render $src $tab.x $tab.y $tab.side 512
  [IO.File]::WriteAllBytes((Join-Path $app "icon.png"), (PngBytes $b)); $b.Dispose()
  $b = Render $src $homeScreen.x $homeScreen.y $homeScreen.side 180
  [IO.File]::WriteAllBytes((Join-Path $app "apple-icon.png"), (PngBytes $b)); $b.Dispose()

  # favicon.ico — one PNG per size (the ICO format allows PNG entries; every current browser reads them)
  $sizes = 16, 32, 48
  $pngs = foreach ($s in $sizes) { $b = Render $src $tab.x $tab.y $tab.side $s; ,(PngBytes $b); $b.Dispose() }
  $ms = New-Object System.IO.MemoryStream
  $w = New-Object System.IO.BinaryWriter $ms
  $w.Write([UInt16]0); $w.Write([UInt16]1); $w.Write([UInt16]$sizes.Count)
  $offset = 6 + 16 * $sizes.Count
  for ($i = 0; $i -lt $sizes.Count; $i++) {
    $w.Write([byte]$sizes[$i]); $w.Write([byte]$sizes[$i]); $w.Write([byte]0); $w.Write([byte]0)
    $w.Write([UInt16]1); $w.Write([UInt16]32)
    $w.Write([UInt32]$pngs[$i].Length); $w.Write([UInt32]$offset)
    $offset += $pngs[$i].Length
  }
  foreach ($p in $pngs) { $w.Write($p) }
  $w.Flush()
  [IO.File]::WriteAllBytes((Join-Path $app "favicon.ico"), $ms.ToArray())
} finally {
  $src.Dispose()
}
foreach ($f in "icon.png", "apple-icon.png", "favicon.ico") { "{0} {1} bytes" -f $f, (Get-Item (Join-Path $app $f)).Length }
