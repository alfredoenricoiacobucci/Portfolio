// pages/index.js
import { useEffect, useMemo, useRef, useState } from "react";
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

  const artworkImages = hasCustomArt ? landingConfig.artworkImages.slice(0, 20) : readImages("art").slice(0, 20);
  const professionalImages = hasCustomPro ? landingConfig.professionalImages.slice(0, 20) : readImages("pro").slice(0, 20);

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

  // indices (advance once per entering an area)
  const artIndexRef = useRef(0);
  const profIndexRef = useRef(0);
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

  // Shuffle images once on mount so the sequence isn't always the same
  const shuffledArt = useMemo(() => {
    const arr = [...filteredArt];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [filteredArt]);

  const shuffledProf = useMemo(() => {
    const arr = [...filteredProf];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [filteredProf]);

  // Avanza l'immagine solo quando si INCROCIA dall'altro lato (mouse O auto-switch)
  const prevDisplayRef = useRef(null);

  useEffect(() => {
    const current = hoverArea ?? mobileArea;
    const prev = prevDisplayRef.current;
    prevDisplayRef.current = current;

    if (prev === null) return;

    if (current === "artwork" && prev === "professional" && shuffledArt.length > 0) {
      artIndexRef.current = (artIndexRef.current + 1) % shuffledArt.length;
      setArtIndex(artIndexRef.current);
    }
    if (current === "professional" && prev === "artwork" && shuffledProf.length > 0) {
      profIndexRef.current = (profIndexRef.current + 1) % shuffledProf.length;
      setProfIndex(profIndexRef.current);
    }
  }, [mobileArea, hoverArea, shuffledArt.length, shuffledProf.length]);

  const artSrc = shuffledArt.length ? shuffledArt[artIndex % shuffledArt.length] : null;
  const profSrc = shuffledProf.length ? shuffledProf[profIndex % shuffledProf.length] : null;

  // Preload prossima immagine in background (così è in cache quando serve)
  useEffect(() => {
    if (!shuffledArt.length) return;
    const nextIdx = (artIndex + 1) % shuffledArt.length;
    const img = new window.Image();
    img.src = shuffledArt[nextIdx];
  }, [artIndex, shuffledArt]);

  useEffect(() => {
    if (!shuffledProf.length) return;
    const nextIdx = (profIndex + 1) % shuffledProf.length;
    const img = new window.Image();
    img.src = shuffledProf[nextIdx];
  }, [profIndex, shuffledProf]);

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
