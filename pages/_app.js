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
    // Block print (Cmd+P / Ctrl+P)
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("keydown", handleKeyDown);
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

  // Mobile portrait: overlay warning (site stays mounted underneath so state is preserved)
  // Mobile landscape before entering: show Entra gate
  // After entering: site is visible, and rotating back to portrait shows overlay without losing state

  // Block scroll on body when portrait overlay or landscape gate is showing
  useEffect(() => {
    if (isMobile && (isPortrait || !mobileEntered)) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.height = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
    };
  }, [isMobile, isPortrait, mobileEntered]);

  // Countdown for landscape gate (3 → 2 → 1 → enter, total ~2.5s)
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (isMobile && !isPortrait && !mobileEntered) {
      setCountdown(3);
      const t1 = setTimeout(() => setCountdown(2), 800);
      const t2 = setTimeout(() => setCountdown(1), 1600);
      const t3 = setTimeout(() => setMobileEntered(true), 2500);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [isMobile, isPortrait, mobileEntered]);

  // Portrait overlay: if user has already entered site, use blur backdrop; otherwise solid black
  const mobilePortraitOverlay = isMobile && isPortrait ? (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      backgroundColor: mobileEntered ? "rgba(0,0,0,0.7)" : "#0a0a0a",
      backdropFilter: mobileEntered ? "blur(20px)" : "none",
      WebkitBackdropFilter: mobileEntered ? "blur(20px)" : "none",
      color: "#ffffff", padding: "2rem", textAlign: "center",
      touchAction: "none",
    }}
      onTouchMove={(e) => e.preventDefault()}
    >
      {/* Animated phone: rotates from vertical red to horizontal green */}
      <div style={{ marginBottom: "2rem", width: "80px", height: "80px" }}>
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ animation: "phoneRotate 3s ease-in-out infinite" }}
        >
          <rect x="4" y="2" width="16" height="20" rx="2" style={{ animation: "phoneColor 3s ease-in-out infinite" }} />
          <path d="M12 18h.01" style={{ animation: "phoneColor 3s ease-in-out infinite" }} />
        </svg>
      </div>
      <p style={{ fontSize: "1.1rem", fontWeight: 700, lineHeight: 1.5, maxWidth: "280px" }}>
        Ruota il telefono in orizzontale per visualizzare il portfolio.
      </p>
      <style>{`
        @keyframes phoneRotate {
          0%, 20% { transform: rotate(0deg); }
          50%, 70% { transform: rotate(-90deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes phoneColor {
          0%, 20% { stroke: #c8102e; }
          50%, 70% { stroke: #22c55e; }
          100% { stroke: #c8102e; }
        }
      `}</style>
    </div>
  ) : null;

  const mobileLandscapeGate = isMobile && !isPortrait && !mobileEntered ? (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      backgroundColor: "#0a0a0a", color: "#ffffff",
    }}>
      <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "2rem" }}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M18 12h.01" />
      </svg>
      {countdown !== null && (
        <span style={{
          fontSize: "2.5rem", fontWeight: 700, color: "#ffffff",
          animation: "countPulse 0.8s ease-out",
        }} key={countdown}>
          {countdown}
        </span>
      )}
      <style>{`
        @keyframes countPulse {
          0% { transform: scale(1.5); opacity: 0.3; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  ) : null;

  return (
    <>
      {mobilePortraitOverlay}
      {mobileLandscapeGate}
      <div ref={wrapRef} style={{ opacity: 1 }}>
        <Component {...pageProps} />
      </div>
    </>
  );
}
