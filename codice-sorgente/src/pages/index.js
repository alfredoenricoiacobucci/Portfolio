// pages/index.js
import { useEffect, useRef, useState } from "react";
import path from "path";
import fs from "fs";
import { useRouter } from "next/router";

/**
 * Legge le immagini rappresentative (prima N) per Artwork / Professional.
 * L'elenco dei progetti viene da contenuti.json (non più hardcoded).
 * Pre-filtra le orizzontali server-side → zero caricamento client per decidere orientamento.
 */
export async function getServerSideProps({ res }) {
  // CDN cache: serve cached SSR for 60s, stale-while-revalidate for 5min
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");

  const { readImageDimensions } = require("../lib/imageDimensions");
  const projectsRoot = path.join(process.cwd(), "contenuti");

  // Leggi contenuti.json — fonte primaria dell'elenco e ordine progetti
  let contenuti = { projects: [] };
  try {
    contenuti = JSON.parse(fs.readFileSync(path.join(process.cwd(), "contenuti", "contenuti.json"), "utf-8"));
  } catch {}
  const projByKey = new Map();
  (contenuti.projects || []).forEach((p) => { projByKey.set(`${p.section}/${p.slug}`, p); });

  // Costruisci lista progetti da contenuti.json
  const artworkIds = (contenuti.projects || []).filter(p => p.section === "art").map(p => `art/${p.slug}`);
  const professionalIds = (contenuti.projects || []).filter(p => p.section === "pro").map(p => `pro/${p.slug}`);

  const readImages = (id) => {
    try {
      const pDir = path.join(projectsRoot, id);
      if (!fs.existsSync(pDir)) return [];
      let files = fs
        .readdirSync(pDir)
        .filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f));
      const data = projByKey.get(id);
      const ordine = data && data.ordine ? data.ordine : [];
      if (ordine.length > 0) {
        const orderMap = new Map(ordine.map((n, i) => [n, i]));
        files.sort((a, b) => {
          const ia = orderMap.has(a) ? orderMap.get(a) : Infinity;
          const ib = orderMap.has(b) ? orderMap.get(b) : Infinity;
          if (ia !== ib) return ia - ib;
          return a.localeCompare(b, undefined, { numeric: true });
        });
      } else {
        files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      }
      // Pre-filter: solo orizzontali (w >= h) usando dimensioni lette dai file header
      const results = [];
      for (const f of files) {
        const filePath = path.join(pDir, f);
        const dim = readImageDimensions(filePath);
        if (dim && dim.width >= dim.height) {
          results.push(`/projects/${id}/${f}`);
        }
      }
      // Fallback: se nessuna orizzontale, usa tutte
      return results.length > 0 ? results : files.map((f) => `/projects/${id}/${f}`);
    } catch {
      return [];
    }
  };

  const artworkImages = artworkIds.flatMap((id) => readImages(id)).slice(0, 24);
  const professionalImages = professionalIds.flatMap((id) => readImages(id)).slice(0, 24);

  // Leggi stringhe da contenuti/stringhe.txt
  const contenutiDir = path.join(process.cwd(), "contenuti");
  let stringheRaw = "";
  try { stringheRaw = fs.readFileSync(path.join(contenutiDir, "stringhe.txt"), "utf-8").trim(); } catch {}
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

  // ===== AUTO-SWITCH MOBILE: alterna Artwork/Professional ogni 1.5s =====
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
    }, 1500);
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

  // Avanza l'immagine solo quando si INCROCIA dall'altro lato (mouse O auto-switch)
  const prevDisplayRef = useRef(null);

  useEffect(() => {
    const current = hoverArea ?? mobileArea;
    const prev = prevDisplayRef.current;
    prevDisplayRef.current = current;

    if (prev === null) return;

    if (current === "artwork" && prev === "professional" && filteredArt.length > 0) {
      artIndexRef.current = (artIndexRef.current + 1) % filteredArt.length;
      setArtIndex(artIndexRef.current);
    }
    if (current === "professional" && prev === "artwork" && filteredProf.length > 0) {
      profIndexRef.current = (profIndexRef.current + 1) % filteredProf.length;
      setProfIndex(profIndexRef.current);
    }
  }, [mobileArea, hoverArea, filteredArt.length, filteredProf.length]);

  const artSrc = filteredArt.length ? filteredArt[artIndex % filteredArt.length] : null;
  const profSrc = filteredProf.length ? filteredProf[profIndex % filteredProf.length] : null;

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
        {/* artwork (white overlay stronger) */}
        <div className={`landing-bg landing-bg--artwork ${displayMode !== "professional" ? "visible" : ""}`}>
          {artSrc && <img key={artSrc} src={artSrc} alt="" className="landing-bg__img show" />}
          <div className="landing-bg__overlay landing-bg__overlay--light" />
        </div>

        {/* professional (black overlay stronger) */}
        <div className={`landing-bg landing-bg--professional ${displayMode === "professional" ? "visible" : ""}`}>
          {profSrc && <img key={profSrc} src={profSrc} alt="" className="landing-bg__img show" />}
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
