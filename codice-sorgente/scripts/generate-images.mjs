#!/usr/bin/env node
/**
 * Prepara contenuti/ -> public/projects/ per il deploy.
 *
 * Sostituisce il vecchio `cp -r`, che copiava gli originali a piena
 * risoluzione (590 MB, con export da camera fino a 6000x4000).
 *
 * Per ogni immagine produce:
 *   <nome>.<ext>      ridotta a MAX_W, stesso nome dell'originale
 *                     -> galleria e viewer; i percorsi in contenuti.json
 *                        restano validi senza modifiche
 *   <nome>@md.webp    1280px, solo per le ~98 foto che contenuti.json usa
 *                     come sfondo della landing o come anteprima/banner di
 *                     progetto -> quei due punti prima scaricavano
 *                     l'originale intero (fino a 17 MB) per mostrare una
 *                     striscia o uno sfondo sotto un overlay opaco.
 *                     Generarla per tutte le 729 aggiungerebbe ~110 MB al
 *                     deploy senza che nessuno le veda.
 *
 * Regola fondamentale: 347 delle 729 foto sono GIA' a misura (1000x667) e
 * ricomprimerle le farebbe ingrassare (misurato: 75 KB -> 198 KB). Quindi
 * la variante principale viene scritta solo se risulta piu' leggera
 * dell'originale, altrimenti si copia l'originale invariato.
 *
 * I risultati sono memorizzati in un manifest dentro .next/cache, che Vercel
 * conserva tra i build: i deploy successivi riprocessano solo le foto nuove.
 */

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "contenuti");
const OUT = path.join(ROOT, "public", "projects");
const CACHE_DIR = path.join(ROOT, ".next", "cache", "img-pipeline");
const MANIFEST = path.join(CACHE_DIR, "manifest.json");

const MAX_W = 2400; // lato lungo per galleria e viewer
const PREVIEW_W = 1280; // anteprime: sfondi landing + righe marquee
const QUALITY = 80;
const PREVIEW_QUALITY = 74;
const CONCURRENCY = 8;

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const SKIP_NAMES = new Set([".DS_Store", "Icon\r", "Icon"]);

/**
 * Le foto che il sito usa come anteprima, lette da contenuti.json:
 * gli sfondi scelti per la landing e l'anteprima/banner di ogni progetto.
 * Solo per queste vale la pena generare la variante 1280px.
 */
async function previewSet() {
  const set = new Set();
  let c;
  try {
    c = JSON.parse(await fs.readFile(path.join(SRC, "contenuti.json"), "utf-8"));
  } catch {
    return set; // senza contenuti.json si salta la generazione delle anteprime
  }

  // landing.artworkImages / professionalImages: percorsi tipo /projects/art/<slug>/<file>
  for (const key of ["artworkImages", "professionalImages"]) {
    for (const src of c.landing?.[key] || []) {
      set.add(src.replace(/^\/projects\//, ""));
    }
  }

  // Per ogni progetto: il file indicato come anteprima, o il banner come
  // ripiego, o la prima foto dell'ordine se nessuno dei due e' impostato.
  for (const p of c.projects || []) {
    const file = (p.anteprima || p.banner || (p.ordine || [])[0] || "").trim();
    if (file) set.add(`${p.section}/${p.slug}/${file}`);
  }

  return set;
}

/** Tutti i file sotto dir, come percorsi relativi a dir. */
async function walk(dir, base = dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full, base)));
    else if (e.isFile() && !SKIP_NAMES.has(e.name)) out.push(path.relative(base, full));
  }
  return out;
}

/** Identita' del sorgente: cambia se il file cambia, senza rileggere i byte. */
function sourceKey(stat) {
  return createHash("sha1")
    .update(`${stat.size}:${stat.mtimeMs}:${MAX_W}:${PREVIEW_W}:${QUALITY}:${PREVIEW_QUALITY}`)
    .digest("hex");
}

async function loadManifest() {
  try {
    return JSON.parse(await fs.readFile(MANIFEST, "utf-8"));
  } catch {
    return {};
  }
}

/** Esegue tasks con parallelismo limitato. */
async function runPool(tasks, limit) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (i < tasks.length) await tasks[i++]();
  });
  await Promise.all(workers);
}

const stats = {
  resized: 0,
  copiedIntact: 0,
  copiedOther: 0,
  cached: 0,
  previews: 0,
  failed: 0,
  bytesIn: 0,
  bytesOut: 0,
};

