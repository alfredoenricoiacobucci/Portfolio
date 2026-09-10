#!/bin/bash
APP="/Applications/Manager Portfolio.app"

echo "Resettando cache icone macOS..."

# Kill icon services
killall iconservicesd 2>/dev/null
killall iconservicesagent 2>/dev/null

# Remove icon caches
sudo find /private/var/folders -name "com.apple.iconservices*" -exec rm -rf {} + 2>/dev/null
sudo find /private/var/folders -name "com.apple.dock.iconcache" -exec rm -rf {} + 2>/dev/null
rm -rf ~/Library/Caches/com.apple.iconservices.store 2>/dev/null

# Reset Launch Services
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain local -domain system -domain user 2>/dev/null

# Touch app files
touch "$APP"
touch "$APP/Contents/Info.plist" 2>/dev/null
touch "$APP/Contents/Resources/applet.icns" 2>/dev/null

# Re-register
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister "$APP" 2>/dev/null

# Restart Dock and Finder
killall Dock
killall Finder

echo ""
echo "✓ Cache resettata. Controlla l'icona nel Dock/Applicazioni."
echo "Premi un tasto per chiudere..."
read -n 1
