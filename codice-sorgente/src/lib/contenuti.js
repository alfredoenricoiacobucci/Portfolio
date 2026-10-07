// lib/contenuti.js
// Lettura lato server di contenuti/ — condivisa da index.js e artwork/index.js,
// dove il parser di stringhe.txt era duplicato riga per riga.

// Solo server: importato dalle getStaticProps. Gli helper usabili anche nel
// client stanno in lib/images.js, per non trascinare node:fs nel bundle.
import fs from "node:fs";
import path from "node:path";

const CONTENUTI_DIR = path.join(process.cwd(), "contenuti");

/** Legge un file di testo, stringa vuota se manca. */
export function readText(name) {
  try {
    return fs.readFileSync(path.join(CONTENUTI_DIR, name), "utf-8").trim();
  } catch {
    return "";
  }
}

/** Legge un JSON, fallback se manca o è corrotto. */
export function readJSON(name, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(path.join(CONTENUTI_DIR, name), "utf-8"));
  } catch {
    return fallback;
  }
}

/**
 * Parsa stringhe.txt — formato `CHIAVE = valore`, righe vuote e `#` ignorate.
 */
export function readStrings() {
  const strings = {};
  for (const line of readText("stringhe.txt").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key) strings[key] = trimmed.slice(eq + 1).trim();
  }
  return strings;
}