async function processImage(rel, srcPath, outPath, key, manifest, needsPreview) {
  const srcStat = await fs.stat(srcPath);
  stats.bytesIn += srcStat.size;

  const previewPath = outPath.replace(/\.[^.]+$/, "@md.webp");
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  // Variante principale.
  //
  // Una foto già entro MAX_W viene copiata intatta, mai ricompressa: è stata
  // esportata a una qualità scelta deliberatamente, e re-encodarla aggiunge
  // artefatti di seconda generazione. Misurato su radici-032.jpg (1000x667):
  // 75 KB -> 36 KB a dimensioni identiche, cioè metà del peso buttato in
  // qualità per 39 KB di guadagno. Non vale su un portfolio fotografico.
  //
  // Sopra MAX_W il ridimensionamento impone comunque un nuovo encode, e lì il
  // guadagno è enorme (misurato: -78% e -96%), quindi si procede.
  let mainBytes = srcStat.size;
  try {
    const meta = await sharp(srcPath).metadata();
    const rotated = meta.orientation >= 5; // EXIF 5-8 scambia i lati
    const longEdge = Math.max(
      rotated ? meta.height : meta.width,
      rotated ? meta.width : meta.height
    );

    if (longEdge <= MAX_W) {
      await fs.copyFile(srcPath, outPath);
      stats.copiedIntact++;
    } else {
      const buf = await sharp(srcPath)
        .rotate() // applica l'orientamento EXIF prima di ridimensionare
        .resize({ width: MAX_W, height: MAX_W, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toBuffer();

      if (buf.length < srcStat.size) {
        await fs.writeFile(outPath, buf);
        mainBytes = buf.length;
        stats.resized++;
      } else {
        await fs.copyFile(srcPath, outPath);
        stats.copiedIntact++;
      }
    }
  } catch (err) {
    // Un file illeggibile non deve far fallire il build: copiamo l'originale.
    console.warn(`  ! ${rel}: ${err.message} — copio l'originale`);
    await fs.copyFile(srcPath, outPath);
    stats.failed++;
  }
  stats.bytesOut += mainBytes;

  // Anteprima 1280px, solo dove serve davvero.
  let previewBytes = 0;
  if (needsPreview) {
    try {
      const info = await sharp(srcPath)
        .rotate()
        .resize({ width: PREVIEW_W, height: PREVIEW_W, fit: "inside", withoutEnlargement: true })
        .webp({ quality: PREVIEW_QUALITY })
        .toFile(previewPath);
      previewBytes = info.size;
      stats.previews++;
    } catch {
      /* senza anteprima il codice ricade sull'immagine principale */
    }
  }
  stats.bytesOut += previewBytes;

  manifest[rel] = { key, main: mainBytes, preview: previewBytes };
}

async function main() {
  const t0 = Date.now();
  console.log("→ pipeline immagini: contenuti/ → public/projects/");

  const manifest = await loadManifest();
  const previews = await previewSet();
  const files = await walk(SRC);
  if (files.length === 0) {
    console.error(`✗ nessun file in ${SRC}`);
    process.exit(1);
  }

  const tasks = [];
  for (const rel of files) {
    const srcPath = path.join(SRC, rel);
    const outPath = path.join(OUT, rel);
    const ext = path.extname(rel).toLowerCase();

    if (!IMAGE_EXT.has(ext)) {
      // contenuti.json, stringhe.txt, .gitkeep, video: copiati invariati
      tasks.push(async () => {
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.copyFile(srcPath, outPath);
        stats.copiedOther++;
      });
      continue;
    }

    tasks.push(async () => {
      const srcStat = await fs.stat(srcPath);
      const key = sourceKey(srcStat);
      const cached = manifest[rel];
      const previewPath = outPath.replace(/\.[^.]+$/, "@md.webp");

      // Cache valida solo se l'output e' davvero ancora sul disco.
      if (cached?.key === key) {
        const [mainOk, previewOk] = await Promise.all([
          fs.access(outPath).then(() => true, () => false),
          cached.preview ? fs.access(previewPath).then(() => true, () => false) : true,
        ]);
        if (mainOk && previewOk) {
          stats.cached++;
          stats.bytesIn += srcStat.size;
          stats.bytesOut += (cached.main || 0) + (cached.preview || 0);
          return;
        }
      }
      await processImage(rel, srcPath, outPath, key, manifest, previews.has(rel));
    });
  }

  await runPool(tasks, CONCURRENCY);

  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(MANIFEST, JSON.stringify(manifest));

  const mb = (b) => (b / 1048576).toFixed(0);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `  ridimensionate ${stats.resized} · intatte ${stats.copiedIntact} · ` +
      `da cache ${stats.cached} · anteprime ${stats.previews} · altri file ${stats.copiedOther}` +
      (stats.failed ? ` · illeggibili ${stats.failed}` : "")
  );
  console.log(`✓ ${mb(stats.bytesIn)} MB → ${mb(stats.bytesOut)} MB in ${secs}s`);
}

main().catch((err) => {
  console.error("✗ pipeline immagini fallita:", err);
  process.exit(1);
});
