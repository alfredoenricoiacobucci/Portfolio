// pages/index.js
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

/**
 * Legge le immagini rappresentative (prima N) per Artwork / Professional.
 * Tutto da contenuti.json — zero accesso al filesystem immagini.
 */
export async function getStaticProps() {
  // ISR: pagina pre-generata, servita dalla CDN, rigenerata ogni 60s in background.

  // Leggiamo SOLO contenuti.json e stringhe.txt.
  const fs = await import("fs");
  const path = await import("path");
  const fsMod = await fs;
  const pathMod = await path;

  const contenutiDir = pathMod.join(process.cwd(), "contenuti");

  // Leggi contenuti.json — UNICA fonte dati
  let contenuti = { projects: [] };
  try {
    contenuti = JSON.parse(fsMod.readFileSync(pathMod.join(contenutiDir, "contenuti.json"), "utf-8"));
  } catch {}

  // Costruisci lista immagini orizzontali da contenuti.json (usando dimensioni pre-calcolate)
  const readImages = (section) => {
    const results = [];
    (contenuti.projects || []).filter(p => p.section === section).forEach(p => {
      const id = `${p.section}/${p.slug}`;
      const files = p.ordine || [];
      const dims = p.dimensioni || {};
      const horizontal = [];
      for (const f of files) {
        const d = dims[f];
        if (d && d.w >= d.h) {
          horizontal.push(`/projects/${id}/${f}`);
        }
      }
      // Fallback: se nessuna orizzontale, usa tutte
      if (horizontal.length > 0) {
        results.push(...horizontal);
      } else {
        results.push(...files.map(f => `/projects/${id}/${f}`));
      }
    });
    return results;
  };

  // Se l'utente ha scelto foto specifiche nell'editor, usa quelle; altrimenti auto-detect
  const landingConfig = contenuti.landing || {};
  const hasCustomArt = Array.isArray(landingConfig.artworkImages) && landingConfig.artworkImages.length > 0;
  const hasCustomPro = Array.isArray(landingConfig.professionalImages) && landingConfig.professionalImages.length > 0;

  // Passa TUTTE le immagini selezionate — il client gestisce i batch
  const artworkImages = hasCustomArt ? landingConfig.artworkImages : readImages("art");
  const professionalImages = hasCustomPro ? landingConfig.professionalImages : readImages("pro");

  // Leggi stringhe da contenuti/stringhe.txt
  let stringheRaw = "";
  try { stringheRaw = fsMod.readFileSync(pathMod.join(contenutiDir, "stringhe.txt"), "utf-8").trim(); } catch {}
  const strings = {};
  stringheRaw.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key) strings[key] = val;
  });

  return {
    props: { artworkImages, professionalImages, strings },
    revalidate: 60,
  };
}


