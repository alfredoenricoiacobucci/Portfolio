// pages/artwork/index.js
import { useEffect, useMemo, useState, useRef } from "react";
import Modal from "@/components/Modal";
import { useRouter } from "next/router";
import { BY_MODE } from "@/data/projects";
import dynamic from "next/dynamic";
import { useTrackPageView, useTrackPhoto, trackContact } from "@/lib/useAnalytics";
const TopRotator = dynamic(() => import("../../components/TopRotator"), { ssr: false });

// I contenuti (testi progetti + about) vengono ora letti da un unico file:
// public/projects/contenuti.json (editabile con _editor.html)

export async function getServerSideProps() {
  const fs = await import("fs");
  const path = await import("path");
  const fsMod = await fs;
  const pathMod = await path;

  const root = process.cwd();
  // contenuti sta al root del progetto. public/projects \u00e8 un symlink verso contenuti.
  const contenutiDir = pathMod.join(root, "contenuti");
  const publicDir = pathMod.join(root, "public");
  const projectsDir = contenutiDir; // i dati sono in contenuti (public/projects \u00e8 solo il link che li serve)

  // Helper: leggi file di testo (trim), ritorna stringa vuota se non esiste
  const readText = (filePath) => {
    try { return fsMod.readFileSync(filePath, "utf-8").trim(); } catch { return ""; }
  };
  // Helper: leggi JSON, ritorna null se non esiste o è corrotto
  const readJSON = (filePath) => {
    try { return JSON.parse(fsMod.readFileSync(filePath, "utf-8")); } catch { return null; }
  };

  const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
  const VIDEO_EXT = new Set([".mp4", ".webm", ".mov"]);
  const natural = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

  // ---- contenuti: leggi da public/projects/contenuti.json ----
  const contenuti = readJSON(pathMod.join(projectsDir, "contenuti.json")) || { projects: [], about: {} };
  const projByKey = new Map();
  (contenuti.projects || []).forEach((p) => {
    projByKey.set(`${p.section}/${p.slug}`, p);
  });

  // ---- PROGETTI: lista cartelle effettive, unisci con dati da contenuti.json ----
  const readProject = (prefix, folder) => {
    const id = `${prefix}/${folder}`;
    const pDir = pathMod.join(projectsDir, prefix, folder);
    const data = projByKey.get(id) || {};

    const titleRaw = (data.titolo || "").trim();
    const titleLines = titleRaw.split("\n").map((l) => l.trim()).filter(Boolean);
    const titleParts = titleLines.length > 1 ? titleLines.slice(0, -1) : titleLines;
    const title = titleParts[0] || "";
    const titleExtra = titleParts.slice(1);
    const datePlace = titleLines.length > 1 ? titleLines[titleLines.length - 1] : "";
    const description = (data.descrizione || "").trim();
    const banner = (data.banner || "").trim();

    // Dati tecnici da JSON
    let techData = null;
    if (data.camera || data.ottica || data.luce) {
      techData = {};
      if (data.camera) techData.camera = String(data.camera).trim();
      if (data.ottica) techData.ottica = String(data.ottica).trim();
      if (data.luce) techData.luce = String(data.luce).trim();
      if (Object.keys(techData).length === 0) techData = null;
    }

    let files = [];
    try {
      files = fsMod.readdirSync(pDir)
        .filter((f) => ALLOWED.has(pathMod.extname(f).toLowerCase()));
    } catch {}
    // Ordine custom da contenuti.json, poi alfabetico per i restanti
    const ordine = data.ordine || [];
    if (ordine.length > 0) {
      const orderMap = new Map(ordine.map((n, i) => [n, i]));
      files.sort((a, b) => {
        const ia = orderMap.has(a) ? orderMap.get(a) : Infinity;
        const ib = orderMap.has(b) ? orderMap.get(b) : Infinity;
        if (ia !== ib) return ia - ib;
        return natural.compare(a, b);
      });
    } else {
      files.sort(natural.compare);
    }
    const images = files.map((f) => `/projects/${id}/${f}`);

    let bannerStartIndex = 0;
    if (banner && files.length > 0) {
      const idx = files.findIndex((f) => f.toLowerCase() === banner.toLowerCase());
      bannerStartIndex = idx >= 0 ? idx : 0;
    }

    return { id, name: title || id, titleExtra, datePlace, description, images, bannerStartIndex, techData };
  };

  let projects = [];
  for (const prefix of ["art", "pro"]) {
    const prefixDir = pathMod.join(projectsDir, prefix);
    let folders = [];
    try { folders = fsMod.readdirSync(prefixDir).filter((f) => fsMod.statSync(pathMod.join(prefixDir, f)).isDirectory()).sort(natural.compare); } catch {}
    projects = projects.concat(folders.map((f) => readProject(prefix, f)));
  }

  // ---- ABOUT: leggi da contenuti.json + media da public/projects/about/ ----
  const aboutData = contenuti.about || {};
  const aboutText = (aboutData.text || "").trim();
  const aboutQuote = (aboutData.quote || "").trim();

  let aboutPhoto = "";
  let aboutVideo = "";
  // Cerca media in public/projects/about/
  try {
    const aboutMediaDir = pathMod.join(projectsDir, "about");
    const aboutFiles = fsMod.readdirSync(aboutMediaDir);
    const photoFile = aboutData.photo && aboutFiles.includes(aboutData.photo)
      ? aboutData.photo
      : aboutFiles.find((f) => ALLOWED.has(pathMod.extname(f).toLowerCase()));
    const videoFile = aboutData.video && aboutFiles.includes(aboutData.video)
      ? aboutData.video
      : aboutFiles.find((f) => VIDEO_EXT.has(pathMod.extname(f).toLowerCase()));
    if (photoFile) aboutPhoto = `/projects/about/${photoFile}`;
    if (videoFile) aboutVideo = `/projects/about/${videoFile}`;
  } catch {}

  // ---- STRINGHE: leggi da contenuti/stringhe.txt ----
  const stringheRaw = readText(pathMod.join(contenutiDir, "stringhe.txt"));
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
      about: (() => {
        let col1 = aboutText, col2 = "";
        if (aboutText.includes("---")) {
          const parts = aboutText.split("---");
          col1 = parts[0].trim();
          col2 = parts.slice(1).join("---").trim();
        } else {
          // Dividi a metà per paragrafi
          const paragraphs = aboutText.split("\n").filter(Boolean);
          const mid = Math.ceil(paragraphs.length / 2);
          col1 = paragraphs.slice(0, mid).join("\n");
          col2 = paragraphs.slice(mid).join("\n");
        }
        return { text: col1, text2: col2, quote: aboutQuote, photo: aboutPhoto, video: aboutVideo };
      })(),
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
      // Invio diretto a Web3Forms (client-side, no API route)
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: "6c54ffe5-dbe2-4109-af5b-ef65277506cb",
          subject: `Contatto dal portfolio — ${name}`,
          from_name: name,
          replyto: email || "",
          message: `Nome: ${name}\nEmail: ${email || "non fornita"}\n\n${message}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        trackContact();
      } else {
        setError(S.ERRORE_INVIO || "Errore nell'invio. Riprova o scrivi direttamente a a.e.iacobucci@icloud.com");
      }
    } catch (err) {
      setError(S.ERRORE_INVIO || "Errore di connessione. Riprova o scrivi direttamente a a.e.iacobucci@icloud.com");
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
                  loading={ri < 2 ? "eager" : "lazy"}
                  decoding="async" />
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

  // ---- Analytics: traccia progetto selezionato e foto aperte ----
  const trackPhoto = useTrackPhoto();
  useTrackPageView(
    selectedProject && selectedProject.name !== "About" ? (mode === "professional" ? "pro" : "art") : null,
    selectedProject && selectedProject.name !== "About" ? selectedProject.id : undefined
  );

  // ===== NAVIGATION HISTORY: stack per il triangolo back =====
  const navHistoryRef = useRef([]);

  // ===== HEADER HEIGHT per banner calc =====
  const headerRef = useRef(null);
  useEffect(() => {
    if (headerRef.current) {
      const h = headerRef.current.offsetHeight;
      document.documentElement.style.setProperty('--header-h', `${h}px`);
    }
  });

  // ===== HEADER AUTO-HIDE su progetto e about =====
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  useEffect(() => {
    if (!selectedProject) { setHeaderHidden(false); return; }
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastScrollY.current && y > 48) {
        setHeaderHidden(true);
      } else {
        setHeaderHidden(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [selectedProject]);

  // ===== CAMBIO MODO: semplice fade out → naviga → fade in =====
  const navigatingRef = useRef(false);
  const pageRef = useRef(null);

  const handleModeSwitch = (targetMode) => {
    if (targetMode === mode || navigatingRef.current) return;
    navigatingRef.current = true;
    const isAbout = router.query?.p === "about";
    const target = isAbout ? `/${targetMode}?p=about` : `/${targetMode}`;

    // Fade out il contenuto, poi naviga
    if (pageRef.current) {
      pageRef.current.style.transition = "opacity 250ms ease-out";
      pageRef.current.style.opacity = "0";
    }
    setTimeout(() => {
      router.push(target);
      navigatingRef.current = false;
    }, 260);
  };

  // Hover sui label
  const [hoverMode, setHoverMode] = useState(null);

  // ===== VIEWER: SOLO STATE LOCALE, NIENTE URL SYNC =====
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // ===== TOGGLE BLOCCO TESTO SOTTO BANNER =====
  const [textOpen, setTextOpen] = useState(false);

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
        setTextOpen(false);
        window.scrollTo(0, 0);
        return;
      }

      if (q === "about") {
        setSelectedProject({
          name: "About",
          description: about.text || "",
          description2: about.text2 || "",
          quote: about.quote || "",
          photo: about.photo || "",
          video: about.video || "",
        });
        setViewerOpen(false);
        setTextOpen(false);
        window.scrollTo(0, 0);
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
        setTextOpen(false);
        window.scrollTo(0, 0);
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

  // Gradiente bottom home: opacità basata sulla distanza dal fondo della pagina
  const [gradientOpacity, setGradientOpacity] = useState(1);

  // Gradiente bottom banner: svanisce appena si scrolla
  const [bannerFadeOpacity, setBannerFadeOpacity] = useState(1);
  useEffect(() => {
    if (!selectedProject || selectedProject.name === "About") { setBannerFadeOpacity(1); return; }
    const onScroll = () => {
      const opacity = Math.min(1, Math.max(0, 1 - window.scrollY / 150));
      setBannerFadeOpacity(opacity);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [selectedProject]);

  // (lock/sticky rimosso: galleria e testo scorrono con la pagina)

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

  // ===== MARQUEE: imposta durate =====
  useEffect(() => {
    if (!isHome) return;
    const PX_PER_SEC = 500;
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
  }, [mode, isHome]);

  return (
    <div ref={pageRef} className="min-h-screen flex flex-col items-center fade-in" style={{ animationDuration: '300ms', backgroundColor: mode === "professional" ? "#0a0a0a" : "#f8f4ed", color: mode === "professional" ? "#f8f4ed" : "#000000" }}>
      {/* HEADER */}
      <header ref={headerRef} className={`w-full flex justify-between items-center py-[2.2rem] px-4 ${mode === "professional" ? "border-b-[2.5px]" : "border-b-4"} text-[15px] font-bold relative`} style={{ borderColor: mode === "professional" ? "#f8f4ed" : "#000000", backgroundColor: mode === "professional" ? "#0a0a0a" : "#f8f4ed" }}>
        {/* SINISTRA: Art / Pro */}
        {(() => {
          const fg = mode === "professional" ? "#f8f4ed" : "#000000";
          let artColor, proColor;
          if (hoverMode === "artwork") {
            artColor = "#c8102e"; proColor = fg;
          } else if (hoverMode === "professional") {
            proColor = "#c8102e"; artColor = fg;
          } else {
            artColor = mode === "artwork" ? "#c8102e" : fg;
            proColor = mode === "professional" ? "#c8102e" : fg;
          }
          return (
            <div className="flex items-center gap-2 text-[20px]">
              <button
                onClick={() => handleModeSwitch("artwork")}
                onMouseEnter={() => setHoverMode("artwork")}
                onMouseLeave={() => setHoverMode(null)}
                className="cursor-pointer transition-colors duration-300"
                style={{ color: artColor }}
              >Art</button>
              <span className="px-1">/</span>
              <button
                onClick={() => handleModeSwitch("professional")}
                onMouseEnter={() => setHoverMode("professional")}
                onMouseLeave={() => setHoverMode(null)}
                className="cursor-pointer transition-colors duration-300"
                style={{ color: proColor }}
              >Pro</button>
            </div>
          );
        })()}

        {/* CENTRO: Pallino sempre — porta alla landing */}
        {(() => {
          const navColor = mode === "professional" ? "#f8f4ed" : "#000000";
          return (
            <button
              onClick={() => router.push("/")}
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer dot-nav ${mode === "professional" ? "w-[12px] h-[12px]" : "w-[13px] h-[13px]"}`}
              style={{ backgroundColor: navColor }}
              aria-label="Torna alla landing"
            />
          );
        })()}

        {/* DESTRA: Home, About, Email */}
        <nav className="text-[20px]">
          <span className="cursor-pointer transition-colors hover-red" onClick={() => {
            navHistoryRef.current = [];
            router.push(basePath, undefined, { shallow: true });
          }}>{S.LABEL_HOME}</span>
          <span>,</span><span className="inline-block w-[0.6em]" />
          <span className="cursor-pointer transition-colors hover-red" onClick={() => {
            if (selectedProject && selectedProject.name !== "About") {
              navHistoryRef.current.push(currentSlug);
            }
            router.push(`${basePath}?p=about`, undefined, { shallow: true });
          }}>{S.LABEL_ABOUT}</span>
          <span>,</span><span className="inline-block w-[0.6em]" />
          <span className="cursor-pointer transition-colors hover-red" onClick={() => setShowContact(true)}>{S.LABEL_EMAIL}</span>
        </nav>
      </header>



      {/* BANNER — riempie il viewport sotto l'header */}
      {selectedProject && selectedProject.name !== "About" && selectedProject.images?.length > 0 && (
        <section key={`banner-${currentSlug}`} className="w-full relative project-banner" style={{ height: 'calc(100vh - var(--header-h, 80px) + 3rem + 80px)' }}>
          <TopRotator
            images={selectedProject.images}
            alt={selectedProject.name || ""}
            className="relative w-full h-full overflow-hidden bg-black"
            interval={4000}
            fadeMs={2500}
            zoomMs={7000}
            priorityFirst
          />
          <div className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-b from-black/55 via-black/65 to-black/80" />
          {/* Sfumatura leggera in basso */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0"
            style={{
              zIndex: 45,
              height: 'calc(2rem + 70px)',
              background: "linear-gradient(to top, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
              opacity: bannerFadeOpacity,
              transition: "opacity 250ms ease-out",
            }}
          />
          {/* Titolo — stessa posizione di About: items-end, mb-8 */}
          <div className="absolute inset-0 z-50 flex items-end px-6 md:px-12" style={{ bottom: "80px" }}>
            <div className="mb-8 space-y-0 leading-tight">
              <h2 className="banner-title text-white text-4xl md:text-6xl font-extrabold leading-[1.1] drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)]">
                {selectedProject.name}
              </h2>
              {selectedProject.titleExtra?.map((line, i) => (
                <h2 key={i} className="banner-title text-white text-4xl md:text-6xl font-extrabold leading-[1.1] drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)]">
                  {line}
                </h2>
              ))}
              {selectedProject.datePlace && (
                <p className="banner-title text-4xl md:text-6xl font-extrabold leading-[1.1] drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)]" style={{ color: "#c8102e" }}>
                  {selectedProject.datePlace}
                </p>
              )}
            </div>
          </div>
          {/* Chevron — centrata nello spazio extra (80px) in fondo al banner */}
          {(selectedProject.description || selectedProject.techData) && (
            <div
              className="absolute left-0 right-0 bottom-0 z-50 flex flex-col items-center justify-center cursor-pointer select-none project-chevron-wrap"
              style={{ height: "80px" }}
              onClick={() => setTextOpen((v) => !v)}
            >
              {!textOpen && (
                <span className="project-chevron-label text-xs tracking-wide text-white/70" style={{ marginBottom: "2px", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                  Scopri di più
                </span>
              )}
              <svg
                className={`project-chevron ${textOpen ? "project-chevron--open" : ""}`}
                width="36" height="36" viewBox="0 0 24 24" fill="none"
                style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))" }}
              >
                <polyline
                  points="6 9 12 15 18 9"
                  className="project-chevron__stroke"
                  stroke="white"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </section>
      )}

      {/* CONTENUTO PROGETTO — chevron toggle testo sotto banner, poi galleria, poi footer */}
      {selectedProject && selectedProject.name !== "About" ? (
        <div key={`project-${currentSlug}`} className="w-full">
          {/* Blocco testo — si rivela al click della chevron nel banner */}
          {(selectedProject.description || selectedProject.techData) && (
            <div style={{ paddingLeft: "8%", paddingRight: "8%" }}>
              {/* Contenuto testo — si rivela al click */}
              <div className={`project-text-reveal__content ${textOpen ? "project-text-reveal__content--open" : ""} ${mode === "professional" ? "text-white/70" : "text-black/60"}`}>
                <div className="flex flex-col md:flex-row pt-12 pb-4" style={{ gap: "4%" }}>
                  {/* Descrizione — blocco unico */}
                  {selectedProject.description && (
                    <div className="flex-1 min-w-0">
                      <p className="leading-relaxed whitespace-pre-line project-text text-base" lang="it">
                        {selectedProject.description}
                      </p>
                    </div>
                  )}
                  {/* Micro colonna: dati tecnici in alto, copyright in basso */}
                  <div className="md:w-[180px] shrink-0 mt-6 md:mt-0 flex flex-col justify-between">
                    {/* Dati tecnici in alto */}
                    {selectedProject.techData && (
                      <div className={`text-xs leading-relaxed space-y-3 ${mode === "professional" ? "text-white/40" : "text-black/35"}`}>
                        {selectedProject.techData.camera && (
                          <div>
                            <div className="uppercase tracking-wider font-semibold mb-0.5" style={{ fontSize: "9px" }}>Camera</div>
                            <div>{selectedProject.techData.camera}</div>
                          </div>
                        )}
                        {selectedProject.techData.ottica && (
                          <div>
                            <div className="uppercase tracking-wider font-semibold mb-0.5" style={{ fontSize: "9px" }}>Ottica</div>
                            <div>{selectedProject.techData.ottica}</div>
                          </div>
                        )}
                        {selectedProject.techData.luce && (
                          <div>
                            <div className="uppercase tracking-wider font-semibold mb-0.5" style={{ fontSize: "9px" }}>Luce</div>
                            <div>{selectedProject.techData.luce}</div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Copyright in basso */}
                    <div className={`text-xs leading-relaxed mt-6 ${mode === "professional" ? "text-white/40" : "text-black/35"}`}>
                      <div>Alfredo Enrico Iacobucci</div>
                      <div>© {new Date().getFullYear()} Tutti i diritti riservati.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Gallery — margini 8% come About */}
          <div className="pt-8 pb-4" style={{ paddingLeft: "8%", paddingRight: "8%" }}>
            <JustifiedGallery
              images={selectedProject.images || []}
              onImageClick={(i) => {
                setViewerIndex(i);
                setViewerOpen(true);
                if (selectedProject?.images?.[i]) {
                  trackPhoto(selectedProject.images[i], mode === "professional" ? "pro" : "art");
                }
              }}
            />
          </div>
          {/* Margine sotto la galleria */}
          <div style={{ height: "2rem" }} />
        </div>
      ) : selectedProject && selectedProject.name === "About" ? (
        <>
          {/* VIDEO — letto da content/about/ */}
          <section key="about-video" className="w-full relative about-video-section" style={{ height: 'calc(100vh - var(--header-h, 80px) + 3rem)' }}>
            <div className={`relative w-full h-full overflow-hidden flex items-center justify-center ${mode === "professional" ? "bg-black" : "bg-neutral-100"}`}>
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
            <div className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-b from-black/55 via-black/65 to-black/80" />
            <div className="absolute inset-0 z-40 flex items-end px-6 md:px-12">
              <div className="mb-8 space-y-0 leading-tight">
                <h2 className="banner-title text-white text-4xl md:text-6xl font-extrabold leading-[1.1] drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)]">
                  About
                </h2>
              </div>
            </div>
          </section>

          {/* CONTENUTO ABOUT */}
          <div key="about" className="w-full fade-in" style={{ animationDuration: '400ms' }}>
            {/* TESTO IN DUE COLONNE — margini laterali uguali, gap centrale più piccolo, centrato sulla metà pagina */}
            <div className={`w-full about-text-section ${mode === "professional" ? "text-white" : "text-black"}`} style={{ paddingLeft: '8%', paddingRight: '8%', paddingTop: '3rem', paddingBottom: '2.5rem' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 text-base leading-relaxed" style={{ gap: '4%' }} lang="it">
                <p className="whitespace-pre-line project-text">{selectedProject.description}</p>
                <p className="whitespace-pre-line project-text">{selectedProject.description2 || ""}</p>
              </div>
            </div>

            {/* CONTATTI — stessi margini del testo, distribuiti: sx, centro, dx */}
            <div className={`w-full text-xs md:text-sm ${mode === "professional" ? "text-white/60" : "text-black/50"}`} style={{ paddingLeft: '8%', paddingRight: '8%', paddingTop: '0', paddingBottom: '2.5rem' }}>
              <div className="flex items-center justify-between">
                <span className="transition-colors duration-300 hover:text-[#c8102e] cursor-default">Telefono: <a href={`tel:${S.TELEFONO.replace(/\s/g, "")}`} className="underline">{S.TELEFONO}</a></span>
                <span className="transition-colors duration-300 hover:text-[#c8102e] cursor-default">Email: <a href={`mailto:${S.EMAIL_DESTINATARIO}`} className="underline">{S.EMAIL_DESTINATARIO}</a></span>
                <span className="transition-colors duration-300 hover:text-[#c8102e] cursor-default">Instagram: <a href={S.LINK_INSTA} target="_blank" rel="noopener noreferrer" className="underline">{S.INSTAGRAM_HANDLE}</a></span>
              </div>
            </div>

            {/* BLOCCO SEPARATORE — nero in artwork, bianco in professional.
                Spaziature uguali: sopra la citazione, tra citazione e foto, sotto la foto. */}
            <div className={`w-full about-quote-block ${mode === "professional" ? "bg-white" : "bg-[#0a0a0a]"}`} style={{ paddingTop: "6rem", paddingBottom: "6rem" }}>
              {/* CITAZIONE — letta da content/about/citazione.txt */}
              {selectedProject.quote && (
                <div className="w-full max-w-5xl mx-auto px-6 md:px-12 text-center">
                  <div className="text-5xl md:text-7xl font-extrabold leading-none -mb-2" style={{ color: "#c8102e" }}>&ldquo;&rdquo;</div>
                  <blockquote className="text-2xl md:text-4xl lg:text-5xl font-extrabold uppercase leading-tight tracking-tight" style={{ color: "#c8102e" }}>
                    {selectedProject.quote}
                  </blockquote>
                </div>
              )}

              {/* FOTO 3:2 — stessi margini laterali del testo (8%) */}
              <div className="w-full about-photo-wrap" style={{ marginTop: "6rem", paddingLeft: "8%", paddingRight: "8%" }}>
                <div className={`w-full about-photo overflow-hidden flex items-center justify-center ${mode === "professional" ? "bg-neutral-100" : "bg-neutral-900"}`} style={{ aspectRatio: "3/2" }}>
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
        <div key="home" className="w-full relative">
          <div className="flex flex-col gap-0 p-0">
            {projectsWithSlug.map((project, index) => (
              <div
                key={project.slug}
                className={`w-full ${mode === "professional" ? "border-t-[2.5px] border-b-[2.5px] border-white" : "border-t-4 border-b-4 border-black"} min-h-[1vh] flex items-center overflow-hidden`}
              >
                <div className={`marquee-track ${(mode === "artwork" ? (index % 2 === 1) : (index % 2 === 0)) ? "reverse" : ""}`}>
                  <span
                    className="marquee-seq"
                    onClick={() => router.push(hrefProject(project.slug), undefined, { shallow: true })}
                  >
                    {Array(20).fill(`${[project.name, ...(project.titleExtra || []), project.datePlace].filter(Boolean).join(" - ")} |`).join(" ")}
                  </span>
                  <span
                    className="marquee-seq"
                    aria-hidden="true"
                    onClick={() => router.push(hrefProject(project.slug), undefined, { shallow: true })}
                  >
                    {Array(20).fill(`${[project.name, ...(project.titleExtra || []), project.datePlace].filter(Boolean).join(" - ")} |`).join(" ")}
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
                : "linear-gradient(to top, #f8f4ed 0%, rgba(248,244,237,0.35) 40%, transparent 100%)",
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
          className="fixed inset-0 z-[200] flex flex-col bg-black/95 fade-in py-2"
          style={{ animationDuration: '250ms' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewerOpen(false);
          }}
        >
          {/* Title bar */}
          <div className="w-full flex items-center justify-center h-[44px] shrink-0 pointer-events-none">
            <span className="text-white text-sm font-semibold text-center px-4 whitespace-nowrap">
              {[selectedProject?.name, ...(selectedProject?.titleExtra || []), selectedProject?.datePlace].filter(Boolean).join(" ")}
            </span>
          </div>

          {/* Image area — swipe support for mobile */}
          <div className="relative flex-1 w-full flex items-center justify-center min-h-0"
            onTouchStart={(e) => { e.currentTarget._swipeX = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              const startX = e.currentTarget._swipeX;
              if (startX == null) return;
              const endX = e.changedTouches[0].clientX;
              const diff = startX - endX;
              if (Math.abs(diff) > 50) {
                if (diff > 0) {
                  setViewerIndex((prev) => (prev + 1) % selectedProject.images.length);
                } else {
                  setViewerIndex((prev) => (prev - 1 + selectedProject.images.length) % selectedProject.images.length);
                }
              }
            }}
          >
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
              className="max-w-[95vw] max-h-full w-auto h-auto object-contain shadow-2xl select-none"
            />
          </div>

          {/* Close button */}
          <div className="w-full flex items-center justify-center h-[44px] shrink-0">
            <button
              className="text-white text-4xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)] hover:scale-110 transition-all hover-red z-10"
              onClick={() => setViewerOpen(false)}
              aria-label="Chiudi visualizzazione"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className={`w-full py-12 mobile-footer ${mode === "professional" ? "border-t-[2.5px]" : "border-t-4"} text-center text-sm font-bold space-y-2`} style={{ borderColor: mode === "professional" ? "#f8f4ed" : "#000000" }}>
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
