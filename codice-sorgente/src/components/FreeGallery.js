// components/FreeGallery.js
// Galleria a composizione libera, disegnata nel Manager su una griglia di
// 12 colonne a celle quadrate. Posizioni e misure sono in percentuale del
// riquadro, quindi su telefono la stessa composizione si rimpicciolisce
// senza cambiare disposizione.
import Image from "next/image";

const COLS = 12;
// Mezzo spazio tra foto adiacenti, in % della larghezza della galleria
// (circa 3px su uno schermo da 1300px, come il mosaico automatico).
const HALF_GAP = "0.23%";

export default function FreeGallery({ composition, images = [], onImageClick, altFor }) {
  const rows = composition?.rows || 6;
  const gap = composition?.gap != null ? `${composition.gap}%` : HALF_GAP;
  const items = composition?.items || [];

  return (
    <div className="relative w-full" style={{ aspectRatio: `${COLS} / ${rows}` }}>
      {items.map((it, n) => {
        const img = images[it.idx];
        if (!img) return null;
        const src = typeof img === "string" ? img : img.src;
        const vw = Math.max(10, Math.ceil((it.w / COLS) * 100));
        return (
          <button
            key={`${it.idx}-${n}`}
            type="button"
            className="group absolute block cursor-zoom-in"
            style={{
              left: `${(it.x / COLS) * 100}%`,
              top: `${(it.y / rows) * 100}%`,
              width: `${(it.w / COLS) * 100}%`,
              height: `${(it.h / rows) * 100}%`,
              padding: gap,
              zIndex: n + 1,
            }}
            onClick={() => onImageClick?.(it.idx)}
            aria-label={`Apri immagine ${it.idx + 1} a schermo intero`}
          >
            <span className="relative block w-full h-full overflow-hidden">
              <Image
                src={src}
                alt={altFor ? altFor(it.idx) : ""}
                fill
                sizes={`(max-width: 768px) ${Math.min(100, vw * 2)}vw, ${vw}vw`}
                quality={80}
                loading={it.y < 6 ? "eager" : "lazy"}
                className={`${it.fit === "contain" ? "object-contain" : "object-cover"} transition-[filter] duration-200 group-hover:brightness-[0.85]`}
                style={it.pos ? { objectPosition: `${it.pos.x}% ${it.pos.y}%` } : undefined}
              />
              <span className="pointer-events-none absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.8))" }} aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.5" y1="16.5" x2="21" y2="21" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
