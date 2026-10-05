// lib/images.js
// Helper usabili sia sul server sia nel client: nessun import di node:*,
// altrimenti finirebbe nel bundle del browser.

/**
 * Percorso dell'anteprima 1280px generata da scripts/generate-images.mjs.
 * Da usare dove serve una miniatura e non l'immagine piena: sfondi della
 * landing e banner delle righe marquee, che prima scaricavano l'originale
 * intero (fino a 17 MB) per riempire uno spazio coperto da un overlay opaco.
 *
 * L'anteprima esiste solo per le foto che contenuti.json indica come sfondo
 * landing o come anteprima/banner di progetto; per le altre questa funzione
 * restituirebbe un percorso inesistente, quindi va chiamata solo in quei due
 * punti.
 */
export function preview(src) {
  if (!src) return src;
  return src.replace(/\.(jpe?g|png|webp)$/i, "@md.webp");
}

/**
 * Handler onError da mettere sulle <img> che usano preview(): se l'anteprima
 * manca — sorgente eliminata ma ancora elencata in contenuti.json, oppure foto
 * non compresa nell'insieme delle anteprime — ricade sull'originale invece di
 * lasciare un buco. Agisce una volta sola, per non entrare in loop se manca
 * anche l'originale.
 */
export function fallbackToOriginal(original) {
  return (e) => {
    const img = e.currentTarget;
    if (img.dataset.fellBack === "1") return;
    img.dataset.fellBack = "1";
    img.src = original;
  };
}
