// pages/index.js
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Seo from "@/components/Seo";
import { readJSON, readStrings } from "@/lib/contenuti";
import { fallbackToOriginal, preview } from "@/lib/images";
import { useReducedMotion } from "@/lib/useReducedMotion";

/**
 * Legge le immagini rappresentative per Artwork / Professional.
 * Tutto da contenuti.json — zero accesso al filesystem immagini.
 */
export async function getStaticProps() {
  // ISR: pagina pre-generata, servita dalla CDN, rigenerata ogni 60s in background.
  const contenuti = readJSON("contenuti.json", { projects: [] });

  // Costruisce la lista delle orizzontali usando le dimensioni pre-calcolate.
  const readImages = (section) => {
    const results = [];
    (contenuti.projects || [])
      .filter((p) => p.section === section)
      .forEach((p) => {
        const id = `${p.section}/${p.slug}`;
        const files = p.ordine || [];
        const dims = p.dimensioni || {};
        const horizontal = files
          .filter((f) => dims[f] && dims[f].w >= dims[f].h)
          .map((f) => `/projects/${id}/${f}`);
        // Fallback: se nessuna orizzontale, usa tutte
        results.push(...(horizontal.length ? horizontal : files.map((f) => `/projects/${id}/${f}`)));
      });
    return results;
  };

  // Se l'utente ha scelto foto specifiche nell'editor, usa quelle; altrimenti auto-detect
  const landing = contenuti.landing || {};
  const hasCustomArt = Array.isArray(landing.artworkImages) && landing.artworkImages.length > 0;
  const hasCustomPro = Array.isArray(landing.professionalImages) && landing.professionalImages.length > 0;

  return {
    props: {
      artworkImages: hasCustomArt ? landing.artworkImages : readImages("art"),
      professionalImages: hasCustomPro ? landing.professionalImages : readImages("pro"),
      strings: readStrings(),
    },
    revalidate: 60,
  };
}

/* Quante immagini tenere precaricate in anticipo. Era 10, su file che potevano
 * pesare 17 MB l'uno: la landing arrivava a scaricare centinaia di MB per
 * mostrare un nome e due parole. Ora gli sfondi usano le anteprime @md
 * (~59 KB), quindi bastano pochi elementi di margine. */
const BATCH = 4;

/** Fisher-Yates. */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Precarica le anteprime di una lista di sorgenti. */
function preloadPreviews(srcs) {
  for (const src of srcs) {
    if (!src) continue;
    const img = new window.Image();
    img.src = preview(src);
  }
}

