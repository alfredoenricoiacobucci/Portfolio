// pages/artwork/index.js
import { useEffect, useMemo, useState, useRef } from "react";
import Modal from "@/components/Modal";
import { useRouter } from "next/router";
import { BY_MODE } from "@/data/projects";
import dynamic from "next/dynamic";
const TopRotator = dynamic(() => import("../../components/TopRotator"), { ssr: false });

// About text viene ora da content/about/testo.txt via getServerSideProps

export async function getServerSideProps() {
  const fs = await import("fs");
  const path = await import("path");
  const fsMod = await fs;
  const pathMod = await path;

  const root = process.cwd();
  const contentDir = pathMod.join(root, "content");
  const publicDir = pathMod.join(root, "public");
  const projectsDir = pathMod.join(publicDir, "projects");

  // Helper: leggi file di testo (trim), ritorna stringa vuota se non esiste
  const readText = (filePath) => {
    try { return fsMod.readFileSync(filePath, "utf-8").trim(); } catch { return ""; }
  };

  const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
  const VIDEO_EXT = new Set([".mp4", ".webm", ".mov"]);
  const natural = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

  // ---- PROGETTI: leggi tutto da public/projects/{id}/ (testi + immagini insieme) ----
  let projectIds = [];
  try { projectIds = fsMod.readdirSync(projectsDir).filter((f) => fsMod.statSync(pathMod.join(projectsDir, f)).isDirectory()).sort(natural.compare); } catch {}

  const projects = projectIds.map((id) => {
    const pDir = pathMod.join(projectsDir, id);
    const titleRaw = readText(pathMod.join(pDir, "titolo.txt"));
    const titleLines = titleRaw.split("\n").map((l) => l.trim());
    const title = titleLines[0] || "";
    const datePlace = titleLines[1] || "";
    const description = readText(pathMod.join(pDir, "descrizione.txt"));
    const banner = readText(pathMod.join(pDir, "banner.txt"));

    // Immagini dalla sottocartella foto/
    const fotoDir = pathMod.join(pDir, "foto");
    let files = [];
    try {
      files = fsMod.readdirSync(fotoDir)
        .filter((f) => ALLOWED.has(pathMod.extname(f).toLowerCase()))
        .sort(natural.compare);
    } catch {}
    const images = files.map((f) => `/projects/${id}/foto/${f}`);

    let bannerStartIndex = 0;
    if (banner && files.length > 0) {
      const idx = files.findIndex((f) => f.toLowerCase() === banner.toLowerCase());
      bannerStartIndex = idx >= 0 ? idx : 0;
    }

    return { id, name: title || id, datePlace, description, images, bannerStartIndex };
  });

  // ---- ABOUT: leggi da content/about/ ----
  const aboutDir = pathMod.join(contentDir, "about");
  const aboutText = readText(pathMod.join(aboutDir, "testo.txt"));
  const aboutQuote = readText(pathMod.join(aboutDir, "citazione.txt"));

  // Cerca foto in content/about/ (copia in public se serve per servire)
  let aboutPhoto = "";
  let aboutVideo = "";
  try {
    const aboutFiles = fsMod.readdirSync(aboutDir);
    const photoFile = aboutFiles.find((f) => ALLOWED.has(pathMod.extname(f).toLowerCase()));
    const videoFile = aboutFiles.find((f) => VIDEO_EXT.has(pathMod.extname(f).toLowerCase()));

    if (photoFile) {
      // Copia in public/about/ per servirla come asset statico
      const pubAbout = pathMod.join(publicDir, "about");
      if (!fsMod.existsSync(pubAbout)) fsMod.mkdirSync(pubAbout, { recursive: true });
      fsMod.copyFileSync(pathMod.join(aboutDir, photoFile), pathMod.join(pubAbout, photoFile));
      aboutPhoto = `/about/${photoFile}`;
    }
    if (videoFile) {
      const pubAbout = pathMod.join(publicDir, "about");
      if (!fsMod.existsSync(pubAbout)) fsMod.mkdirSync(pubAbout, { recursive: true });
      fsMod.copyFileSync(pathMod.join(aboutDir, videoFile), pathMod.join(pubAbout, videoFile));
      aboutVideo = `/about/${videoFile}`;
    }
  } catch {}

  // ---- STRINGHE: leggi da content/stringhe.txt ----
  const stringheRaw = readText(pathMod.join(contentDir, "stringhe.txt"));
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
    props: {
      projects,
      about: { text: aboutText, quote: aboutQuote, photo: aboutPhoto, video: aboutVideo },
      strings,
    },
  };
}

