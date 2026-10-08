// components/ScrollGallery.js
// Galleria a scorrimento: una striscia di foto a tutta larghezza che scorre
// da sola, all'infinito. Altezza (in % dello schermo), velocità (px al
// secondo), spazio tra le foto (px) e sfondo si scelgono nel Manager.
// Al passaggio del mouse si ferma; un clic apre la foto a schermo intero.
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "@/lib/useReducedMotion";

export default function ScrollGallery({ images = [], idx = [], settings = {}, onImageClick, altFor }) {
  const { height = 50, speed = 40, gap = 16, background = "transparent" } = settings;
  const reduced = useReducedMotion();
  const [viewportH, setViewportH] = useState(0);
  const trackRef = useRef(null);

  useEffect(() => {
    const m = () => setViewportH(window.innerHeight);
    m();
    window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, []);

  const rowH = viewportH ? Math.round((viewportH * height) / 100) : 0;
  const items = useMemo(() => idx.map((i) => {
    const img = images[i];
    if (!img) return null;
    const ratio = typeof img === "string" ? 1.5 : (img.w || 3) / (img.h || 2);
    return { i, src: typeof img === "string" ? img : img.src, ratio };
  }).filter(Boolean), [images, idx]);

  // larghezza di un giro completo: serve per la durata dell'animazione
  const loopW = items.reduce((t, it) => t + it.ratio * rowH + gap, 0);
  const duration = loopW && speed ? loopW / speed : 0;

  if (!items.length) return null;

  const strip = (copy) => items.map((it) => (
    <button
      key={`${copy}-${it.i}`}
      type="button"
      className="group relative shrink-0 overflow-hidden cursor-pointer"
      style={{ width: Math.round(it.ratio * rowH) + "px", height: rowH + "px", marginRight: gap + "px" }}
      onClick={() => onImageClick?.(it.i)}
      aria-label={`Apri immagine ${it.i + 1} a schermo intero`}
      tabIndex={copy ? -1 : 0}
      aria-hidden={copy ? "true" : undefined}
    >
      <Image
        src={it.src}
        alt={copy ? "" : (altFor ? altFor(it.i) : "")}
        fill
        sizes={`${Math.round(it.ratio * rowH)}px`}
        quality={80}
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      />
    </button>
  ));

  return (
    <div
      className="scroll-gallery w-full overflow-hidden"
      style={{ background, paddingTop: gap + "px", paddingBottom: gap + "px", overflowX: reduced ? "auto" : "hidden" }}
    >
      {rowH > 0 && (
        <div
          ref={trackRef}
          className={`scroll-gallery__track flex w-max${reduced ? "" : " scroll-gallery__track--run"}`}
          style={{ animationDuration: duration + "s", paddingLeft: gap + "px" }}
        >
          {strip(0)}
          {!reduced && strip(1)}
        </div>
      )}
      <style jsx>{`
        .scroll-gallery__track--run {
          animation-name: scrollGalleryMove;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .scroll-gallery:hover .scroll-gallery__track--run {
          animation-play-state: paused;
        }
        @keyframes scrollGalleryMove {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
