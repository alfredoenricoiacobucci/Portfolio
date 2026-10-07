// lib/seo.js
// Metadati condivisi. Prima il sito non aveva nessun <title>, nessuna
// description e nessun tag Open Graph: la tab del browser mostrava l'URL e un
// link condiviso su WhatsApp o Instagram appariva senza anteprima.

export const SITE_URL = "https://alfredoenricoiacobucci.art";
export const SITE_NAME = "Alfredo Enrico Iacobucci";

/** URL assoluto, richiesto dai tag Open Graph (gli scraper non risolvono i relativi). */
export const abs = (p) => (p?.startsWith("http") ? p : `${SITE_URL}${p || ""}`);

/**
 * Costruisce i meta per una pagina.
 * @param {object} o
 * @param {string} [o.title]    titolo pagina; se assente resta il solo nome
 * @param {string} [o.description]
 * @param {string} [o.image]    percorso immagine per l'anteprima social
 * @param {string} [o.path]     percorso canonico, es. "/artwork"
 */
export function meta({ title, description, image, path = "/" } = {}) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Fotografia e arte multimediale`;
  const desc =
    description ||
    "Portfolio di Alfredo Enrico Iacobucci, artista multimediale: fotografia d'autore, direzione creativa e progetti professionali.";
  return {
    title: fullTitle,
    description: desc.replace(/\s+/g, " ").slice(0, 300),
    image: abs(image || "/icon-512.png"),
    url: abs(path),
  };
}