const slugify = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/* ============================================================
   ContactForm — invia email tramite /api/contact (Web3Forms).
   Fallback: apre mailto: se l'API non è configurata.
   ============================================================ */
function ContactForm({ mode, strings: S = {}, onSuccess }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const isDark = mode === "professional";

  const inputCls = isDark
    ? "w-full bg-transparent border-b border-white/30 text-white placeholder-white/40 py-3 focus:outline-none focus:border-white transition-colors"
    : "w-full bg-transparent border-b border-black/20 text-black placeholder-black/35 py-3 focus:outline-none focus:border-black transition-colors";
  const btnCls = isDark
    ? "w-full py-3 mt-2 font-semibold border border-white text-white hover:bg-white hover:text-black transition-colors"
    : "w-full py-3 mt-2 font-semibold border border-black text-black hover:bg-black hover:text-white transition-colors";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const name = e.target.elements["contact-name"].value.trim();
    const email = e.target.elements["contact-email"].value.trim();
    const message = e.target.elements["contact-message"].value.trim();

    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSent(true);
        setTimeout(() => onSuccess?.(), 2000);
      } else {
        // Mostra errore e apri mailto come fallback
        console.error("Web3Forms error:", data);
        setError("Invio automatico non riuscito. Apertura client email...");
        setTimeout(() => {
          const subject = encodeURIComponent("Contatto dal portfolio");
          const body = encodeURIComponent(`Ciao Alfredo,\n\nNome: ${name}\nEmail: ${email}\n\n${message}\n`);
          window.location.href = `mailto:${S.EMAIL_DESTINATARIO || "a.e.iacobucci@icloud.com"}?subject=${subject}&body=${body}`;
        }, 1500);
      }
    } catch (err) {
      console.error("Contact fetch error:", err);
      setError("Invio automatico non riuscito. Apertura client email...");
      setTimeout(() => {
        const subject = encodeURIComponent("Contatto dal portfolio");
        const body = encodeURIComponent(`Ciao Alfredo,\n\nNome: ${name}\nEmail: ${email}\n\n${message}\n`);
        window.location.href = `mailto:a.e.iacobucci@icloud.com?subject=${subject}&body=${body}`;
      }, 1500);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="py-8 text-center">
        <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-black"}`}>{S.MESSAGGIO_INVIATO || "Messaggio inviato!"}</p>
        <p className={`text-sm mt-2 ${isDark ? "text-white/60" : "text-black/50"}`}>{S.MESSAGGIO_INVIATO_SUB || "Ti risponderò il prima possibile."}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <input name="contact-name" type="text" placeholder={S.PLACEHOLDER_NOME || "Nome e Cognome"} className={inputCls} required />
      <input name="contact-email" type="email" placeholder={S.PLACEHOLDER_EMAIL || "La tua email"} className={inputCls} />
      <textarea name="contact-message" placeholder={S.PLACEHOLDER_MESSAGGIO || "Il tuo messaggio"} className={`${inputCls} resize-none`} rows={5} required />
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <button type="submit" className={btnCls} disabled={sending}>
        {sending ? "Invio in corso..." : (S.TASTO_INVIA || "Invia")}
      </button>
    </form>
  );
}