export default function Landing({ artworkImages = [], professionalImages = [], strings = {} }) {
  const landingName = strings.NOME || "Alfredo Enrico Iacobucci";
  const router = useRouter();

  // Immagini già pre-filtrate server-side (solo orizzontali)
  const filteredArt = artworkImages;
  const filteredProf = professionalImages;

  // ===== CURTAIN: overlay che scompare dopo il mount =====
  const [curtainVisible, setCurtainVisible] = useState(true);

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      setCurtainVisible(false);
    });
    return () => cancelAnimationFrame(t);
  }, []);

  // persistent selection if user clicks (start Artwork by default)
  const [mode, setMode] = useState("artwork");
  // area hover based on cursor position (left/right)
  const [hoverArea, setHoverArea] = useState(null);

  // ===== AUTO-SWITCH MOBILE: alterna Artwork/Professional ogni 2.5s =====
  const [mobileArea, setMobileArea] = useState(null);

  useEffect(() => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouch) return;

    const areas = ["artwork", "professional"];
    let i = 0;
    setMobileArea(areas[0]);
    const interval = setInterval(() => {
      i = (i + 1) % 2;
      setMobileArea(areas[i]);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // State counters — bumped to trigger re-renders when cycling advances
  const [artIndex, setArtIndex] = useState(0);
  const [profIndex, setProfIndex] = useState(0);

  const containerRef = useRef(null);

  // compute displayed selection: hover (desktop) / auto-switch (mobile) / persistent
  const displayMode = hoverArea ?? mobileArea ?? mode;
  const isDark = displayMode === "professional";

  // pointer handler on container: sets hoverArea to left/right and advances index only when crossing
  // Touch devices: no hover detection (tap on Artwork/Professional navigates directly)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Skip hover detection on touch devices
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    let lastArea = null;

    const computeArea = (x) => {
      const rect = el.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      return x < mid ? "artwork" : "professional";
    };

    const onMove = (e) => {
      const x = e.clientX;
      if (typeof x !== "number") return;
      const area = computeArea(x);
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

  // ===== SMART IMAGE CYCLING =====
  // Shuffle helper (Fisher-Yates)
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Refs that hold the full cycling state (no re-renders on internal changes)
  const artCycleRef = useRef(null);
  const profCycleRef = useRef(null);

  // Initialize cycle state: shuffled queue, pointer into it, current batch preloaded
  const initCycle = (allImages) => {
    const queue = shuffle(allImages);
    const BATCH = 10;
    // Preload first batch
    queue.slice(0, BATCH).forEach(src => {
      const img = new window.Image();
      img.src = src;
    });
    return { queue, pointer: 0, total: queue.length, batchSize: BATCH };
  };

  // Advance one step in the cycle, return the new src
  const advanceCycle = (cycle) => {
    if (!cycle || cycle.total === 0) return null;
    const { queue, total, batchSize } = cycle;
    let ptr = cycle.pointer;

    // If we've exhausted all images, reshuffle and restart
    if (ptr >= total) {
      cycle.queue = shuffle(queue);
      cycle.pointer = 0;
      ptr = 0;
      // Preload first batch of the new cycle
      cycle.queue.slice(0, batchSize).forEach(src => {
        const img = new window.Image();
        img.src = src;
      });
    }

    const src = cycle.queue[ptr];
    cycle.pointer = ptr + 1;

    // Calculate how many remain in the current logical batch
    const batchStart = Math.floor(ptr / batchSize) * batchSize;
    const batchEnd = batchStart + batchSize;
    const remainingInBatch = batchEnd - (ptr + 1);

    // When 5 or fewer remain in this batch, preload the next batch
    if (remainingInBatch <= 5) {
      const nextBatchStart = batchEnd;
      const nextBatchEnd = Math.min(nextBatchStart + batchSize, total);
      for (let i = nextBatchStart; i < nextBatchEnd; i++) {
        const img = new window.Image();
        img.src = cycle.queue[i];
      }
    }

    return src;
  };

  // Init cycles on mount
  useEffect(() => {
    if (filteredArt.length > 0 && !artCycleRef.current) {
      artCycleRef.current = initCycle(filteredArt);
      // Set initial image
      setArtIndex(prev => prev + 1); // trigger re-render to pick first src
    }
    if (filteredProf.length > 0 && !profCycleRef.current) {
      profCycleRef.current = initCycle(filteredProf);
      setProfIndex(prev => prev + 1);
    }
  }, [filteredArt, filteredProf]);

  // Current displayed sources — derived from cycle refs
  const artSrcRef = useRef(null);
  const profSrcRef = useRef(null);

  // Set initial src from first item in queue (safe during render — no window.Image here)
  if (artCycleRef.current && !artSrcRef.current) {
    artSrcRef.current = artCycleRef.current.queue[0];
    artCycleRef.current.pointer = 1;
  }
  if (profCycleRef.current && !profSrcRef.current) {
    profSrcRef.current = profCycleRef.current.queue[0];
    profCycleRef.current.pointer = 1;
  }

  // Avanza l'immagine solo quando si INCROCIA dall'altro lato (mouse O auto-switch)
  const prevDisplayRef = useRef(null);

  useEffect(() => {
    const current = hoverArea ?? mobileArea;
    const prev = prevDisplayRef.current;
    prevDisplayRef.current = current;

    if (prev === null) return;

    if (current === "artwork" && prev === "professional" && artCycleRef.current) {
      const newSrc = advanceCycle(artCycleRef.current);
      if (newSrc) {
        artSrcRef.current = newSrc;
        setArtIndex(i => i + 1); // trigger re-render
      }
    }
    if (current === "professional" && prev === "artwork" && profCycleRef.current) {
      const newSrc = advanceCycle(profCycleRef.current);
      if (newSrc) {
        profSrcRef.current = newSrc;
        setProfIndex(i => i + 1);
      }
    }
  }, [mobileArea, hoverArea]);

  const artSrc = artSrcRef.current;
  const profSrc = profSrcRef.current;

  // on click: persist selection and navigate to page
  const onClickMode = (m) => {
    setMode(m);
    const target = m === "professional" ? "/professional" : "/artwork";
    router.push(target);
  };

  // helper for switch hover area when hovering the switch itself (no dead zone)
  // Only on non-touch (desktop) — mobile uses tap directly
  const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  const onSwitchPointerMove = (e) => {
    if (isTouch) return;
    const el = containerRef.current;
    if (!el) return;
    const x = e.clientX;
    if (typeof x !== "number") return;
    const rect = el.getBoundingClientRect();
    const mid = rect.left + rect.width / 2;
    const area = x < mid ? "artwork" : "professional";
    setHoverArea(area);
  };

  return (
    <main
      ref={containerRef}
      className={`min-h-screen relative overflow-hidden bg-base ${isDark ? "landing--dark" : ""} flex items-center justify-center`}
    >
      {/* BACKGROUND LAYERS — reagiscono a hover (desktop) e swipe (mobile) */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        {/* artwork */}
        <div className={`landing-bg landing-bg--artwork ${displayMode !== "professional" ? "visible" : ""}`}>
          {artSrc && <img src={artSrc} alt="" className="landing-bg__img" style={{objectFit:"cover", opacity: 1}} />}
          <div className="landing-bg__overlay landing-bg__overlay--light" />
        </div>

        {/* professional */}
        <div className={`landing-bg landing-bg--professional ${displayMode === "professional" ? "visible" : ""}`}>
          {profSrc && <img src={profSrc} alt="" className="landing-bg__img" style={{objectFit:"cover", opacity: 1}} />}
          <div className="landing-bg__overlay landing-bg__overlay--dark" />
        </div>
      </div>

      {/* CONTENT */}
      <div className="relative z-10 text-center p-6 space-y-4">
        {/* Name — colore reattivo a displayMode (hover, gyro, default) */}
        <h1 className={`text-2xl md:text-[2rem] tracking-tight font-semibold transition-colors duration-700 ease-in-out ${isDark ? "text-white" : "text-black"}`} style={{ textShadow: "0 2px 12px rgba(0,0,0,0.18)" }}>
          {landingName}
        </h1>

        {/* SWITCH — reattivo a hover (desktop) e gyro (mobile) */}
        <div
          className="flex items-center justify-center text-[20px] md:text-[28px] select-none gap-4"
          onMouseMove={onSwitchPointerMove}
          onMouseLeave={() => setHoverArea(null)}
        >
          <span
            onMouseEnter={() => !isTouch && setHoverArea("artwork")}
            onMouseLeave={() => !isTouch && setHoverArea(null)}
            onClick={() => onClickMode("artwork")}
            className={`cursor-pointer transition-all duration-700 ease-in-out font-semibold text-[20px] hover-red ${(displayMode === "artwork" ? "opacity-100" : "opacity-40") + " " + (isDark ? "text-white" : "text-black")}`}
          >
            Artwork
          </span>

          <span className={`font-semibold text-[20px] transition-colors duration-700 ease-in-out ${isDark ? "text-white" : "text-black"}`}>/</span>

          <span
            onMouseEnter={() => !isTouch && setHoverArea("professional")}
            onMouseLeave={() => !isTouch && setHoverArea(null)}
            onClick={() => onClickMode("professional")}
            className={`cursor-pointer transition-all duration-700 ease-in-out font-semibold text-[20px] hover-red ${(displayMode === "professional" ? "opacity-100" : "opacity-40") + " " + (isDark ? "text-white" : "text-black")}`}
          >
            Professional
          </span>
        </div>

      </div>

      {/* COPYRIGHT — fondo pagina, centrato, stesso grigio della colonna tecnica */}
      <div
        className={`absolute bottom-4 left-0 right-0 text-center text-xs transition-colors duration-700 ${isDark ? "text-white/40" : "text-black/35"}`}
        style={{ zIndex: 10 }}
      >
        © {new Date().getFullYear()} Tutti i diritti riservati.
      </div>

      {/* CURTAIN: parte bianca (artwork default), sfuma via rivelando lo sfondo */}
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
  );
}
