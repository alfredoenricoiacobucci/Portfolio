#!/bin/bash
APP="/Applications/Manager Portfolio.app"
JS="$HOME/Desktop/Portfolio AEI/manager.js"
ICON_PNG="$HOME/Desktop/Portfolio AEI/icon_1024.png"

# Chiudi tutto
killall "Manager Portfolio" 2>/dev/null
killall osascript 2>/dev/null
lsof -ti :8471 | xargs kill -9 2>/dev/null
sleep 1

# Cancella e ricompila
rm -rf "$APP"
osacompile -l JavaScript -o "$APP" "$JS"

# Crea .icns da icon_1024.png con iconutil
if [ -f "$ICON_PNG" ]; then
  ICONSET="/tmp/ManagerPortfolio.iconset"
  rm -rf "$ICONSET"
  mkdir -p "$ICONSET"
  sips -z 1024 1024 "$ICON_PNG" --out "$ICONSET/icon_512x512@2x.png" >/dev/null 2>&1
  sips -z 512 512 "$ICON_PNG" --out "$ICONSET/icon_512x512.png" >/dev/null 2>&1
  sips -z 512 512 "$ICON_PNG" --out "$ICONSET/icon_256x256@2x.png" >/dev/null 2>&1
  sips -z 256 256 "$ICON_PNG" --out "$ICONSET/icon_256x256.png" >/dev/null 2>&1
  sips -z 256 256 "$ICON_PNG" --out "$ICONSET/icon_128x128@2x.png" >/dev/null 2>&1
  sips -z 128 128 "$ICON_PNG" --out "$ICONSET/icon_128x128.png" >/dev/null 2>&1
  sips -z 64 64 "$ICON_PNG" --out "$ICONSET/icon_32x32@2x.png" >/dev/null 2>&1
  sips -z 32 32 "$ICON_PNG" --out "$ICONSET/icon_32x32.png" >/dev/null 2>&1
  sips -z 32 32 "$ICON_PNG" --out "$ICONSET/icon_16x16@2x.png" >/dev/null 2>&1
  sips -z 16 16 "$ICON_PNG" --out "$ICONSET/icon_16x16.png" >/dev/null 2>&1
  iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/applet.icns"
  rm -rf "$ICONSET"
fi

xattr -cr "$APP" 2>/dev/null
touch "$APP"

# Imposta icona tramite NSWorkspace
if [ -f "$ICON_PNG" ]; then
  osascript -e 'use framework "AppKit"' \
    -e "set iconImage to (current application's NSImage's alloc()'s initWithContentsOfFile:\"$ICON_PNG\")" \
    -e "current application's NSWorkspace's sharedWorkspace()'s setIcon:iconImage forFile:\"$APP\" options:0" 2>/dev/null
fi

echo "✓ Fatto."
