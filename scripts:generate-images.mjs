// scripts/generate-images.mjs
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const PROJECTS_DIR = path.join(PUBLIC_DIR, "projects");

// Estensioni supportate
const exts = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// ordinamento “naturale”: p1-2.jpg prima di p1-10.jpg
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const naturalSort = (a, b) => collator.compare(a, b);

// utility: lista cartelle di primo livello in public/projects
function getProjectFolders() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    console.error(`❌ Non trovo la cartella: ${PROJECTS_DIR}`);
    process.exit(1);
  }
  return fs
    .readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort(naturalSort);
}

// per ogni cartella, raccogli i file immagine
function getImagesForFolder(folder) {
  const dir = path.join(PROJECTS_DIR, folder);
  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((name) => exts.has(path.extname(name).toLowerCase()))
    .sort(naturalSort);

  // output come path pubblici (devono iniziare con /)
  return files.map((f) => `/projects/${folder}/${f}`);
}

function main() {
  const folders = getProjectFolders();
  if (folders.length === 0) {
    console.log("ℹ️ Nessuna cartella progetto trovata in /public/projects");
    return;
  }

  const blocks = folders.map((folder) => {
    const images = getImagesForFolder(folder);
    const preview = images.length ? ` // ${path.basename(images[0])} … (${images.length} img)` : " // (vuoto)";
    return `  // ${folder}${preview}
  {
    name: "P? - TITOLO PROGETTO - CITTA ANNO",
    description: "Scrivi qui la descrizione del progetto ${folder}…",
    images: [
${images.map((p) => `      "${p}",`).join("\n")}
    ]
  }`;
  });

  const output = `// 🔽 COPIA E INCOLLA questi blocchi nell'array "const projects = [ ... ]" di pages/index.js
// (sostituisci "P?" e i testi con quelli reali)
[
${blocks.join(",\n\n")}
]
`;

  // stampa in console
  console.log(output);

  // salva anche su file per comodità
  const outPath = path.join(ROOT, "scripts", "generated-images.txt");
  fs.writeFileSync(outPath, output, "utf8");
  console.log(`\n✅ Creato file: ${outPath}`);
}

main();