/* ============================================================
   JustifiedGallery — mosaico omogeneo.
   Ogni riga ha MINIMO 2 foto. Se ne avanza 1, viene assorbita
   dalla riga precedente. Tutte le righe riempiono la larghezza.
   ============================================================ */
function JustifiedGallery({ images = [], onImageClick }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [dims, setDims] = useState(null);
  const GAP = 6;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const m = () => { const w = el.clientWidth; if (w > 0) setContainerWidth(w); };
    m();
    const ro = new ResizeObserver(m);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!images.length) { setDims([]); return; }
    let cancelled = false;
    Promise.all(images.map((src, i) => new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve({ src, ratio: img.naturalWidth / img.naturalHeight, idx: i });
      img.onerror = () => resolve({ src, ratio: 1.5, idx: i });
      img.src = src;
    }))).then((d) => { if (!cancelled) setDims(d); });
    return () => { cancelled = true; };
  }, [images]);

  const rows = useMemo(() => {
    if (!dims?.length || containerWidth <= 0) return [];
    const TARGET_H = containerWidth < 640 ? 360 : containerWidth < 1024 ? 500 : 640;
    const rawRows = [];
    let i = 0;

    // Passo 1: costruisci righe greedily (min 2 per riga, max 3)
    while (i < dims.length) {
      const row = [dims[i]];
      let ratioSum = dims[i].ratio;
      i++;

      // Aggiungi almeno un'altra foto (min 2 per riga) se disponibile
      if (i < dims.length) {
        row.push(dims[i]);
        ratioSum += dims[i].ratio;
        i++;
      }

      // Prova ad aggiungere una terza se la riga non è ancora piena
      if (i < dims.length && row.length < 3) {
        const candidateWidth = (ratioSum + dims[i].ratio) * TARGET_H + row.length * GAP;
        // Aggiungi solo se non sfora troppo o se servono almeno 2 nella prossima riga
        const remaining = dims.length - i;
        if (candidateWidth <= containerWidth * 1.4 || remaining === 1) {
          row.push(dims[i]);
          ratioSum += dims[i].ratio;
          i++;
        }
      }

      rawRows.push(row);
    }

    // Passo 2: se l'ultima riga ha 1 sola foto, spostala nella penultima
    if (rawRows.length > 1 && rawRows[rawRows.length - 1].length === 1) {
      const loner = rawRows.pop()[0];
      rawRows[rawRows.length - 1].push(loner);
    }

    // Passo 3: calcola altezze giustificate (ogni riga riempie la larghezza)
    return rawRows.map((row) => {
      const totalGap = GAP * (row.length - 1);
      const ratioSum = row.reduce((s, item) => s + item.ratio, 0);
      const h = (containerWidth - totalGap) / ratioSum;
      return { items: row, height: h };
    });
  }, [dims, containerWidth]);

  return (
    <div ref={containerRef} className="w-full">
      {rows.map((row, ri) => (
        <div key={ri} className="flex" style={{
          gap: `${GAP}px`,
          marginBottom: ri < rows.length - 1 ? `${GAP}px` : 0,
        }}>
          {row.items.map((item) => {
            const w = item.ratio * row.height;
            return (
              <button key={item.idx} type="button"
                className="group relative overflow-hidden cursor-zoom-in focus:outline-none flex-shrink-0"
                style={{ width: `${w}px`, height: `${row.height}px` }}
                onClick={() => onImageClick?.(item.idx)}
                aria-label={`Apri immagine ${item.idx + 1} a schermo intero`}
              >
                <img src={item.src} alt=""
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  loading={ri < 2 ? "eager" : "lazy"} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="rounded px-3 py-1 text-white text-xs md:text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-150 drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">
                    visualizza a schermo intero
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function Portfolio({ projects, about = {}, strings = {} }) {
  // Stringhe con fallback
  const S = {
    NOME: strings.NOME || "Alfredo Enrico Iacobucci",
    LABEL_ARTWORK: strings.LABEL_ARTWORK || "Artwork",
    LABEL_PROFESSIONAL: strings.LABEL_PROFESSIONAL || "Professional",
    LABEL_EMAIL: strings.LABEL_EMAIL || "Email",
    LABEL_ABOUT: strings.LABEL_ABOUT || "About",
    LABEL_HOME: strings.LABEL_HOME || "Home",
    LABEL_INSTA: strings.LABEL_INSTA || "Insta",
    LINK_INSTA: strings.LINK_INSTA || "https://instagram.com/alfredoenricoiacobucci",
    COPYRIGHT: strings.COPYRIGHT || "Alfredo Enrico Iacobucci",
    DISCLAIMER: strings.DISCLAIMER || "Tutte le immagini presenti sono coperte da copyright e non possono essere utilizzate senza autorizzazione.",
    TITOLO_CONTATTI: strings.TITOLO_CONTATTI || "Contattami",
    PLACEHOLDER_NOME: strings.PLACEHOLDER_NOME || "Nome e Cognome",
    PLACEHOLDER_EMAIL: strings.PLACEHOLDER_EMAIL || "La tua email",
    PLACEHOLDER_MESSAGGIO: strings.PLACEHOLDER_MESSAGGIO || "Il tuo messaggio",
    TASTO_INVIA: strings.TASTO_INVIA || "Invia",
    MESSAGGIO_INVIATO: strings.MESSAGGIO_INVIATO || "Messaggio inviato!",
    MESSAGGIO_INVIATO_SUB: strings.MESSAGGIO_INVIATO_SUB || "Ti risponderò il prima possibile.",
    EMAIL_DESTINATARIO: strings.EMAIL_DESTINATARIO || "a.e.iacobucci@icloud.com",
    TELEFONO: strings.TELEFONO || "+39 373 7286324",
    INSTAGRAM_HANDLE: strings.INSTAGRAM_HANDLE || "@alfredoenricoiacobucci",
    LABEL_VIDEO_PLACEHOLDER: strings.LABEL_VIDEO_PLACEHOLDER || "Video coming soon",
    LABEL_FOTO_PLACEHOLDER: strings.LABEL_FOTO_PLACEHOLDER || "Foto",
  };
  const router = useRouter();

  const mode = router.pathname.startsWith("/professional") ? "professional" : "artwork";
  const basePath = `/${mode}`;

  const [selectedProject, setSelectedProject] = useState(null);
  const [showContact, setShowContact] = useState(false);

  // ===== VIEWER: SOLO STATE LOCALE, NIENTE URL SYNC =====
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const [bannerIndex, setBannerIndex] = useState(0);
  const [prevBannerIndex, setPrevBannerIndex] = useState(null);
  const timerRef = useRef(null);

  const orderList = BY_MODE[mode] || [];

  const projectsWithSlug = useMemo(() => {
    const idx = new Map(orderList.map((id, i) => [id, i]));
    const filtered = (projects || [])
      .filter((p) => idx.has(p.id))
      .map((p) => ({ ...p, slug: slugify(p.name) }));
    filtered.sort((a, b) => idx.get(a.id) - idx.get(b.id));
    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, mode]);

  const currentSlug = useMemo(
    () => (selectedProject ? slugify(selectedProject.name) : null),
    [selectedProject]
  );

  const hrefProject = (slug) => `${basePath}?p=${slug}`;

  // ===== URL → STATE: sincronizza progetto dall'URL =====
  const syncStateFromUrl = useMemo(() => {
    return (q) => {
      if (!q) {
        setSelectedProject(null);
        setViewerOpen(false);
        window.scrollTo({ top: 0 });
        return;
      }

      if (q === "about") {
        setSelectedProject({
          name: "About",
          description: about.text || "",
          quote: about.quote || "",
          photo: about.photo || "",
          video: about.video || "",
        });
        setViewerOpen(false);
        window.scrollTo({ top: 0 });
        return;
      }

      const found = projectsWithSlug.find((p) => p.slug === q);
      if (found) {
        setSelectedProject(found);
        if (found.images?.length) {
          setBannerIndex(found.bannerStartIndex || 0);
          setPrevBannerIndex(null);
        }
        setViewerOpen(false);
        window.scrollTo({ top: 0 });
      }
    };
  }, [projectsWithSlug, mode]);

  // Reagisce ai cambi di query (navigazione in avanti)
  useEffect(() => {
    syncStateFromUrl(router.query?.p);
  }, [router.query?.p, syncStateFromUrl]);

  // Gestisce il back/forward del browser in modo affidabile
  useEffect(() => {
    const handleRouteChange = (url) => {
      const params = new URL(url, window.location.origin).searchParams;
      syncStateFromUrl(params.get("p") || undefined);
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events, syncStateFromUrl]);

  // ===== TASTIERA VIEWER: solo state, niente URL =====
  useEffect(() => {
    if (!viewerOpen || !selectedProject?.images?.length) return;
    
    const onKey = (e) => {
      if (e.key === "Escape") {
        setViewerOpen(false);
      }
      if (e.key === "ArrowRight") {
        setViewerIndex((prev) => (prev + 1) % selectedProject.images.length);
      }
      if (e.key === "ArrowLeft") {
        setViewerIndex((prev) => (prev - 1 + selectedProject.images.length) % selectedProject.images.length);
      }
    };
    
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerOpen, selectedProject]);

  // Flag: siamo nella vista home (marquee visibile)?
  const isHome = !selectedProject;

  // Gradiente bottom: opacità basata sulla distanza dal fondo della pagina
  const [gradientOpacity, setGradientOpacity] = useState(1);

  useEffect(() => {
    if (!isHome) { setGradientOpacity(0); return; }

    const onScroll = () => {
      const distFromBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      // Sfuma tra 200px e 0px dal fondo
      const opacity = Math.min(1, Math.max(0, distFromBottom / 200));
      setGradientOpacity(opacity);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // calcola subito
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  // ===== MARQUEE =====
  useEffect(() => {
    // Ricalcola solo quando la home è visibile
    if (!isHome) return;

    const PX_PER_SEC = 500;
    // Doppio timeout: il primo aspetta il render, il secondo aspetta il layout
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        const tracks = document.querySelectorAll(".marquee-track");
        tracks.forEach((track) => {
          const seq = track.querySelector(".marquee-seq");
          if (!seq) return;
          const distance = seq.scrollWidth;
          const durSec = Math.max(4, distance / PX_PER_SEC);
          track.style.setProperty("--marquee-duration", `${durSec}s`);
        });
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [mode, isHome]);

  return (
    <div className={`min-h-screen ${mode === "professional" ? "bg-base text-white" : "bg-base text-black"} flex flex-col items-center`}>
      {/* HEADER */}
      <header className="w-full flex justify-between items-center py-14 px-4 border-b-4 site-border text-[22px] font-bold relative">
        {/* PALLINO ROSSO / TRIANGOLO INDIETRO */}
        {selectedProject ? (
          <button
            onClick={() => router.push(basePath, undefined, { shallow: true })}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-150 transition-transform"
            aria-label="Torna alla home"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="#c8102e">
              <polygon points="0,8 14,0.5 14,15.5" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => router.push("/")}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full cursor-pointer hover:scale-150 transition-transform"
            style={{ backgroundColor: "#c8102e" }}
            aria-label="Torna alla landing"
          />
        )}
        <div className="flex items-center gap-2 text-[20px]">
          <button
            onClick={() => {
              const isAbout = router.query?.p === "about";
              router.push(isAbout ? "/artwork?p=about" : "/artwork");
            }}
            className={`cursor-pointer transition-all hover-red ${
              router.pathname.startsWith("/artwork") ? "opacity-100" : "opacity-50"
            }`}
          >
            {S.LABEL_ARTWORK}
          </button>
          <span className="px-2">/</span>
          <button
            onClick={() => {
              const isAbout = router.query?.p === "about";
              router.push(isAbout ? "/professional?p=about" : "/professional");
            }}
            className={`cursor-pointer transition-all hover-red ${
              router.pathname.startsWith("/professional") ? "opacity-100" : "opacity-50"
            }`}
          >
            {S.LABEL_PROFESSIONAL}
          </button>
        </div>

        <nav className="text-[20px]">
          <span className="cursor-pointer transition-colors hover-red" onClick={() => setShowContact(true)}>{S.LABEL_EMAIL}</span>
          <span>, </span>
          {router.query?.p === "about" ? (
            <span className="cursor-pointer transition-colors hover-red" onClick={() => router.push(basePath, undefined, { shallow: true })}>{S.LABEL_HOME}</span>
          ) : (
            <span className="cursor-pointer transition-colors hover-red" onClick={() => router.push(`${basePath}?p=about`, undefined, { shallow: true })}>{S.LABEL_ABOUT}</span>
          )}
          <span>, </span>
          <a href={S.LINK_INSTA} target="_blank" rel="noopener noreferrer" className="transition-colors hover-red">{S.LABEL_INSTA}</a>
        </nav>
      </header>

      {/* BANNER — nessun fade-in: TopRotator ha il suo crossfade interno */}
      {selectedProject && selectedProject.name !== "About" && selectedProject.images?.length > 0 && (
        <section key={`banner-${currentSlug}`} className="w-full relative">
          <TopRotator
            images={selectedProject.images}
            alt={selectedProject.name || ""}
            className="relative w-full h-[40vh] md:h-[48vh] lg:h-[56vh] overflow-hidden bg-black"
            interval={4000}
            fadeMs={2500}
            zoomMs={7000}
            priorityFirst
          />
          <div className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-b from-black/55 via-black/78 to-black/95" />
          <div className="absolute inset-0 z-40 flex items-end px-6 md:px-12">
            <div className="mb-6">
              <h2 className="text-white text-4xl md:text-6xl font-extrabold drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)]">
                {selectedProject.name}
              </h2>
              {selectedProject.datePlace && (
                <p className="text-4xl md:text-6xl font-extrabold mt-1 drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)]" style={{ color: "#c8102e" }}>
                  {selectedProject.datePlace}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* CONTENUTO PROGETTO — gallery scorre con la pagina, testo sticky a destra */}
      {selectedProject && selectedProject.name !== "About" ? (
        <div key={`project-${currentSlug}`} className="w-full fade-in flex-1">
          <div className="flex flex-col md:flex-row">
            {/* Gallery — colonna sinistra, scorre con la pagina */}
            <div className="w-full md:w-2/3 lg:w-3/4 px-6 md:pl-12 md:pr-6 py-8">
              <JustifiedGallery
                images={selectedProject.images || []}
                onImageClick={(i) => { setViewerIndex(i); setViewerOpen(true); }}
              />
            </div>
            {/* Descrizione — colonna destra, fissa (fixed) sotto il banner, scroll indipendente */}
            {selectedProject.description && (
              <div className={`hidden md:block fixed right-0 w-1/3 lg:w-1/4 independent-scroll px-6 pr-12 pl-6 py-8 ${mode === "professional" ? "text-white/80 bg-[#0a0a0a]" : "text-black/70 bg-[#fafafa]"}`} style={{ zIndex: 30, top: "calc(40vh + 120px)", bottom: 0 }}>
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {selectedProject.description}
                </p>
              </div>
            )}
            {/* Descrizione mobile — sotto la gallery */}
            {selectedProject.description && (
              <div className={`md:hidden px-6 py-8 ${mode === "professional" ? "text-white/80" : "text-black/70"}`}>
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {selectedProject.description}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : selectedProject && selectedProject.name === "About" ? (
        <>
          {/* VIDEO — letto da content/about/ */}
          <section key="about-video" className="w-full relative">
            <div className={`relative w-full h-[40vh] md:h-[48vh] lg:h-[56vh] overflow-hidden flex items-center justify-center ${mode === "professional" ? "bg-black" : "bg-neutral-100"}`}>
              {selectedProject.video ? (
                <video
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                  loop
                  autoPlay
                  src={selectedProject.video}
                />
              ) : (
                <span className={`relative z-10 text-sm font-medium ${mode === "professional" ? "text-white/30" : "text-black/20"}`}>
                  {S.LABEL_VIDEO_PLACEHOLDER}
                </span>
              )}
            </div>
            <div className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-b from-black/55 via-black/78 to-black/95" />
            <div className="absolute inset-0 z-40 flex items-end px-6 md:px-12">
              <h2 className="text-white text-4xl md:text-6xl font-extrabold mb-6 drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)]">
                About
              </h2>
            </div>
          </section>

          {/* CONTENUTO ABOUT */}
          <div key="about" className="w-full fade-in" style={{ animationDuration: '400ms' }}>
            {/* TESTO IN DUE COLONNE */}
            <div className={`w-full max-w-6xl mx-auto px-6 md:px-12 py-12 ${mode === "professional" ? "text-white" : "text-black"}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 text-sm md:text-base leading-relaxed">
                <p className="whitespace-pre-line">{selectedProject.description}</p>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div>Telefono: <a href={`tel:${S.TELEFONO.replace(/\s/g, "")}`} className="underline">{S.TELEFONO}</a></div>
                    <div>Email: <a href={`mailto:${S.EMAIL_DESTINATARIO}`} className="underline">{S.EMAIL_DESTINATARIO}</a></div>
                    <div>Instagram: <a href={S.LINK_INSTA} target="_blank" rel="noopener noreferrer" className="underline">{S.INSTAGRAM_HANDLE}</a></div>
                  </div>
                </div>
              </div>
            </div>

            {/* BLOCCO SEPARATORE — nero in artwork, bianco in professional */}
            <div className={`w-full py-20 md:py-28 ${mode === "professional" ? "bg-white" : "bg-[#0a0a0a]"}`}>
              {/* CITAZIONE — letta da content/about/citazione.txt */}
              {selectedProject.quote && (
                <div className="w-full max-w-5xl mx-auto px-6 md:px-12 text-center">
                  <div className="text-5xl md:text-7xl font-extrabold leading-none -mb-2" style={{ color: "#c8102e" }}>&ldquo;&rdquo;</div>
                  <blockquote className="text-2xl md:text-4xl lg:text-5xl font-extrabold uppercase leading-tight tracking-tight" style={{ color: "#c8102e" }}>
                    {selectedProject.quote}
                  </blockquote>
                </div>
              )}

              {/* FOTO GRANDE — letta da content/about/ (prima immagine trovata) */}
              <div className="w-full px-6 md:px-12 mt-16 md:mt-20">
                <div className={`w-full h-[50vh] md:h-[65vh] overflow-hidden flex items-center justify-center ${mode === "professional" ? "bg-neutral-100" : "bg-neutral-900"}`}>
                  {selectedProject.photo ? (
                    <img src={selectedProject.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className={`text-sm font-medium ${mode === "professional" ? "text-black/20" : "text-white/20"}`}>
                      {S.LABEL_FOTO_PLACEHOLDER}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div key="home" className="w-full relative fade-in" style={{ animationDuration: '400ms' }}>
          <div className="flex flex-col gap-0 p-0">
            {projectsWithSlug.map((project, index) => (
              <div
                key={project.slug}
                className={`w-full border-t-4 border-b-4 ${
                  mode === "professional" ? "border-white" : "border-black"
                } min-h-[1vh] flex items-center overflow-hidden`}
              >
                <div className={`marquee-track ${index % 2 === 1 ? "reverse" : ""}`}>
                  <span
                    className="marquee-seq"
                    onClick={() => router.push(hrefProject(project.slug), undefined, { shallow: true })}
                  >
                    {Array(20).fill(`${project.name} |`).join(" ")}
                  </span>
                  <span
                    className="marquee-seq"
                    aria-hidden="true"
                    onClick={() => router.push(hrefProject(project.slug), undefined, { shallow: true })}
                  >
                    {Array(20).fill(`${project.name} |`).join(" ")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Gradient fade bottom — fixed, non interferisce col layout */}
          <div
            className="pointer-events-none fixed bottom-0 left-0 right-0 z-10 h-24 md:h-32"
            style={{
              background: mode === "professional"
                ? "linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.6) 40%, transparent 100%)"
                : "linear-gradient(to top, #fafafa 0%, rgba(250,250,250,0.35) 40%, transparent 100%)",
              opacity: gradientOpacity,
              transition: "opacity 200ms ease-out",
            }}
          />
        </div>
      )}

      {/* Freccia overlay rimossa — navigazione spostata nell'header accanto al pallino */}

      {/* MODAL CONTATTI */}
      <Modal open={showContact} onClose={() => setShowContact(false)} title={S.TITOLO_CONTATTI} mode={mode}>
        <ContactForm mode={mode} strings={S} onSuccess={() => setShowContact(false)} />
      </Modal>

      {/* VIEWER FULLSCREEN */}
      {viewerOpen && selectedProject?.images?.length > 0 && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 fade-in"
          style={{ animationDuration: '250ms' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewerOpen(false);
          }}
        >
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-lg font-semibold text-center px-4 pointer-events-none">
            {selectedProject?.name}
          </div>

          {selectedProject.images.length > 1 && (
            <>
              <button
                className="absolute left-6 md:left-10 lg:left-14 top-1/2 -translate-y-1/2 text-white text-4xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)] px-2 hover:scale-110 transition-all hover-red z-10"
                onClick={() => setViewerIndex((prev) => (prev - 1 + selectedProject.images.length) % selectedProject.images.length)}
                aria-label="Immagine precedente"
              >
                ‹
              </button>
              <button
                className="absolute right-6 md:right-10 lg:right-14 top-1/2 -translate-y-1/2 text-white text-4xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)] px-2 hover:scale-110 transition-all hover-red z-10"
                onClick={() => setViewerIndex((prev) => (prev + 1) % selectedProject.images.length)}
                aria-label="Immagine successiva"
              >
                ›
              </button>
            </>
          )}

          <img
            src={selectedProject.images[viewerIndex]}
            alt=""
            className="max-w-[95vw] max-h-[85vh] w-auto h-auto object-contain shadow-2xl select-none"
          />

          <button
            className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-4xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)] hover:scale-110 transition-all hover-red z-10"
            onClick={() => setViewerOpen(false)}
            aria-label="Chiudi visualizzazione"
          >
            ×
          </button>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full py-12 border-t-4 site-border text-center text-sm font-bold space-y-2">
        <div>{S.COPYRIGHT} © {new Date().getFullYear()}</div>
        <div className="text-xs font-normal">
          {S.DISCLAIMER}
        </div>
      </footer>

      <style jsx global>{`
        @keyframes marqueeX {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        .marquee-track {
          display: flex;
          white-space: nowrap;
          width: max-content;
          will-change: transform;
          animation: marqueeX var(--marquee-duration, 80s) linear infinite;
        }

        .marquee-track.reverse {
          animation-direction: reverse;
        }

        .marquee-seq {
          padding: 0 1rem;
        }
      `}</style>
    </div>
  );
}
