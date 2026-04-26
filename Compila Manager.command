#!/bin/bash
# ============================================================
# Compila Manager Portfolio — crea l'app nativa con finestra
# Doppio click su questo file. Richiede Xcode Command Line Tools.
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$SCRIPT_DIR/Manager Portfolio.app"
SWIFT_SRC="$APP/Contents/MacOS/main.swift"
BINARY="$APP/Contents/MacOS/ManagerPortfolio"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Compilazione Manager Portfolio         ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Verifica Xcode Command Line Tools
if ! xcode-select -p &>/dev/null; then
  echo "⚠️  Xcode Command Line Tools non trovati."
  echo "   Installali con: xcode-select --install"
  echo ""
  read -p "Premi Invio per chiudere..."
  exit 1
fi

if [ ! -f "$SWIFT_SRC" ]; then
  echo "❌ File sorgente non trovato: $SWIFT_SRC"
  read -p "Premi Invio per chiudere..."
  exit 1
fi

echo "→ Compilazione in corso..."
swiftc "$SWIFT_SRC" \
  -o "$BINARY" \
  -framework Cocoa \
  -framework WebKit \
  -O \
  2>&1

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Compilazione fallita."
  read -p "Premi Invio per chiudere..."
  exit 1
fi

# Aggiorna Info.plist per puntare al nuovo binario
PLIST="$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleExecutable ManagerPortfolio" "$PLIST" 2>/dev/null

# Rimuovi vecchio script shell (non più necessario)
rm -f "$APP/Contents/MacOS/run"

# Rimuovi quarantena
xattr -rd com.apple.quarantine "$APP" 2>/dev/null

echo ""
echo "✅ Compilazione completata!"
echo ""
echo "Ora puoi:"
echo "  • Fare doppio click su \"Manager Portfolio.app\" per aprirlo"
echo "  • Fare doppio click su \"Installa Manager.command\" per copiarlo in Applicazioni"
echo ""
read -p "Premi Invio per chiudere..."
