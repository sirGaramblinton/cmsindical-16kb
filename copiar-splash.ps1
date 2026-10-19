param(
    [string]$SourceImage = "resources\android\icon.png",
    [string]$OutputDir = "resources\android\splash",
    [string]$Android12Splash = "resources\splash.png",
    [double]$LogoScale = 0.34,
    [double]$Android12LogoScale = 0.66,             # <--- Cambiado por defecto a 0.66
    [ValidateRange(288, 4096)]                       # <--- Cambiado el mínimo de 512 a 288
    [int]$Android12CanvasSize = 432,                 # <--- Cambiado por defecto a 432
    [string]$BackgroundColor = "#FFFFFF"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function Parse-HexColor {
    param([string]$Hex)

    $clean = $Hex.Trim().TrimStart('#')
    if ($clean.Length -ne 6) {
        throw "Color inválido '$Hex'. Usa formato #RRGGBB."
    }

    $r = [Convert]::ToInt32($clean.Substring(0, 2), 16)
    $g = [Convert]::ToInt32($clean.Substring(2, 2), 16)
    $b = [Convert]::ToInt32($clean.Substring(4, 2), 16)

    return [System.Drawing.Color]::FromArgb($r, $g, $b)
}

function Save-Png {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [string]$Path
    )

    $dir = Split-Path -Parent $Path
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }

    $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function New-SplashImage {
    param(
        [System.Drawing.Image]$Source,
        [int]$Width,
        [int]$Height,
        [double]$Scale,
        [System.Drawing.Color]$FillColor
    )

    $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear($FillColor)

    $maxTarget = [Math]::Min($Width, $Height) * $Scale
    $ratio = $maxTarget / [Math]::Max($Source.Width, $Source.Height)
    $drawWidth = [Math]::Max(1, [Math]::Round($Source.Width * $ratio))
    $drawHeight = [Math]::Max(1, [Math]::Round($Source.Height * $ratio))
    $x = [Math]::Floor(($Width - $drawWidth) / 2)
    $y = [Math]::Floor(($Height - $drawHeight) / 2)

    $graphics.DrawImage($Source, $x, $y, $drawWidth, $drawHeight)
    $graphics.Dispose()

    return $bitmap
}

function New-Android12Icon {
    param(
        [System.Drawing.Image]$Source,
        [double]$Scale,
        [int]$CanvasSize
    )

    $size = $CanvasSize
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

    # Configuración extrema de nitidez para reducciones agresivas
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)

    # Cálculo exacto basado en proporciones sin redondeos bruscos prematuros
    $maxTarget = $size * $Scale
    $ratio = $maxTarget / [Math]::Max($Source.Width, $Source.Height)
    $drawWidth = $Source.Width * $ratio
    $drawHeight = $Source.Height * $ratio

    # Centrado perfecto usando números flotantes (evita que el logo se desplace 1px y se deforme)
    $x = ($size - $drawWidth) / 2
    $y = ($size - $drawHeight) / 2

    # Dibujar usando el rectángulo de alta precisión
    $targetRect = New-Object System.Drawing.RectangleF($x, $y, $drawWidth, $drawHeight)
    $graphics.DrawImage($Source, $targetRect)
    $graphics.Dispose()

    return $bitmap
}

if (-not (Test-Path $SourceImage)) {
    throw "No se encontró la imagen fuente: $SourceImage"
}

$background = Parse-HexColor $BackgroundColor
$source = [System.Drawing.Image]::FromFile($SourceImage)

try {
    $portrait = @(
        @{ Density = "ldpi"; Width = 240; Height = 320 },
        @{ Density = "mdpi"; Width = 320; Height = 480 },
        @{ Density = "hdpi"; Width = 480; Height = 800 },
        @{ Density = "xhdpi"; Width = 720; Height = 1280 },
        @{ Density = "xxhdpi"; Width = 960; Height = 1600 },
        @{ Density = "xxxhdpi"; Width = 1280; Height = 1920 }
    )

    $landscape = @(
        @{ Density = "ldpi"; Width = 320; Height = 240 },
        @{ Density = "mdpi"; Width = 480; Height = 320 },
        @{ Density = "hdpi"; Width = 800; Height = 480 },
        @{ Density = "xhdpi"; Width = 1280; Height = 720 },
        @{ Density = "xxhdpi"; Width = 1600; Height = 960 },
        @{ Density = "xxxhdpi"; Width = 1920; Height = 1280 }
    )

    foreach ($spec in $portrait) {
        $img = New-SplashImage -Source $source -Width $spec.Width -Height $spec.Height -Scale $LogoScale -FillColor $background
        try {
            $path = Join-Path $OutputDir ("drawable-port-{0}-screen.png" -f $spec.Density)
            Save-Png -Bitmap $img -Path $path
            Write-Host ("Generado {0} ({1}x{2})" -f $path, $spec.Width, $spec.Height)
        } finally {
            $img.Dispose()
        }
    }

    foreach ($spec in $landscape) {
        $img = New-SplashImage -Source $source -Width $spec.Width -Height $spec.Height -Scale $LogoScale -FillColor $background
        try {
            $path = Join-Path $OutputDir ("drawable-land-{0}-screen.png" -f $spec.Density)
            Save-Png -Bitmap $img -Path $path
            Write-Host ("Generado {0} ({1}x{2})" -f $path, $spec.Width, $spec.Height)
        } finally {
            $img.Dispose()
        }
    }

    $android12Icon = New-Android12Icon -Source $source -Scale $Android12LogoScale -CanvasSize $Android12CanvasSize
    try {
        Save-Png -Bitmap $android12Icon -Path $Android12Splash
        Write-Host ("Generado {0} ({1}x{1}, fondo transparente)" -f $Android12Splash, $Android12CanvasSize)
    } finally {
        $android12Icon.Dispose()
    }

    Write-Host ""
    Write-Host "OK: splash generados correctamente."
    Write-Host "Siguiente paso recomendado:"
    Write-Host "  ionic cordova platform rm android"
    Write-Host "  ionic cordova platform add android@14.0.1"
    Write-Host "  ionic cordova prepare android"
    Write-Host "  ionic cordova build android --debug --verbose"
} finally {
    $source.Dispose()
}
