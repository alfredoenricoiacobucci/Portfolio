#!/bin/bash
# Riordina cartella - nasconde i file tecnici di Next.js dalla vista del Finder
# Doppio click per eseguire. I file restano funzionanti, vengono solo nascosti.

cd "$(dirname "$0")"

echo "Nascondo i file tecnici dalla vista del Finder..."

# Cartelle tecniche di Next.js (devono restare in posizione ma non vanno toccate)
chflags hidden public 2>/dev/null
chflags hidden src 2>/dev/null
chflags hidden node_modules 2>/dev/null
chflags hidden .next 2>/dev/null
chflags hidden .git 2>/dev/null

# File di configurazione di Next.js / npm (devono restare al root)
chflags hidden package.json 2>/dev/null
chflags hidden package-lock.json 2>/dev/null
chflags hidden next.config.js 2>/dev/null
chflags hidden tailwind.config.js 2>/dev/null
chflags hidden postcss.config.js 2>/dev/null
chflags hidden jsconfig.json 2>/dev/null
chflags hidden .gitignore 2>/dev/null

echo ""
echo "Fatto! Nel Finder ora vedi solo:"
echo "  - contenuti/        (le tue foto e i tuoi testi)"
echo "  - Manager sito AEI.html  (l'editor)"
echo "  - LEGGIMI.md        (le istruzioni)"
echo ""
echo "Per rimostrare tutto: chflags nohidden <nome>"
echo ""
echo "Puoi chiudere questa finestra."
read -n 1 -s -r -p "Premi un tasto per chiudere..."
echo ""
