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

  return {
    props: { artworkImages, professionalImages },
  };
}

export default function Landing({ artworkImages = [], professionalImages = [] }) {
  const router = useRouter();

  // persistent selection if user clicks (start Artwork by default)
  const [mode, setMode] = useState("artwork"); // default artwork selected
  // area hover based on cursor position (left/right)
  const [hoverArea, setHoverArea] = useState(null); // null | "artwork" | "professional"

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

  // when hoverArea changes, advance the index for that area exactly once
  useEffect(() => {
    if (hoverArea === "artwork" && artworkImages.length > 0) {
      artIndexRef.current = (artIndexRef.current + 1) % artworkImages.length;
      setArtIndex(artIndexRef.current);
    }
    if (hoverArea === "professional" && professionalImages.length > 0) {
      profIndexRef.current = (profIndexRef.current + 1) % professionalImages.length;
      setProfIndex(profIndexRef.current);
    }
  }, [hoverArea, artworkImages.length, professionalImages.length]);

  const artSrc = artworkImages.length ? artworkImages[artIndex % artworkImages.length] : null;
  const profSrc = professionalImages.length ? professionalImages[profIndex % professionalImages.length] : null;

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
        {/* artwork (white overlay stronger) */}
        <div className={`landing-bg landing-bg--artwork ${hoverArea === "artwork" ? "visible" : ""}`}>
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
        <h1 className={`text-xl md:text-3xl tracking-tight font-semibold ${isDark ? "text-white" : "text-black"}`}>
          Alfredo Enrico Iacobucci
        </h1>

        {/* SWITCH larger but text slightly smaller and closer to name */}
        <div
          className="flex items-center justify-center text-[20px] md:text-[28px] select-none gap-2"
          onMouseMove={onSwitchPointerMove}
          onMouseLeave={() => setHoverArea(null)}
        >
          <span
            onMouseEnter={() => setHoverArea("artwork")}
            onMouseLeave={() => setHoverArea(null)}
            onClick={() => onClickMode("artwork")}
            className={`cursor-pointer transition-opacity ${displayMode === "artwork" ? "opacity-100 font-semibold text-[20px]" : "opacity-50 text-[18px]"} ${isDark ? "text-white" : "text-black"}`}
          >
            Artwork
          </span>

          <span className={`${isDark ? "text-white" : "text-black"}`}>/</span>

          <span
            onMouseEnter={() => setHoverArea("professional")}
            onMouseLeave={() => setHoverArea(null)}
            onClick={() => onClickMode("professional")}
            className={`cursor-pointer transition-opacity ${displayMode === "professional" ? "opacity-100 font-semibold text-[20px]" : "opacity-50 text-[18px]"} ${isDark ? "text-white" : "text-black"}`}
          >
            Professional
          </span>
        </div>
      </div>
    </main>
  );
}
