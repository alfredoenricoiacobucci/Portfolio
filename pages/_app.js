// pages/_app.js
import "@/styles/globals.css";
import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/router";

/*
 * Transizione Art ↔ Pro — taglio netto:
 *   1. Contenuto corrente sparisce istantaneamente (opacity 0)
 *   2. Tema inverte i colori in un colpo (bg bianco→nero o nero→bianco)
 *   3. Nuovo contenuto emerge con leggero fade-in
 */

const FADE_IN = 350;

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const prevPathRef = useRef(router.pathname);
  const wrapRef = useRef(null);
  const pendingRef = useRef(null);
  const transitioning = useRef(false);

  // ---- Protezione immagini ----
  useEffect(() => {
    const handleContextMenu = (e) => {
      if (e.target && e.target.tagName === "IMG") {
        const isInViewer = e.target.closest('[data-viewer="fullscreen"]');
        if (!isInViewer) e.preventDefault();
      }
    };
    const handleDragStart = (e) => {
      if (e.target && e.target.tagName === "IMG") e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
    };
  }, []);

  // ---- Tema globale (solo CSS variables) ----
  const applyTheme = useCallback((pathname) => {
    const isPro = (pathname || window.location.pathname).startsWith("/professional");
    document.documentElement.classList.toggle("mode-professional", isPro);
  }, []);

  // Applica tema all'avvio e su navigazione senza transizione
  useEffect(() => {
    if (!transitioning.current) {
      applyTheme();
    }
  }, [router.pathname, applyTheme]);

  // ---- Transizione tra pagine ----
  useEffect(() => {
    const w = () => wrapRef.current;

    const onStart = (url) => {
      const newPath = url.split("?")[0];
      if (newPath === prevPathRef.current) return;

      transitioning.current = true;
      clearTimeout(pendingRef.current);

      // Taglio netto: contenuto sparisce istantaneamente
      const el = w();
      if (el) {
        el.style.transition = "none";
        el.style.opacity = "0";
      }

      // Inversione colore immediata
      document.body.style.transition = "none";
      applyTheme(newPath);
    };

    const onComplete = (url) => {
      const newPath = url.split("?")[0];
      prevPathRef.current = newPath;
      applyTheme(newPath);

      // Piccola pausa poi fade-in del nuovo contenuto
      clearTimeout(pendingRef.current);
      pendingRef.current = setTimeout(() => {
        requestAnimationFrame(() => {
          const el = w();
          if (el) {
            el.style.transition = `opacity ${FADE_IN}ms ease-out`;
            el.style.opacity = "1";
          }
          pendingRef.current = setTimeout(() => {
            document.body.style.transition = "";
            transitioning.current = false;
          }, FADE_IN + 16);
        });
      }, 40);
    };

    const onError = () => {
      clearTimeout(pendingRef.current);
      transitioning.current = false;
      document.body.style.transition = "";
      const el = w();
      if (el) {
        el.style.transition = `opacity ${FADE_IN}ms ease-out`;
        el.style.opacity = "1";
      }
    };

    router.events.on("routeChangeStart", onStart);
    router.events.on("routeChangeComplete", onComplete);
    router.events.on("routeChangeError", onError);
    return () => {
      router.events.off("routeChangeStart", onStart);
      router.events.off("routeChangeComplete", onComplete);
      router.events.off("routeChangeError", onError);
    };
  }, [router.events, applyTheme]);

  // ---- Mobile orientation gate ----
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [mobileEntered, setMobileEntered] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Detect touch device with small screen (either dimension < 1024)
      const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 1024;
      setIsMobile(touch && smallScreen);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    window.addEventListener("orientationchange", () => setTimeout(checkMobile, 100));
    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("orientationchange", checkMobile);
    };
  }, []);

  // Reset entered state when going back to portrait
  useEffect(() => {
    if (isPortrait) setMobileEntered(false);
  }, [isPortrait]);

  // Mobile portrait: show rotate message
  if (isMobile && isPortrait) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        backgroundColor: "#0a0a0a", color: "#ffffff", padding: "2rem", textAlign: "center",
      }}>
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#c8102e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "2rem" }}>
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M12 18h.01" />
        </svg>
        <p style={{ fontSize: "1.1rem", fontWeight: 700, lineHeight: 1.5, maxWidth: "280px" }}>
          Ruota il telefono in orizzontale per visualizzare il portfolio.
        </p>
        <div style={{ marginTop: "2rem", width: "40px", height: "40px", animation: "rotateHint 2s ease-in-out infinite" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </div>
        <style>{`
          @keyframes rotateHint {
            0%, 100% { transform: rotate(0deg); opacity: 0.5; }
            50% { transform: rotate(-90deg); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Mobile landscape: show "Entra" gate before accessing site
  if (isMobile && !isPortrait && !mobileEntered) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        backgroundColor: "#0a0a0a", color: "#ffffff",
      }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
          Alfredo Enrico Iacobucci
        </h1>
        <button
          onClick={() => setMobileEntered(true)}
          style={{
            marginTop: "1.5rem", padding: "0.7rem 2.5rem",
            fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
            color: "#ffffff", backgroundColor: "transparent",
            border: "2px solid #ffffff", cursor: "pointer",
            transition: "all 300ms ease",
          }}
          onMouseEnter={(e) => { e.target.style.backgroundColor = "#c8102e"; e.target.style.borderColor = "#c8102e"; }}
          onMouseLeave={(e) => { e.target.style.backgroundColor = "transparent"; e.target.style.borderColor = "#ffffff"; }}
        >
          Entra
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ opacity: 1 }}>
      <Component {...pageProps} />
    </div>
  );
}
