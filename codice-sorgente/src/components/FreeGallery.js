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
// Testi: grandezza in proporzione alla larghezza della galleria (come nel Manager)
const TXT = { s: 1.1, m: 1.6, l: 2.6, xl: 4.2 };
const ALIGN = { sinistra: "left", centro: "center", destra: "right" };

export default function FreeGallery({ composition, images = [], onImageClick, altFor }) {
  const rows = composition?.rows || 6;
  const gap = composition?.gap != null ? `${composition.gap}%` : HALF_GAP;
  const items = composition?.items || [];

  return (
    // il mezzo spazio intorno alle foto esterne si recupera: i bordi coincidono con i margini, come nel mosaico
    <div style={{ display: "flow-root" }}>
    <div style={{ margin: `calc(${gap} * -1)` }}>
    <div className="relative w-full" style={{ aspectRatio: `${COLS} / ${rows}`, containerType: "inline-size" }}>
      {items.map((it, n) => {
        if (typeof it.text === "string") {
          const big = it.dim === "l" || it.dim === "xl";
          return (
            <div
              key={`t-${n}`}
              className="absolute whitespace-pre-wrap"
              style={{
                left: `${(it.x / COLS) * 100}%`,
                top: `${(it.y / rows) * 100}%`,
                width: `${(it.w / COLS) * 100}%`,
                height: `${(it.h / rows) * 100}%`,
                padding: gap,
                zIndex: n + 1,
                fontSize: `max(9px, ${TXT[it.dim] || TXT.m}cqw)`,
                fontWeight: big ? 800 : 400,
                lineHeight: big ? 1.08 : 1.5,
                letterSpacing: big ? "-0.01em" : undefined,
                textAlign: ALIGN[it.align] || "left",
                textTransform: it.upper ? "uppercase" : undefined,
                overflowWrap: "break-word",
              }}
            >
              {it.text}
            </div>
          );
        }
        const img = images[it.idx];
        if (!img) return null;
        const src = typeof img === "string" ? img : img.src;
        const vw = Math.max(10, Math.ceil((it.w / COLS) * 100));
        return (
          <button
            key={`${it.idx}-${n}`}
            type="button"
            className="group absolute block cursor-pointer"
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
                className={`${it.fit === "contain" ? "object-contain" : "object-cover"} transition-transform duration-500 ease-out group-hover:scale-[1.03]`}
                style={it.pos ? { objectPosition: `${it.pos.x}% ${it.pos.y}%` } : undefined}
              />
            </span>
          </button>
        );
      })}
    </div>
    </div>
    </div>
  );
}
