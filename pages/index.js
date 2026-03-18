// pages/index.js
import { useEffect, useRef, useState } from "react";
import { BY_MODE } from "@/data/projects";
import path from "path";
import fs from "fs";
import { useRouter } from "next/router";

/**
 * Legge le immagini rappresentative (prima N) per Artwork / Professional
 */
export async function getServerSideProps() {
  const projectsRoot = path.join(process.cwd(), "public", "projects");
  const artworkIds = BY_MODE.artwork || [];
  const professionalIds = BY_MODE.professional || [];

  const readImages = (id) => {
    try {
      const pdir = path.join(projectsRoot, id);
      if (!fs.existsSync(pdir)) return [];
      return fs
        .readdirSync(pdir)
        .filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((f) => `/projects/${id}/${f}`);
    } catch {
      return [];
    }
  };

  const artworkImages = artworkIds.flatMap((id) => readImages(id)).slice(0, 24);
  const professionalImages = professionalIds.flatMap((id) => readImages(id)).slice(0, 24);

  // Leggi stringhe da content/stringhe.txt
  const contentDir = path.join(process.cwd(), "content");
  let stringheRaw = "";
  try { stringheRaw = fs.readFileSync(path.join(contentDir, "stringhe.txt"), "utf-8").trim(); } catch {}
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

// Filtra solo immagini orizzontali (w >= h)
function useHorizontalImages(allImages) {
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    if (!allImages?.length) { setFiltered([]); return; }
    let cancelled = false;

    Promise.all(
      allImages.map(
        (src) =>
          new Promise((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve({ src, ok: img.naturalWidth >= img.naturalHeight });
            img.onerror = () => resolve({ src, ok: false });
            img.src = src;
          })
      )
    ).then((results) => {
      if (cancelled) return;
      const horiz = results.filter((r) => r.ok).map((r) => r.src);
      setFiltered(horiz.length ? horiz : allImages);
    });

    return () => { cancelled = true; };
  }, [allImages]);

  return filtered;
}

export default function Landing({ artworkImages = [], professionalImages = [], strings = {} }) {
  const landingName = strings.NOME || "Alfredo Enrico Iacobucci";
  const router = useRouter();

  // Filtra verticali da entrambe le liste
  const filteredArt = useHorizontalImages(artworkImages);
  const filteredProf = useHorizontalImages(professionalImages);

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

  // indices (advance once per entering an area)
  const artIndexRef = useRef(0);
  const profIndexRef = useRef(0);
  const [artIndex, setArtIndex] = useState(0);
  const [profIndex, setProfIndex] = useState(0);

  const containerRef = useRef(null);

  // compute displayed selection: hover overrides persistent mode
  const displayMode = hoverArea ?? mode;
  const isDark = displayMode === "professional";

  // pointer handler on container: sets hoverArea to left/right and advances index only when crossing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let lastArea = null;

    const computeArea = (x) => {
      const rect = el.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      // choose side strictly left or right; no neutral zone
      return x < mid ? "artwork" : "professional";
    };

    const onMove = (e) => {
      const x = e.clientX ?? (e.touches && e.touches[0] && e.touches[0].clientX);
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
    el.addEventListener("touchstart", onMove, { passive: true });
    el.addEventListener("touchend", onLeave);

    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("touchstart", onMove);
      el.removeEventListener("touchend", onLeave);
    };
  }, []);

  // Avanza l'immagine solo quando si INCROCIA dall'altro lato, non al primo ingresso
  const prevHoverRef = useRef(null);

  useEffect(() => {
    const prev = prevHoverRef.current;
    prevHoverRef.current = hoverArea;

    // Non avanzare se arriviamo da null (primo ingresso nella pagina)
    if (prev === null) return;

    // Avanza solo se il lato è cambiato (es. pro → art o art → pro)
    if (hoverArea === "artwork" && prev === "professional" && filteredArt.length > 0) {
      artIndexRef.current = (artIndexRef.current + 1) % filteredArt.length;
      setArtIndex(artIndexRef.current);
    }
    if (hoverArea === "professional" && prev === "artwork" && filteredProf.length > 0) {
      profIndexRef.current = (profIndexRef.current + 1) % filteredProf.length;
      setProfIndex(profIndexRef.current);
    }
  }, [hoverArea, filteredArt.length, filteredProf.length]);

  const artSrc = filteredArt.length ? filteredArt[artIndex % filteredArt.length] : null;
  const profSrc = filteredProf.length ? filteredProf[profIndex % filteredProf.length] : null;

  // on click: persist selection and navigate to page
  const onClickMode = (m) => {
    setMode(m);
    const target = m === "professional" ? "/professional" : "/artwork";
    router.push(target);
  };

  // helper for switch hover area when hovering the switch itself (no dead zone)
  const onSwitchPointerMove = (e) => {
    // compute area relative to container center
    const el = containerRef.current;
    if (!el) return;
    const x = e.clientX ?? (e.touches && e.touches[0] && e.touches[0].clientX);
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
      {/* BACKGROUND LAYERS */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        {/* artwork (white overlay stronger) — visibile di default quando nessun hover */}
        <div className={`landing-bg landing-bg--artwork ${hoverArea !== "professional" ? "visible" : ""}`}>
          {artSrc && <img key={artSrc} src={artSrc} alt="" className="landing-bg__img show" />}
          <div className="landing-bg__overlay landing-bg__overlay--light" />
        </div>

        {/* professional (black overlay stronger) */}
        <div className={`landing-bg landing-bg--professional ${hoverArea === "professional" ? "visible" : ""}`}>
          {profSrc && <img key={profSrc} src={profSrc} alt="" className="landing-bg__img show" />}
          <div className="landing-bg__overlay landing-bg__overlay--dark" />
        </div>
      </div>

      {/* CONTENT */}
      <div className="relative z-10 text-center p-6 space-y-4">
        {/* Name smaller */}
        <h1 className="text-2xl md:text-[2rem] tracking-tight font-semibold" style={{ color: "#c8102e", textShadow: "0 2px 12px rgba(0,0,0,0.18)" }}>
          {landingName}
        </h1>

        {/* SWITCH larger but text slightly smaller and closer to name */}
        <div
          className="flex items-center justify-center text-[20px] md:text-[28px] select-none gap-4"
          onMouseMove={onSwitchPointerMove}
          onMouseLeave={() => setHoverArea(null)}
        >
          <span
            onMouseEnter={() => setHoverArea("artwork")}
            onMouseLeave={() => setHoverArea(null)}
            onClick={() => onClickMode("artwork")}
            className={`cursor-pointer transition-opacity font-semibold text-[20px] ${displayMode === "artwork" ? "opacity-100" : "opacity-40"} ${isDark ? "text-white" : "text-black"}`}
          >
            Artwork
          </span>

          <span className={`font-semibold text-[20px] ${isDark ? "text-white" : "text-black"}`}>/</span>

          <span
            onMouseEnter={() => setHoverArea("professional")}
            onMouseLeave={() => setHoverArea(null)}
            onClick={() => onClickMode("professional")}
            className={`cursor-pointer transition-opacity font-semibold text-[20px] ${displayMode === "professional" ? "opacity-100" : "opacity-40"} ${isDark ? "text-white" : "text-black"}`}
          >
            Professional
          </span>
        </div>
      </div>

      {/* CURTAIN: parte bianca (artwork default), sfuma via rivelando lo sfondo */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          backgroundColor: "#fafafa",
          opacity: curtainVisible ? 1 : 0,
          transition: "opacity 800ms cubic-bezier(.25,.1,.25,1)",
          pointerEvents: "none",
        }}
      />
    </main>
  );
}
