// pages/_app.js
import "@/styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // ---- Protezione immagini: contextmenu, drag, touchstart ----
    const handleContextMenu = (e) => {
      // previeni il menu contestuale SOLO sulle immagini
      if (e.target && e.target.tagName === "IMG") {
        e.preventDefault();
      }
    };
    const handleDragStart = (e) => {
      if (e.target && e.target.tagName === "IMG") {
        e.preventDefault();
      }
    };
    const handleTouchStart = (e) => {
      if (e.target && e.target.tagName === "IMG") {
        // impedisce il menu lungo su mobile su target immagine
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("touchstart", handleTouchStart, { passive: false });

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("touchstart", handleTouchStart);
    };
  }, []); // esegui solo una volta

  useEffect(() => {
    // ---- Tema globale in base alla rotta ----
    // Usa la classe mode-professional su <html> per cambiare variabili CSS
    const root = document.documentElement;
    const isProfessional = router.pathname.startsWith("/professional");
    root.classList.toggle("mode-professional", isProfessional);

    // Inoltre forziamo classi bg/text come fallback per pagine che non usano CSS vars
    if (isProfessional) {
      document.body.classList.add("bg-black", "text-white");
      document.body.classList.remove("bg-white", "text-black");
    } else {
      document.body.classList.add("bg-white", "text-black");
      document.body.classList.remove("bg-black", "text-white");
    }

    // pulizia non necessaria qui (toggle rimanente controllato da dependency)
  }, [router.pathname]);

  return <Component {...pageProps} />;
}