export default function Landing({ artworkImages = [], professionalImages = [], strings = {} }) {
  const landingName = strings.NOME || "Alfredo Enrico Iacobucci";
  const reducedMotion = useReducedMotion();

  // ===== CURTAIN: overlay che scompare dopo il mount =====
  const [curtainVisible, setCurtainVisible] = useState(true);
  useEffect(() => {
    const t = requestAnimationFrame(() => setCurtainVisible(false));
    return () => cancelAnimationFrame(t);
  }, []);

  // Selezione persistente al click (parte da Artwork)
  const [mode, setMode] = useState("artwork");
  // Area in hover (desktop)
  const [hoverArea, setHoverArea] = useState(null);
  // Alternanza automatica (touch)
  const [mobileArea, setMobileArea] = useState(null);

  const containerRef = useRef(null);
  const isTouchRef = useRef(false);
  useEffect(() => {
    isTouchRef.current = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  // ===== AUTO-SWITCH su touch: alterna Artwork/Professional ogni 2.5s =====
  // Rispetta prefers-reduced-motion: con la riduzione attiva resta su Artwork.
  useEffect(() => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouch) return;
    if (reducedMotion) {
      setMobileArea("artwork");
      return;
    }
    const areas = ["artwork", "professional"];
    let i = 0;
    setMobileArea(areas[0]);
    const interval = setInterval(() => {
      i = (i + 1) % 2;
      setMobileArea(areas[i]);
    }, 2500);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  // Selezione mostrata: hover (desktop) / auto-switch (touch) / persistente
  const displayMode = hoverArea ?? mobileArea ?? mode;
  const isDark = displayMode === "professional";

  // ===== HOVER: metà sinistra = artwork, metà destra = professional =====
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if ("ontouchstart" in window || navigator.maxTouchPoints > 0) return;

    let lastArea = null;
    const onMove = (e) => {
      if (typeof e.clientX !== "number") return;
      const rect = el.getBoundingClientRect();
      const area = e.clientX < rect.left + rect.width / 2 ? "artwork" : "professional";
      if (area !== lastArea) {
        lastArea = area;
        setHoverArea(area);
      }
    };
    const onLeave = () => {
      lastArea = null;
      setHoverArea(null);
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  /* ===== CICLO IMMAGINI =====
   * Il primo sorgente è il primo elemento della lista, uguale sul server e sul
   * client: così lo sfondo è già nell'HTML servito dalla CDN e non "appare"
   * dopo l'idratazione. Da lì in poi l'ordine è mescolato.
   *
   * Prima i sorgenti venivano scritti nei ref DURANTE il render, che con
   * reactStrictMode e React 19 (doppio render) dava un esito impredicibile;
   * spostando tutto nello stato quel problema sparisce, e tenendo il primo
   * elemento deterministico si evita il mismatch di idratazione che
   * nascerebbe mescolando lato client.
   */
  const [artSrc, setArtSrc] = useState(artworkImages[0] ?? null);
  const [profSrc, setProfSrc] = useState(professionalImages[0] ?? null);
  const artCycle = useRef(null);
  const profCycle = useRef(null);

  useEffect(() => {
    // Coda mescolata a partire dal secondo elemento: il primo resta quello
    // già mostrato, per non sostituire un'immagine appena dipinta.
    const init = (images) => {
      if (!images.length) return null;
      const queue = [images[0], ...shuffle(images.slice(1))];
      preloadPreviews(queue.slice(1, 1 + BATCH));
      return { queue, pointer: 1 };
    };
    artCycle.current = init(artworkImages);
    profCycle.current = init(professionalImages);
  }, [artworkImages, professionalImages]);

  /** Avanza una coda, rimescolando e riprecaricando quando si esaurisce. */
  const advance = useCallback((cycle) => {
    if (!cycle?.queue?.length) return null;
    if (cycle.pointer >= cycle.queue.length) {
      cycle.queue = shuffle(cycle.queue);
      cycle.pointer = 0;
    }
    const src = cycle.queue[cycle.pointer];
    cycle.pointer += 1;
    // Mantiene BATCH elementi di margine davanti al puntatore.
    preloadPreviews(cycle.queue.slice(cycle.pointer, cycle.pointer + BATCH));
    return src;
  }, []);

  // Avanza solo quando si passa da un lato all'altro, non a ogni hover.
  const prevDisplayRef = useRef("artwork");
  useEffect(() => {
    const current = hoverArea ?? mobileArea;
    const prev = prevDisplayRef.current;
    if (!current || current === prev) return;
    prevDisplayRef.current = current;

    if (current === "artwork" && prev === "professional") {
      const next = advance(artCycle.current);
      if (next) setArtSrc(next);
    } else if (current === "professional" && prev === "artwork") {
      const next = advance(profCycle.current);
      if (next) setProfSrc(next);
    }
  }, [mobileArea, hoverArea, advance]);

  const onSwitchPointerMove = (e) => {
    if (isTouchRef.current) return;
    const el = containerRef.current;
    if (!el || typeof e.clientX !== "number") return;
    const rect = el.getBoundingClientRect();
    setHoverArea(e.clientX < rect.left + rect.width / 2 ? "artwork" : "professional");
  };

  const labelCls = (active) =>
    `cursor-pointer transition-all duration-[400ms] ease-in-out font-semibold text-[20px] hover-red ${
      active ? "opacity-100" : "opacity-40"
    } ${isDark ? "text-white" : "text-black"}`;

  return (
    <>
      <Seo
        description={`Portfolio di ${landingName}: fotografia d'autore, arte multimediale e progetti professionali. Due percorsi, Artwork e Professional.`}
        path="/"
      />
      <main
        ref={containerRef}
        className={`min-h-screen relative overflow-hidden bg-base ${isDark ? "landing--dark" : ""} flex items-center justify-center`}
      >
        {/* SFONDI — reagiscono a hover (desktop) e all'alternanza (touch).
            Usano l'anteprima @md: prima servivano l'originale a piena
            risoluzione sotto un overlay opaco al 60-82%. */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className={`landing-bg landing-bg--artwork ${displayMode !== "professional" ? "visible" : ""}`}>
            {artSrc && <img src={preview(artSrc)} onError={fallbackToOriginal(artSrc)} alt="" className="landing-bg__img" decoding="async" />}
            <div className="landing-bg__overlay landing-bg__overlay--light" />
          </div>

          <div className={`landing-bg landing-bg--professional ${displayMode === "professional" ? "visible" : ""}`}>
            {profSrc && <img src={preview(profSrc)} onError={fallbackToOriginal(profSrc)} alt="" className="landing-bg__img" decoding="async" />}
            <div className="landing-bg__overlay landing-bg__overlay--dark" />
          </div>
        </div>

        {/* CONTENUTO */}
        <div className="relative z-10 text-center p-6 space-y-4">
          <h1
            className={`font-display text-2xl md:text-[2rem] tracking-tight font-semibold transition-colors duration-[400ms] ease-in-out ${
              isDark ? "text-white" : "text-black"
            }`}
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.18)" }}
          >
            {landingName}
          </h1>

          {/* SWITCH — <Link> al posto di <span onClick>: raggiungibili col Tab,
              apribili in nuova tab, e Next ne fa il prefetch. */}
          <nav
            className="flex items-center justify-center text-[20px] md:text-[28px] select-none gap-4"
            onMouseMove={onSwitchPointerMove}
            onMouseLeave={() => setHoverArea(null)}
            aria-label="Sezioni del portfolio"
          >
            <Link
              href="/artwork"
              onMouseEnter={() => !isTouchRef.current && setHoverArea("artwork")}
              onMouseLeave={() => !isTouchRef.current && setHoverArea(null)}
              onFocus={() => setHoverArea("artwork")}
              onBlur={() => setHoverArea(null)}
              onClick={() => setMode("artwork")}
              className={labelCls(displayMode === "artwork")}
            >
              Artwork
            </Link>

            <span
              aria-hidden
              className={`font-semibold text-[20px] transition-colors duration-[400ms] ease-in-out ${
                isDark ? "text-white" : "text-black"
              }`}
            >
              /
            </span>

            <Link
              href="/professional"
              onMouseEnter={() => !isTouchRef.current && setHoverArea("professional")}
              onMouseLeave={() => !isTouchRef.current && setHoverArea(null)}
              onFocus={() => setHoverArea("professional")}
              onBlur={() => setHoverArea(null)}
              onClick={() => setMode("professional")}
              className={labelCls(displayMode === "professional")}
            >
              Professional
            </Link>
          </nav>
        </div>

        {/* COPYRIGHT */}
        <div
          className={`absolute bottom-4 left-0 right-0 text-center transition-colors duration-[400ms] ${
            isDark ? "text-white/40" : "text-black/35"
          }`}
          style={{ zIndex: 10, fontSize: "var(--text-xs)" }}
        >
          © {new Date().getFullYear()} Tutti i diritti riservati.
        </div>

        {/* CURTAIN: parte bianca (artwork di default), sfuma rivelando lo sfondo */}
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundColor: "#f8f4ed",
            opacity: curtainVisible ? 1 : 0,
            transition: "opacity 800ms cubic-bezier(.25,.1,.25,1)",
            pointerEvents: "none",
          }}
        />
      </main>
    </>
  );
}
