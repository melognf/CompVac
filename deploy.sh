#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════
#  Team Days — Deploy script (bash, para Git Bash en Windows)
#  Uso: ./deploy.sh "mensaje del commit"
#  Bumpea el timestamp en sw.js, commitea y pushea automáticamente.
# ════════════════════════════════════════════════════════════

set -e

MSG="${1:-Update}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SW_FILE="$SCRIPT_DIR/sw.js"

if [ ! -f "$SW_FILE" ]; then
  echo "❌ No encontré sw.js en $SCRIPT_DIR"
  exit 1
fi

# 1) Bumpear timestamp en sw.js
BUILD=$(date +"%Y-%m-%dT%H:%M:%S")
sed -i.bak "s/const BUILD = '[^']*';/const BUILD = '$BUILD';/" "$SW_FILE"
rm -f "$SW_FILE.bak"
echo "✓ sw.js bumpeado a $BUILD"

# 2) Git add + commit + push
cd "$SCRIPT_DIR"
git add -A
git commit -m "$MSG"
git push

echo ""
echo "🚀 Deploy completo!"
echo "   Los usuarios con la app abierta recibirán la nueva versión en menos de 60 segundos."
