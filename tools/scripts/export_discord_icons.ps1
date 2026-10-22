Add-Type -AssemblyName System.Drawing

$destDir = "D:\TTRPG-Helper\discord_branding"
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

$srcIconPath = "D:\TTRPG-Helper\icon.png"
$srcLogoPath = "D:\TTRPG-Helper\logo NEW.png"

Copy-Item $srcIconPath -Destination (Join-Path $destDir "icon_original_1024x1024.png") -Force
Copy-Item $srcLogoPath -Destination (Join-Path $destDir "logo_original_1254x1254.png") -Force
Copy-Item $srcIconPath -Destination "D:\TTRPG-Helper\TTRPG_Helper_Discord_Icon.png" -Force

function Resize-Image($src, $dst, $w, $h) {
    $srcImg = [System.Drawing.Image]::FromFile($src)
    $destBitmap = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($destBitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.DrawImage($srcImg, 0, 0, $w, $h)
    $destBitmap.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $destBitmap.Dispose()
    $srcImg.Dispose()
}

Resize-Image $srcIconPath (Join-Path $destDir "discord_server_icon_1024x1024.png") 1024 1024
Resize-Image $srcIconPath (Join-Path $destDir "discord_avatar_512x512.png") 512 512
Resize-Image $srcIconPath (Join-Path $destDir "discord_icon_256x256.png") 256 256
Resize-Image $srcIconPath (Join-Path $destDir "discord_emoji_128x128.png") 128 128
Resize-Image $srcIconPath "D:\TTRPG-Helper\TTRPG_Helper_Discord_512x512.png" 512 512

Write-Output "Discord assets generated successfully in $destDir and root."
