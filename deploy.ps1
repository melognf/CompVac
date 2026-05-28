# ════════════════════════════════════════════════════════════
#  Team Days — Deploy script
#  Uso: .\deploy.ps1 "mensaje del commit"
#  Bumpea el timestamp en sw.js, commitea y pushea automáticamente.
#  Esto fuerza a que todos los dispositivos detecten y apliquen
#  la nueva versión en menos de 1 minuto, sin refresh manual.
# ════════════════════════════════════════════════════════════

param(
  [Parameter(Mandatory=$false)]
  [string]$Message = "Update"
)

$ErrorActionPreference = "Stop"
$proj = $PSScriptRoot
$swFile = Join-Path $proj "sw.js"

if (-not (Test-Path $swFile)) {
  Write-Host "❌ No encontré sw.js en $proj" -ForegroundColor Red
  exit 1
}

# 1) Bumpear timestamp en sw.js
$newBuild = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
$content  = Get-Content $swFile -Raw
$updated  = $content -replace "const BUILD = '[^']+';", "const BUILD = '$newBuild';"
$updated  = $updated -replace "// BUILD: [^\r\n]+", "// BUILD: $newBuild  ← este timestamp se reescribe en cada deploy"

if ($content -eq $updated) {
  Write-Host "⚠️  No se pudo encontrar la línea BUILD en sw.js" -ForegroundColor Yellow
  exit 1
}

Set-Content -Path $swFile -Value $updated -NoNewline
Write-Host "✓ sw.js bumpeado a $newBuild" -ForegroundColor Green

# 2) Git add + commit + push
Push-Location $proj
try {
  git add -A
  git commit -m $Message
  git push
  Write-Host ""
  Write-Host "🚀 Deploy completo!" -ForegroundColor Green
  Write-Host "   Los usuarios con la app abierta recibirán la nueva versión en menos de 60 segundos." -ForegroundColor Cyan
} finally {
  Pop-Location
}
