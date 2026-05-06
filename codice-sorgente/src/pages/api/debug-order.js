// API diagnostica temporanea — restituisce l'ordine dei progetti come letto dal server
import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const contenutiPath = path.join(process.cwd(), "contenuti", "contenuti.json");
  const exists = fs.existsSync(contenutiPath);

  let contenuti = { projects: [] };
  let parseError = null;

  if (exists) {
    try {
      const raw = fs.readFileSync(contenutiPath, "utf-8");
      contenuti = JSON.parse(raw);
    } catch (e) {
      parseError = e.message;
    }
  }

  // Ordine dei progetti come li vedrebbe il sito
  const artOrder = (contenuti.projects || [])
    .filter(p => p.section === "art")
    .map((p, i) => ({ pos: i + 1, slug: p.slug, titolo: (p.titolo || "").split("\n")[0] }));

  const proOrder = (contenuti.projects || [])
    .filter(p => p.section === "pro")
    .map((p, i) => ({ pos: i + 1, slug: p.slug, titolo: (p.titolo || "").split("\n")[0] }));

  // Cartelle fisiche
  let artFolders = [], proFolders = [];
  try { artFolders = fs.readdirSync(path.join(process.cwd(), "contenuti", "art")).filter(f => fs.statSync(path.join(process.cwd(), "contenuti", "art", f)).isDirectory()).sort(); } catch {}
  try { proFolders = fs.readdirSync(path.join(process.cwd(), "contenuti", "pro")).filter(f => fs.statSync(path.join(process.cwd(), "contenuti", "pro", f)).isDirectory()).sort(); } catch {}

  res.json({
    cwd: process.cwd(),
    contenutiPath,
    fileExists: exists,
    parseError,
    totalProjects: (contenuti.projects || []).length,
    artOrder,
    proOrder,
    artFolders,
    proFolders,
  });
}
