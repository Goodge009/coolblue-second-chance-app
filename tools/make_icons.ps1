Add-Type -AssemblyName System.Drawing

function New-Icon($size, $path) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::FromArgb(0, 144, 227))

    # carte blanche arrondie
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = [int]($size * 0.18)
    $p.AddArc(0, 0, $d, $d, 180, 90)
    $p.AddArc($size - $d, 0, $d, $d, 270, 90)
    $p.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
    $p.AddArc(0, $size - $d, $d, $d, 90, 90)
    $p.CloseFigure()
    $g.FillPath([System.Drawing.Brushes]::White, $p)

    # "C" bleu centré
    $font = New-Object System.Drawing.Font("Arial", [single]($size * 0.55), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 90, 227))
    $fmt = New-Object System.Drawing.StringFormat
    $fmt.Alignment = [System.Drawing.StringAlignment]::Center
    $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
    $y = [single](0.0 - ($size * 0.04))
    $rect = New-Object System.Drawing.RectangleF([single]0, $y, [single]$size, [single]$size)
    $g.DrawString("C", $font, $brush, $rect, $fmt)

    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

$dir = Join-Path (Split-Path -Parent $PSScriptRoot) "icons"
New-Icon 192 (Join-Path $dir "icon-192.png")
New-Icon 512 (Join-Path $dir "icon-512.png")
Write-Output "Icônes générées"
