#!/bin/bash
# ============================================================
# Installa Manager Portfolio in Applicazioni
# Doppio click su questo file per installare.
# ============================================================

APP_NAME="Manager Portfolio.app"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE="$SCRIPT_DIR/$APP_NAME"
DEST="/Applications/$APP_NAME"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Installazione Manager Portfolio        ║"
echo "╚══════════════════════════════════════════╝"
echo ""

if [ ! -d "$SOURCE" ]; then
  echo "❌ Errore: $APP_NAME non trovato nella cartella corrente."
  echo "   Assicurati che questo file sia nella stessa cartella dell'app."
  echo ""
  read -p "Premi Invio per chiudere..."
  exit 1
fi

# Rimuovi eventuale versione precedente
if [ -d "$DEST" ]; then
  echo "→ Rimuovo versione precedente..."
  rm -rf "$DEST"
fi

# Copia in Applicazioni
echo "→ Copio in /Applications..."
cp -R "$SOURCE" "$DEST"

# Rendi eseguibile
chmod +x "$DEST/Contents/MacOS/run"

# Rimuovi attributo di quarantena (evita il blocco di Gatekeeper)
xattr -rd com.apple.quarantine "$DEST" 2>/dev/null

echo ""
echo "✅ Manager Portfolio installato!"
echo ""
echo "Puoi trovarlo in:"
echo "  • Launchpad"
echo "  • /Applications/Manager Portfolio"
echo "  • Spotlight (cerca \"Manager Portfolio\")"
echo ""
read -p "Premi Invio per chiudere..."
