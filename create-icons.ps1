Add-Type -AssemblyName System.Drawing

$iconDir = "C:\Users\thegr\Documents\hypewriter\src-tauri\icons"

# Create 256x256 PNG
$bmp = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(74, 144, 217))

$font = New-Object System.Drawing.Font("Segoe UI", 140, [System.Drawing.FontStyle]::Bold)
$brush = [System.Drawing.Brushes]::White
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$rect = New-Object System.Drawing.RectangleF(0, 0, 256, 256)
$g.DrawString("H", $font, $brush, $rect, $sf)

$g.Dispose()
$bmp.Save("$iconDir\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Create ICO file
$icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$fs = New-Object System.IO.FileStream("$iconDir\icon.ico", [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()

$bmp.Dispose()

# Create smaller sizes
$sizes = @(32, 128)
foreach ($size in $sizes) {
    $small = New-Object System.Drawing.Bitmap(256, 256)
    $small = $bmp.Clone()
    $resized = New-Object System.Drawing.Bitmap($size, $size)
    $g2 = [System.Drawing.Graphics]::FromImage($resized)
    $g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g2.Clear([System.Drawing.Color]::FromArgb(74, 144, 217))
    
    $fontSize = [int]($size * 0.55)
    $font2 = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold)
    $rect2 = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $g2.DrawString("H", $font2, $brush, $rect2, $sf)
    
    $g2.Dispose()
    $resized.Save("$iconDir\${size}x${size}.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose()
}

Write-Host "Icons created successfully!"
