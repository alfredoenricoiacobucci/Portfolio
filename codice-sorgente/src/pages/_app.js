// pages/_app.js
import "@/styles/globals.css";
import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/router";
import { useTrackPageView } from "@/lib/useAnalytics";

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

  // ---- Analytics: traccia la pagina corrente ----
  const trackPage = router.pathname.startsWith("/professional")
    ? "pro"
    : router.pathname.startsWith("/artwork")
      ? "art"
      : router.pathname === "/"
        ? "landing"
        : null;
  useTrackPageView(trackPage);

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
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  // Detect in-app browsers (Instagram, Facebook, TikTok, etc.)
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const inApp = /Instagram|FBAN|FBAV|Line\/|Twitter|TikTok|Snapchat/i.test(ua);
    setIsInAppBrowser(inApp);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 1024;
      setIsMobile(touch && smallScreen);

      // Detect portrait using multiple APIs for in-app browser compatibility (Instagram, Facebook, etc.)
      let portrait;
      if (screen.orientation && screen.orientation.type) {
        // Most reliable: Screen Orientation API
        portrait = screen.orientation.type.startsWith("portrait");
      } else if (typeof window.orientation === "number") {
        // Deprecated but widely supported fallback
        portrait = window.orientation === 0 || window.orientation === 180;
      } else {
        // Last resort: viewport dimensions
        portrait = window.innerHeight > window.innerWidth;
      }
      setIsPortrait(portrait);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    // orientationchange for legacy browsers
    window.addEventListener("orientationchange", () => setTimeout(checkMobile, 200));
    // Screen Orientation API change event
    if (screen.orientation) {
      screen.orientation.addEventListener("change", () => setTimeout(checkMobile, 100));
    }
    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("orientationchange", checkMobile);
      if (screen.orientation) {
        screen.orientation.removeEventListener("change", checkMobile);
      }
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

  // Loading bar for landscape gate (2s then auto-enter)
  const [gateActive, setGateActive] = useState(false);

  useEffect(() => {
    if (isMobile && !isPortrait && !mobileEntered) {
      // Small delay to trigger CSS animation after mount
      requestAnimationFrame(() => setGateActive(true));
      const t = setTimeout(() => setMobileEntered(true), 2000);
      return () => { clearTimeout(t); setGateActive(false); };
    } else {
      setGateActive(false);
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
      color: "#f8f4ed", padding: "2rem", textAlign: "center",
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
        Ruota il dispositivo in orizzontale per accedere al sito.
      </p>
      {isInAppBrowser && (
        <a
          href={typeof window !== "undefined" ? window.location.href : "#"}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginTop: "1.5rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1.5rem",
            backgroundColor: "#f8f4ed",
            color: "#0a0a0a",
            borderRadius: "12px",
            fontSize: "0.95rem",
            fontWeight: 700,
            textDecoration: "none",
            letterSpacing: "0.01em",
          }}
          onClick={(e) => {
            e.preventDefault();
            // Try to open in external browser
            const url = window.location.href;
            // For Instagram/Facebook in-app browsers, use intent URL schemes
            const safariUrl = "x-safari-" + url;
            window.location.href = safariUrl;
            // Fallback: try window.open after small delay
            setTimeout(() => { window.open(url, "_system"); }, 300);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          Apri in Safari
        </a>
      )}
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
      backgroundColor: "#0a0a0a", color: "#f8f4ed",
    }}>
      <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "2rem" }}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M18 12h.01" />
      </svg>
      {/* Loading bar */}
      <div style={{
        width: "120px", height: "3px", backgroundColor: "rgba(248,244,237,0.15)",
        borderRadius: "2px", overflow: "hidden", marginTop: "1.5rem",
      }}>
        <div style={{
          height: "100%", backgroundColor: "#f8f4ed", borderRadius: "2px",
          width: gateActive ? "100%" : "0%",
          transition: "width 2s linear",
        }} />
      </div>
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
