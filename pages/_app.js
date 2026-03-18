// pages/_app.js
import "@/styles/globals.css";
import { useEffect, useRef, useCallback } from "react";
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

  return (
    <div ref={wrapRef} style={{ opacity: 1 }}>
      <Component {...pageProps} />
    </div>
  );
}
