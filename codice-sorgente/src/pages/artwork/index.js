// pages/artwork/index.js
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import Modal from "@/components/Modal";
import Seo from "@/components/Seo";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { readJSON, readStrings } from "@/lib/contenuti";
import { fallbackToOriginal, preview } from "@/lib/images";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useTrackPageView, useTrackPhoto, trackContact } from "@/lib/useAnalytics";
const TopRotator = dynamic(() => import("../../components/TopRotator"), { ssr: false });

// I contenuti (testi progetti + about) vengono ora letti da un unico file:
// public/projects/contenuti.json (editabile con _editor.html)

export async function getStaticProps() {
  // ISR: pagina pre-generata, servita dalla CDN, rigenerata ogni 60s in background.
  // Molto più veloce di getServerSideProps (zero attesa server ad ogni navigazione).

  // ---- contenuti.json è l'UNICA fonte dati ----
  const contenuti = readJSON("contenuti.json", { projects: [], aboutArt: {}, aboutPro: {}, aboutShared: {} });

  // ---- PROGETTI: tutto da contenuti.json, zero accesso al filesystem immagini ----
  const projects = (contenuti.projects || []).map((data) => {
    const id = `${data.section}/${data.slug}`;

    const titleRaw = (data.titolo || "").trim();
    const titleLines = titleRaw.split("\n").map((l) => l.trim()).filter(Boolean);
    const titleParts = titleLines.length > 1 ? titleLines.slice(0, -1) : titleLines;
    const title = titleParts[0] || "";
    const titleExtra = titleParts.slice(1);
    const datePlace = titleLines.length > 1 ? titleLines[titleLines.length - 1] : "";
    // Gli a capo nel testo sono rispettati 1:1 (pre-line nel rendering)
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

    // Esposizioni (solo per progetti art)
    const esposizioni = Array.isArray(data.esposizioni) ? data.esposizioni : [];
    const section = data.section || "";

    // Lista file dall'array ordine in contenuti.json (già ordinata)
    const files = (data.ordine || []);
    // Dimensioni pre-calcolate da contenuti.json
    const dims = data.dimensioni || {};
    const images = files.map((f) => ({
      src: `/projects/${id}/${f}`,
      w: dims[f] ? dims[f].w : 1000,
      h: dims[f] ? dims[f].h : 667,
    }));

    let bannerStartIndex = 0;
    if (banner && files.length > 0) {
      const idx = files.findIndex((f) => f.toLowerCase() === banner.toLowerCase());
      bannerStartIndex = idx >= 0 ? idx : 0;
    }

    // Indice anteprima hover (campo "anteprima" in contenuti.json, fallback a banner)
    const anteprimaFile = (data.anteprima || "").trim();
    let anteprimaIndex = bannerStartIndex; // default: usa banner
    if (anteprimaFile && files.length > 0) {
      const aIdx = files.findIndex((f) => f.toLowerCase() === anteprimaFile.toLowerCase());
      if (aIdx >= 0) anteprimaIndex = aIdx;
    }

    // Posizione focale anteprima (default: center 33%)
    const anteprimaPosizione = data.anteprimaPosizione || { x: 50, y: 33 };

    return { id, name: title || id, titleExtra, datePlace, description, images, bannerStartIndex, anteprimaIndex, anteprimaPosizione, techData, esposizioni, section };
  });

  // ---- ABOUT: doppio (art + pro) con campi condivisibili ----
  const aboutArtRaw = contenuti.aboutArt || contenuti.about || {};
  const aboutProRaw = contenuti.aboutPro || contenuti.about || {};
  const shared = contenuti.aboutShared || {};

  function buildAbout(data, fallback) {
    const text = (shared.text ? fallback : data).text || "";
    const quote = (shared.quote ? fallback : data).quote || "";
    const photoField = (shared.photo ? fallback : data).photo || "";
    const videoField = (shared.video ? fallback : data).video || "";
    const aboutText = text.trim();
    const aboutQuote = quote.trim();
    const aboutPhoto = photoField ? `/projects/about/${photoField}` : "";
    const aboutVideo = videoField ? `/projects/about/${videoField}` : "";
    // Split testo in due colonne
    let col1 = aboutText, col2 = "";
    if (aboutText.includes("---")) {
      const parts = aboutText.split("---");
      col1 = parts[0].trim();
      col2 = parts.slice(1).join("---").trim();
    } else if (aboutText) {
      const sentences = aboutText.split(/(?<=\.)\s+/);
      const targetLen = Math.ceil(aboutText.length * 0.58);
      let accum = 0, splitIdx = sentences.length;
      for (let i = 0; i < sentences.length; i++) {
        accum += sentences[i].length;
        if (accum >= targetLen) { splitIdx = i + 1; break; }
      }
      col1 = sentences.slice(0, splitIdx).join(" ");
      col2 = sentences.slice(splitIdx).join(" ");
    }
    return { text: col1, text2: col2, quote: aboutQuote, photo: aboutPhoto, video: aboutVideo };
  }
  const aboutArt = buildAbout(aboutArtRaw, aboutArtRaw);
  const aboutPro = buildAbout(aboutProRaw, aboutArtRaw);

  // ---- STRINGHE: parser condiviso con la landing (lib/contenuti) ----
  const strings = readStrings();

  return {
    props: {
      projects,
      aboutArt,
      aboutPro,
      strings,
      aspetto: contenuti.aspetto || {},
    },
    revalidate: 60, // ISR: rigenera ogni 60 secondi
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
    ? "w-full bg-transparent border-b border-white/30 text-white placeholder-white/55 py-3 focus:outline-none focus:border-white transition-colors"
    : "w-full bg-transparent border-b border-black/20 text-black placeholder-black/55 py-3 focus:outline-none focus:border-black transition-colors";
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
      <input name="contact-name" type="text" autoComplete="name" aria-label={S.PLACEHOLDER_NOME || "Nome e Cognome"} placeholder={S.PLACEHOLDER_NOME || "Nome e Cognome"} className={inputCls} required />
      <input name="contact-email" type="email" autoComplete="email" aria-label={S.PLACEHOLDER_EMAIL || "La tua email"} placeholder={S.PLACEHOLDER_EMAIL || "La tua email"} className={inputCls} />
      <textarea name="contact-message" aria-label={S.PLACEHOLDER_MESSAGGIO || "Il tuo messaggio"} placeholder={S.PLACEHOLDER_MESSAGGIO || "Il tuo messaggio"} className={`${inputCls} resize-none`} rows={5} required />
      {error && (
        <p role="alert" style={{ color: "var(--error)", fontSize: "var(--text-xs)" }}>{error}</p>
      )}
      <button type="submit" className={btnCls} disabled={sending} aria-busy={sending}>
        {sending ? (S.TASTO_INVIO_IN_CORSO || "Invio in corso…") : (S.TASTO_INVIA || "Invia")}
      </button>
    </form>
  );
}

/* ============================================================
   JustifiedGallery — mosaico omogeneo.
   Ogni riga ha MINIMO 2 foto. Se ne avanza 1, viene assorbita
   dalla riga precedente. Tutte le righe riempiono la larghezza.
   ============================================================ */
function JustifiedGallery({ images = [], onImageClick, altFor }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
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

  // Use server-provided dimensions — no client-side image loading needed
  const dims = useMemo(() => {
    if (!images.length) return [];
    return images.map((img, i) => ({
      src: typeof img === "string" ? img : img.src,
      ratio: typeof img === "string" ? 1.5 : (img.w / img.h),
      idx: i,
    }));
  }, [images]);

  const rows = useMemo(() => {
    if (!dims.length || containerWidth <= 0) return [];
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
                className="group relative overflow-hidden cursor-zoom-in flex-shrink-0"
                style={{ width: `${w}px`, height: `${row.height}px` }}
                onClick={() => onImageClick?.(item.idx)}
                aria-label={`Apri immagine ${item.idx + 1} a schermo intero`}
              >
                <Image src={item.src} alt={altFor ? altFor(item.idx) : ""}
                  fill
                  sizes={`${Math.round(w)}px`}
                  quality={80}
                  loading={ri < 2 ? "eager" : "lazy"}
                  className="object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200" />
                {/* Prima qui compariva la scritta "visualizza a schermo
                    intero" centrata su OGNI foto: su un mosaico di tre per
                    riga era rumore. Una lente in un angolo dice la stessa
                    cosa senza coprire l'immagine (il cursore è già zoom-in). */}
                <div className="pointer-events-none absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.8))" }} aria-hidden>
                    <circle cx="11" cy="11" r="7" />
                    <line x1="16.5" y1="16.5" x2="21" y2="21" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function Portfolio({ projects, aboutArt = {}, aboutPro = {}, strings = {}, aspetto: aspettoRaw = {} }) {
  // Aspetto: valori personalizzabili dal Manager con fallback ai defaults
  const ASP = {
    colorBgArtwork: "#f8f4ed", colorBgProfessional: "#0a0a0a",
    colorAccent: "#c8102e", colorTextArtwork: "#0a0a0a", colorTextProfessional: "#f8f4ed",
    fontFamily: "Inter", fontSizeBase: "16", fontSizeTitolo: "28", fontWeightTitolo: "800", lineHeight: "1.625",
    marginLaterale: "8", gapColonne: "4",
    bannerHeight: "100", bannerOverlayOpacity: "65",
    galleriaMarginTop: "3", galleriaMarginBottom: "3", galleriaRowHeight: "280", galleriaGap: "6",
    aboutVideoHeight: "100", aboutQuotePadding: "6", aboutPhotoAspect: "3/2",
    headerPaddingY: "14", headerFontSize: "12",
    marqueeFontSize: "7", marqueeSpeed: "normal",
    viewerBgOpacity: "95", viewerImageQuality: "85",
    ...aspettoRaw,
  };
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
  const reducedMotion = useReducedMotion();

  // Mode come stato locale — niente round-trip SSR al cambio Art/Pro
  const [mode, setMode] = useState(
    () => (typeof window !== "undefined" && window.location.pathname.startsWith("/professional")) || router.pathname.startsWith("/professional") ? "professional" : "artwork"
  );
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
  // Prima questo effect non aveva array di dipendenze: girava a ogni render
  // leggendo offsetHeight (forced layout) e riscrivendo una custom property.
  // Con lo scroll che aggiorna tre stati era layout thrashing continuo.
  // Ora misura al mount e solo quando l'header cambia davvero dimensione.
  const headerRef = useRef(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = () => {
      document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ===== HEADER AUTO-HIDE su progetto e about =====
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);

  // ===== CAMBIO MODO: semplice fade out → naviga → fade in =====
  const navigatingRef = useRef(false);
  const pageRef = useRef(null);

  const handleModeSwitch = (targetMode) => {
    if (targetMode === mode || navigatingRef.current) return;
    navigatingRef.current = true;
    const isAbout = router.query?.p === "about";
    const target = isAbout ? `/${targetMode}?p=about` : `/${targetMode}`;

    // Fade out il contenuto
    if (pageRef.current) {
      pageRef.current.style.transition = "opacity 200ms ease-out";
      pageRef.current.style.opacity = "0";
    }
    setTimeout(() => {
      // Cambio mode locale (istantaneo, niente SSR round-trip)
      setMode(targetMode);
      if (isAbout) {
        const ab = targetMode === "professional" ? aboutPro : aboutArt;
        setSelectedProject({
          name: "About",
          description: ab.text || "",
          description2: ab.text2 || "",
          quote: ab.quote || "",
          photo: ab.photo || "",
          video: ab.video || "",
        });
      } else {
        setSelectedProject(null);
      }
      setViewerOpen(false);
      setTextOpen(false);
      window.scrollTo(0, 0);
      // Aggiorna URL senza ricaricare (shallow = no getServerSideProps)
      router.replace(target, undefined, { shallow: true });
      // Fade in
      requestAnimationFrame(() => {
        if (pageRef.current) {
          pageRef.current.style.transition = "opacity 200ms ease-in";
          pageRef.current.style.opacity = "1";
        }
      });
      navigatingRef.current = false;
    }, 210);
  };

  // Hover sui label
  const [hoverMode, setHoverMode] = useState(null);

  // Preload banner su hover (debounced)
  const hoverTimerRef = useRef(null);
  const preloadedSlugsRef = useRef(new Set());

  // Banner scroll verticale: scorre dall'alto al basso durante hover
  // Se si ritorna entro 5s, riprende da dove era rimasto
  const bannerScrollRef = useRef({}); // { [slug]: { position: 0-100, leaveTime } }
  const bannerRafRef = useRef(null);
  const activeBannerSlugRef = useRef(null);

  const startBannerScroll = useCallback((slug) => {
    // Animazione guidata da JS: il blocco @media in globals.css non la copre,
    // quindi la condizione va controllata qui.
    if (reducedMotion) return;
    activeBannerSlugRef.current = slug;
    // Determina start/end dal data attribute (verticale vs orizzontale)
    const el = document.querySelector(`[data-banner-slug="${slug}"]`);
    const isVert = el?.dataset.bannerVertical === "1";
    const START_POS = isVert ? 40 : 33;
    const END_POS = 66; // Rimane nel secondo terzo
    const state = bannerScrollRef.current[slug] || { position: START_POS, leaveTime: 0 };
    if (state.leaveTime && Date.now() - state.leaveTime > 5000) state.position = START_POS;
    bannerScrollRef.current[slug] = state;
    let lastTime = performance.now();
    const RANGE = END_POS - START_POS;
    const SPEED = RANGE / 12; // Percorre il range in 12s
    let fading = false;
    const animate = (time) => {
      if (activeBannerSlugRef.current !== slug) return;
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      const s = bannerScrollRef.current[slug];
      const imgEl = document.querySelector(`[data-banner-slug="${slug}"]`);
      // Scorre sempre, anche durante la dissolvenza
      s.position += SPEED * dt;
      if (s.position >= END_POS && !fading) {
        // Dissolvenza: fade out → reset position → fade in (scroll continua)
        fading = true;
        if (imgEl) {
          imgEl.style.transition = "opacity 0.4s ease";
          imgEl.style.opacity = "0";
        }
        setTimeout(() => {
          s.position = START_POS;
          if (imgEl) {
            imgEl.style.objectPosition = `center ${START_POS}%`;
            imgEl.style.opacity = "1";
          }
          setTimeout(() => { fading = false; if (imgEl) imgEl.style.transition = ""; }, 400);
        }, 400);
      }
      if (imgEl && !fading) imgEl.style.objectPosition = `center ${s.position}%`;
      bannerRafRef.current = requestAnimationFrame(animate);
    };
    bannerRafRef.current = requestAnimationFrame(animate);
  }, [reducedMotion]);

  const stopBannerScroll = useCallback(() => {
    const slug = activeBannerSlugRef.current;
    if (slug && bannerScrollRef.current[slug]) {
      bannerScrollRef.current[slug].leaveTime = Date.now();
    }
    activeBannerSlugRef.current = null;
    if (bannerRafRef.current) cancelAnimationFrame(bannerRafRef.current);
  }, []);

  // Preload + scroll — chiamato da hover (desktop) e tap (mobile)
  const preloadAndScroll = useCallback((project) => {
    if (!preloadedSlugsRef.current.has(project.slug)) {
      preloadedSlugsRef.current.add(project.slug);
      const bannerImg = project.images?.[project.anteprimaIndex ?? project.bannerStartIndex ?? 0] || project.images?.[0];
      if (bannerImg) { const i = new window.Image(); i.src = bannerImg.src; }
    }
    startBannerScroll(project.slug);
  }, [startBannerScroll]);

  // Desktop only: hover apre anteprima (su touch è gestito dal tap)
  const onRowHover = useCallback((project) => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouch) return; // Su mobile il hover viene ignorato, si usa solo il tap
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => preloadAndScroll(project), 50);
  }, [preloadAndScroll]);
  const onRowLeave = useCallback(() => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;
    clearTimeout(hoverTimerRef.current);
    stopBannerScroll();
  }, [stopBannerScroll]);

  // Mobile: primo tap → anteprima (classe "active"), secondo tap → naviga
  // Reset quando si arriva alla pagina (da landing o navigazione)
  const [activeRowSlug, setActiveRowSlug] = useState(null);

  // Chiudi anteprima toccando fuori dalle righe (mobile)
  useEffect(() => {
    if (!activeRowSlug) return;
    const onTouchOutside = (e) => {
      if (!e.target.closest(".marquee-row")) {
        setActiveRowSlug(null);
        stopBannerScroll();
      }
    };
    document.addEventListener("touchstart", onTouchOutside, { passive: true });
    return () => document.removeEventListener("touchstart", onTouchOutside);
  }, [activeRowSlug, stopBannerScroll]);

  // Reset activeRowSlug quando si cambia progetto o si torna alla home
  useEffect(() => {
    setActiveRowSlug(null);
    stopBannerScroll();
  }, [selectedProject, stopBannerScroll]);

  // La navigazione la fa <Link>. Qui resta solo la logica touch:
  // primo tap mostra l'anteprima (e blocca il link), secondo tap lascia
  // passare la navigazione.
  const onRowClick = (project, e) => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouch) return;
    if (activeRowSlug === project.slug) {
      setActiveRowSlug(null);
      return;
    }
    e.preventDefault();
    setActiveRowSlug(project.slug);
    preloadAndScroll(project);
  };

  // ===== VIEWER: SOLO STATE LOCALE, NIENTE URL SYNC =====
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // ===== TOGGLE BLOCCO TESTO SOTTO BANNER =====
  const [textOpen, setTextOpen] = useState(false);

  // Larghezza minima della riga testo basata sulla risoluzione dello schermo,
  // così il testo non cambia i punti di wrap quando la finestra si riduce.
  const [textRowMinW, setTextRowMinW] = useState(0);
  useEffect(() => {
    const sw = window.screen.width;
    const ml = parseFloat(ASP.marginLaterale) || 8;
    setTextRowMinW(Math.round(sw * (1 - 2 * ml / 100)));
  }, [ASP.marginLaterale]);

  const [bannerIndex, setBannerIndex] = useState(0);
  const [prevBannerIndex, setPrevBannerIndex] = useState(null);
  const timerRef = useRef(null);

  // L'ordine dei progetti viene da contenuti.json (preservato da getServerSideProps).
  // Filtriamo per sezione (art/ o pro/) in base al modo corrente.
  const modePrefix = mode === "artwork" ? "art/" : "pro/";

  const projectsWithSlug = useMemo(() => {
    return (projects || [])
      .filter((p) => p.id.startsWith(modePrefix))
      .map((p) => ({ ...p, slug: slugify(p.name) }));
  }, [projects, modePrefix]);

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
        const ab = mode === "professional" ? aboutPro : aboutArt;
        setSelectedProject({
          name: "About",
          description: ab.text || "",
          description2: ab.text2 || "",
          quote: ab.quote || "",
          photo: ab.photo || "",
          video: ab.video || "",
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

  /* Titolo leggibile del progetto, usato per alt text e <title>.
     Prima ogni foto aveva alt="": corretto per immagini decorative, ma qui le
     foto SONO il contenuto, quindi vanno descritte. */
  const projectLabel = useMemo(
    () =>
      selectedProject
        ? [selectedProject.name, ...(selectedProject.titleExtra || []), selectedProject.datePlace]
            .filter(Boolean)
            .join(" — ")
        : "",
    [selectedProject]
  );

  const viewerAlt = useCallback(
    (idx) => `${projectLabel} — foto ${idx + 1} di ${selectedProject?.images?.length ?? 0}`,
    [projectLabel, selectedProject]
  );

  /* Finestra di immagini montate nel viewer: corrente ±2. */
  const viewerWindow = useMemo(() => {
    const imgs = selectedProject?.images;
    if (!viewerOpen || !imgs?.length) return [];
    const total = imgs.length;
    const seen = new Set();
    const out = [];
    for (let o = -2; o <= 2; o++) {
      const idx = (viewerIndex + o + total) % total;
      if (seen.has(idx)) continue; // gallerie con meno di 5 foto
      seen.add(idx);
      out.push({ idx, src: imgs[idx]?.src || imgs[idx], isCurrent: idx === viewerIndex });
    }
    return out;
  }, [viewerOpen, viewerIndex, selectedProject]);

  // Gradiente bottom home: opacità basata sulla distanza dal fondo della pagina
  const [gradientOpacity, setGradientOpacity] = useState(1);

  // Gradiente bottom banner: svanisce appena si scrolla
  const [bannerFadeOpacity, setBannerFadeOpacity] = useState(1);

  // ===== SCROLL UNIFICATO con rAF throttle =====
  const rafRef = useRef(null);
  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const y = window.scrollY;
        // Header auto-hide
        if (selectedProject) {
          setHeaderHidden(y > lastScrollY.current && y > 48);
        }
        // Banner fade
        if (selectedProject && selectedProject.name !== "About") {
          setBannerFadeOpacity(Math.min(1, Math.max(0, 1 - y / 150)));
        }
        // Gradient home
        if (isHome) {
          const distFromBottom = document.documentElement.scrollHeight - y - window.innerHeight;
          setGradientOpacity(Math.min(1, Math.max(0, distFromBottom / 200)));
        }
        lastScrollY.current = y;
      });
    };
    if (!selectedProject && !isHome) {
      setHeaderHidden(false);
      setBannerFadeOpacity(1);
      setGradientOpacity(0);
      return;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [selectedProject, isHome]);

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

  // Metadati: dipendono dal progetto aperto, così ogni URL condivisa
  // mostra titolo e anteprima propri invece di restare anonima.
  const seo = useMemo(() => {
    const sezione = mode === "professional" ? "Professional" : "Artwork";
    if (selectedProject && selectedProject.name === "About") {
      return {
        title: `About ${sezione}`,
        description: (selectedProject.description || "").slice(0, 200),
        image: selectedProject.photo || undefined,
        path: `/${mode}?p=about`,
      };
    }
    if (selectedProject) {
      const cover = selectedProject.images?.[selectedProject.bannerStartIndex || 0]?.src;
      return {
        title: projectLabel,
        description: (selectedProject.description || "").slice(0, 200) || undefined,
        image: cover,
        path: `/${mode}?p=${currentSlug}`,
      };
    }
    return { title: sezione, path: `/${mode}` };
  }, [mode, selectedProject, projectLabel, currentSlug]);

  return (
    <div ref={pageRef} className="min-h-screen flex flex-col items-center fade-in" style={{ animationDuration: '300ms', backgroundColor: mode === "professional" ? ASP.colorBgProfessional : ASP.colorBgArtwork, color: mode === "professional" ? ASP.colorTextProfessional : ASP.colorTextArtwork }}>
      <Seo title={seo.title} description={seo.description} image={seo.image} path={seo.path} />
      {/* Skip link: primo elemento focusabile, salta header e banner */}
      <a href="#contenuto" className="skip-link">Vai al contenuto</a>
      {/* HEADER */}
      <header ref={headerRef} className={`w-full flex justify-between items-center py-[2.2rem] px-4 ${mode === "professional" ? "border-b-[2.5px]" : "border-b-4"} text-[15px] font-bold relative`} style={{ borderColor: mode === "professional" ? ASP.colorTextProfessional : ASP.colorTextArtwork, backgroundColor: mode === "professional" ? ASP.colorBgProfessional : ASP.colorBgArtwork }}>
        {/* SINISTRA: Art / Pro */}
        {(() => {
          const fg = mode === "professional" ? ASP.colorTextProfessional : ASP.colorTextArtwork;
          let artColor, proColor;
          if (hoverMode === "artwork") {
            artColor = ASP.colorAccent; proColor = fg;
          } else if (hoverMode === "professional") {
            proColor = ASP.colorAccent; artColor = fg;
          } else {
            artColor = mode === "artwork" ? ASP.colorAccent : fg;
            proColor = mode === "professional" ? ASP.colorAccent : fg;
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
          const navColor = mode === "professional" ? ASP.colorTextProfessional : ASP.colorTextArtwork;
          return (
            <button
              onClick={() => router.push("/")}
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer dot-nav ${mode === "professional" ? "w-[12px] h-[12px]" : "w-[13px] h-[13px]"}`}
              style={{ backgroundColor: navColor }}
              aria-label="Torna alla landing"
            />
          );
        })()}

        {/* DESTRA: Home, About, Email
            Erano <span onClick>: non focusabili col Tab, non attivabili da
            tastiera e non annunciati come link. Home e About sono navigazione
            vera, quindi diventano <Link>; Email apre una modale, quindi
            <button>. */}
        <nav className="text-[20px]" aria-label="Navigazione principale">
          <Link
            href={basePath}
            shallow
            className="cursor-pointer transition-colors hover-red"
            onClick={() => { navHistoryRef.current = []; }}
          >{S.LABEL_HOME}</Link>
          <span aria-hidden>,{" "}</span>
          <Link
            href={`${basePath}?p=about`}
            shallow
            className="cursor-pointer transition-colors hover-red"
            onClick={() => {
              if (selectedProject && selectedProject.name !== "About") {
                navHistoryRef.current.push(currentSlug);
              }
            }}
          >{S.LABEL_ABOUT}</Link>
          <span aria-hidden>,{" "}</span>
          <button
            type="button"
            className="cursor-pointer transition-colors hover-red"
            onClick={() => setShowContact(true)}
          >{S.LABEL_EMAIL}</button>
          <span aria-hidden>.</span>
        </nav>
      </header>



      {/* BANNER — riempie il viewport sotto l'header */}
      {selectedProject && selectedProject.name !== "About" && selectedProject.images?.length > 0 && (
        <section key={`banner-${currentSlug}`} className="w-full relative project-banner" style={{ height: 'calc(100svh - var(--header-h, 80px))', background: 'black', marginBottom: '-1px' }}>
          <TopRotator
            images={selectedProject.images}
            alt={selectedProject.name || ""}
            className="relative w-full h-full overflow-hidden bg-black"
            interval={4000}
            fadeMs={2500}
            zoomMs={7000}
            priorityFirst
          />
          {/* Un solo gradiente, concentrato in basso dove serve leggibilità.
              Prima erano due overlay sovrapposti (0.55→0.65→nero, più una
              seconda sfumatura) che sommati annerivano del tutto il terzo
              inferiore della fotografia. */}
          <div
            className="pointer-events-none absolute inset-0 z-30"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.18) 35%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.92) 90%, #000 100%)",
            }}
          />
          {/* Titolo — stessa posizione di About: items-end, mb-8 */}
          <div className="absolute inset-0 z-50 flex items-end px-6 md:px-12" style={{ bottom: "80px" }}>
            <div className="mb-8 space-y-0 leading-tight">
              <h2 className="banner-title font-display text-white text-4xl md:text-6xl font-extrabold leading-[1.1] drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)]">
                {selectedProject.name}
              </h2>
              {selectedProject.titleExtra?.map((line, i) => (
                <h2 key={i} className="banner-title font-display text-white text-4xl md:text-6xl font-extrabold leading-[1.1] drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)]">
                  {line}
                </h2>
              ))}
              {selectedProject.datePlace && (
                <p className="banner-title font-display text-4xl md:text-6xl font-extrabold leading-[1.1] drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)]" style={{ color: "#c8102e" }}>
                  {selectedProject.datePlace}
                </p>
              )}
            </div>
          </div>
          {/* Chevron — centrata nello spazio extra (80px) in fondo al banner */}
          {(selectedProject.description || selectedProject.techData || selectedProject.esposizioni?.length) && (
            <button
              type="button"
              className="absolute left-0 right-0 mx-auto w-max bottom-0 z-50 flex flex-col items-center justify-center cursor-pointer select-none project-chevron-wrap px-6"
              style={{ height: "80px" }}
              onClick={() => setTextOpen((v) => !v)}
              aria-expanded={textOpen}
              aria-controls="project-text"
              aria-label={textOpen ? (S.LABEL_CHIUDI_TESTO || "Chiudi il testo") : (S.LABEL_SCOPRI || "Scopri di più")}
            >
              {!textOpen && (
                <span className="project-chevron-label text-xs tracking-wide text-white/70" style={{ marginBottom: "2px", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }} aria-hidden>
                  {S.LABEL_SCOPRI || "Scopri di più"}
                </span>
              )}
              <svg
                className={`project-chevron ${textOpen ? "project-chevron--open" : ""}`}
                width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden
                style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))" }}
              >
                <polyline
                  points="6 9 12 15 18 9"
                  className="project-chevron__stroke"
                  stroke="white"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </section>
      )}

      <div id="contenuto" tabIndex={-1} />

      {/* CONTENUTO PROGETTO — chevron toggle testo sotto banner, poi galleria, poi footer */}
      {selectedProject && selectedProject.name !== "About" ? (
        <div key={`project-${currentSlug}`} className="w-full" style={{ backgroundColor: mode === "professional" ? ASP.colorBgProfessional : ASP.colorBgArtwork }}>
          {/* Blocco testo — si rivela al click della chevron nel banner */}
          {(selectedProject.description || selectedProject.techData || selectedProject.esposizioni?.length) && (
            <div style={{ paddingLeft: ASP.marginLaterale + "%", paddingRight: ASP.marginLaterale + "%", overflowX: 'auto' }}>
              {/* Wrapper grid: anima l'altezza 0fr→1fr senza magic number */}
              <div id="project-text" inert={!textOpen} className={`project-text-reveal__wrapper ${textOpen ? "project-text-reveal__wrapper--open" : ""}`}>
              {/* Contenuto testo — opacity controllata dal wrapper */}
              <div className={`project-text-reveal__content ${mode === "professional" ? "text-white/70" : "text-black/60"}`}>
                <div className="flex flex-col md:flex-row pt-12 pb-4" style={{ gap: ASP.gapColonne + "%", minWidth: textRowMinW ? textRowMinW + 'px' : undefined }}>
                  {/* Descrizione — blocco unico */}
                  {selectedProject.description && (
                    <div className="flex-1 min-w-0">
                      <p className="leading-relaxed whitespace-pre-line project-text text-base" lang="it">
                        {selectedProject.description}
                      </p>
                    </div>
                  )}
                  {/* Micro colonna: dati tecnici/esposizioni in alto, copyright in basso */}
                  <div className="md:w-[180px] shrink-0 mt-6 md:mt-0 flex flex-col justify-between">
                    {/* Esposizioni per art, attrezzatura per pro */}
                    {selectedProject.section === "art" ? (
                      selectedProject.esposizioni?.length > 0 && (
                        <div className={`text-xs leading-relaxed space-y-3 ${mode === "professional" ? "text-white/55" : "text-black/55"}`}>
                          <div className="uppercase tracking-wider font-semibold mb-1" style={{ fontSize: "var(--text-2xs)" }}>Esposizioni</div>
                          {selectedProject.esposizioni.map((esp, ei) => (
                            <div key={ei} className="space-y-3">
                              {esp.nome && (
                                <div>
                                  <div className="uppercase tracking-wider font-semibold mb-0.5" style={{ fontSize: "var(--text-2xs)" }}>Nome evento</div>
                                  <div>{esp.nome}</div>
                                </div>
                              )}
                              {esp.data && (
                                <div>
                                  <div className="uppercase tracking-wider font-semibold mb-0.5" style={{ fontSize: "var(--text-2xs)" }}>Data</div>
                                  <div>{esp.data}</div>
                                </div>
                              )}
                              {esp.luogo && (
                                <div>
                                  <div className="uppercase tracking-wider font-semibold mb-0.5" style={{ fontSize: "var(--text-2xs)" }}>Luogo</div>
                                  <div>{esp.luogo}</div>
                                </div>
                              )}
                              {esp.info && (
                                <div>
                                  <div className="uppercase tracking-wider font-semibold mb-0.5" style={{ fontSize: "var(--text-2xs)" }}>Info evento</div>
                                  <div>{esp.info}</div>
                                </div>
                              )}
                              {ei < selectedProject.esposizioni.length - 1 && <hr className="border-current opacity-20" />}
                            </div>
                          ))}
                        </div>
                      )
                    ) : selectedProject.techData && (
                      <div className={`text-xs leading-relaxed space-y-3 ${mode === "professional" ? "text-white/55" : "text-black/55"}`}>
                        <div className="uppercase tracking-wider font-semibold mb-1" style={{ fontSize: "var(--text-2xs)" }}>Attrezzatura</div>
                        {selectedProject.techData.camera && (
                          <div>
                            <div className="uppercase tracking-wider font-semibold mb-0.5" style={{ fontSize: "var(--text-2xs)" }}>Camera</div>
                            <div>{selectedProject.techData.camera}</div>
                          </div>
                        )}
                        {selectedProject.techData.ottica && (
                          <div>
                            <div className="uppercase tracking-wider font-semibold mb-0.5" style={{ fontSize: "var(--text-2xs)" }}>Ottica</div>
                            <div>{selectedProject.techData.ottica}</div>
                          </div>
                        )}
                        {selectedProject.techData.luce && (
                          <div>
                            <div className="uppercase tracking-wider font-semibold mb-0.5" style={{ fontSize: "var(--text-2xs)" }}>Luce</div>
                            <div>{selectedProject.techData.luce}</div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Copyright in basso */}
                    <div className={`text-xs leading-relaxed mt-6 ${mode === "professional" ? "text-white/55" : "text-black/55"}`}>
                      <div>Alfredo Enrico Iacobucci</div>
                      <div>© {new Date().getFullYear()} Tutti i diritti riservati.</div>
                    </div>
                  </div>
                </div>
              </div>
              </div>{/* chiude project-text-reveal__wrapper */}
            </div>
          )}
          {/* Gallery — margini simmetrici sopra e sotto */}
          <div style={{ paddingTop: ASP.galleriaMarginTop + "rem", paddingLeft: ASP.marginLaterale + "%", paddingRight: ASP.marginLaterale + "%" }}>
            <JustifiedGallery
              images={selectedProject.images || []}
              altFor={viewerAlt}
              onImageClick={(i) => {
                setViewerIndex(i);
                setViewerOpen(true);
                if (selectedProject?.images?.[i]) {
                  trackPhoto(selectedProject.images[i].src || selectedProject.images[i], mode === "professional" ? "pro" : "art");
                }
              }}
            />
          </div>
          {/* Margine sotto la galleria — uguale al margine sopra */}
          <div style={{ height: ASP.galleriaMarginBottom + "rem" }} />
        </div>
      ) : selectedProject && selectedProject.name === "About" ? (
        <>
          {/* VIDEO — letto da content/about/ */}
          <section key="about-video" className="w-full relative about-video-section" style={{ height: 'calc(100vh - var(--header-h, 80px) + 3rem)' }}>
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center" style={{ background: ASP.colorBgProfessional }}>
              {selectedProject.video ? (
                <video
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                  loop
                  autoPlay={!reducedMotion}
                  controls={reducedMotion}
                  preload="metadata"
                  src={selectedProject.video}
                />
              ) : (
                <span className="relative z-40 text-xs font-medium tracking-widest uppercase" style={{ color: ASP.colorTextProfessional, opacity: 0.6 }}>
                  {S.LABEL_VIDEO_PLACEHOLDER}
                </span>
              )}
            </div>
            {/* Gradiente allineato a quello dei banner progetti: leggero al centro,
                concentrato in basso per leggibilità del titolo. */}
            <div
              className="pointer-events-none absolute inset-0 z-30"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.18) 35%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.92) 90%, #000 100%)",
              }}
            />
            <div className="absolute inset-0 z-40 flex items-end px-6 md:px-12">
              <div className="mb-8 space-y-0 leading-tight">
                <h2 className="banner-title font-display text-white text-4xl md:text-6xl font-extrabold leading-[1.1] drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)]">
                  {mode === "professional" ? "About Professional" : "About Artwork"}
                </h2>
              </div>
            </div>
          </section>

          {/* CONTENUTO ABOUT */}
          <div key="about" className="w-full fade-in" style={{ animationDuration: '400ms' }}>
            {/* TESTO IN DUE COLONNE + CONTATTI — stessa struttura dei progetti */}
            <div className={`w-full about-text-section ${mode === "professional" ? "text-white" : "text-black"}`} style={{ paddingLeft: ASP.marginLaterale + '%', paddingRight: ASP.marginLaterale + '%', paddingTop: '3rem', paddingBottom: '2.5rem', overflowX: 'auto' }}>
              <div className="flex flex-col md:flex-row text-base leading-relaxed" style={{ gap: ASP.gapColonne + '%', minWidth: textRowMinW ? textRowMinW + 'px' : undefined }} lang="it">
                {/* Colonna sinistra — testo */}
                <div className="flex-1 min-w-0">
                  <p className="whitespace-pre-line project-text">{selectedProject.description}</p>
                </div>
                {/* Colonna destra — testo */}
                <div className="flex-1 min-w-0 mt-6 md:mt-0">
                  <p className="whitespace-pre-line project-text">{selectedProject.description2 || ""}</p>
                </div>
              </div>
              {/* Contatti — sotto la bio, distribuiti: sinistra, centro, destra */}
              <div className={`flex items-center text-sm ${mode === "professional" ? "text-white/60" : "text-black/55"}`} style={{ marginTop: "4rem", justifyContent: "space-between" }}>
                <a href={`tel:${S.TELEFONO.replace(/\s/g, "")}`} className="flex items-center gap-2 transition-colors duration-300 hover-red">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {S.TELEFONO}
                </a>
                <a href={`mailto:${S.EMAIL_DESTINATARIO}`} className="flex items-center gap-2 transition-colors duration-300 hover-red">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  {S.EMAIL_DESTINATARIO}
                </a>
                <a href={S.LINK_INSTA} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 transition-colors duration-300 hover-red">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
                  {S.INSTAGRAM_HANDLE}
                </a>
              </div>
            </div>

            {/* BLOCCO CITAZIONE + FOTO — colori invertiti rispetto al resto */}
            <div className="w-full about-quote-block" style={{ paddingTop: ASP.aboutQuotePadding + "rem", paddingBottom: ASP.aboutQuotePadding + "rem", backgroundColor: mode === "professional" ? ASP.colorBgArtwork : ASP.colorBgProfessional, color: mode === "professional" ? ASP.colorTextArtwork : ASP.colorTextProfessional }}>
              {/* CITAZIONE — letta da content/about/citazione.txt */}
              {selectedProject.quote && (
                <div className="w-full max-w-5xl mx-auto px-6 md:px-12 text-center">
                  <div className="font-display text-5xl md:text-7xl font-extrabold leading-none -mb-2" style={{ color: ASP.colorAccent }} aria-hidden>&ldquo;&rdquo;</div>
                  <blockquote className="font-display text-2xl md:text-4xl lg:text-5xl font-extrabold uppercase leading-tight tracking-tight" style={{ color: ASP.colorAccent }}>
                    {selectedProject.quote}
                  </blockquote>
                </div>
              )}

              {/* FOTO 3:2 — stessi margini laterali del testo (8%) */}
              <div className="w-full about-photo-wrap" style={{ marginTop: ASP.aboutQuotePadding + "rem", paddingLeft: ASP.marginLaterale + "%", paddingRight: ASP.marginLaterale + "%" }}>
                <div className="w-full about-photo overflow-hidden flex items-center justify-center" style={{ aspectRatio: ASP.aboutPhotoAspect, border: selectedProject.photo ? undefined : "1px solid currentColor", borderColor: selectedProject.photo ? undefined : "color-mix(in srgb, currentColor 25%, transparent)" }}>
                  {selectedProject.photo ? (
                    <img src={selectedProject.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-medium tracking-widest uppercase" style={{ opacity: 0.6 }}>
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
            {projectsWithSlug.map((project, index) => {
              const isReverse = mode === "artwork" ? (index % 2 === 1) : (index % 2 === 0);
              const anteprimaImg = project.images?.[project.anteprimaIndex ?? project.bannerStartIndex ?? 0] || project.images?.[0];
              const bannerSrc = anteprimaImg?.src || "";
              const isVertical = anteprimaImg && anteprimaImg.h > anteprimaImg.w;
              const aPos = project.anteprimaPosizione || { x: 50, y: 33 };
              const marqueeText = Array(4).fill(`${[project.name, ...(project.titleExtra || []), project.datePlace].filter(Boolean).join(" - ")} |`).join(" ");

              return (
                /* Era un <div onClick>: l'intero accesso ai progetti — la
                   navigazione principale del sito — non era raggiungibile da
                   tastiera. Ora è un <Link>, quindi focusabile, attivabile con
                   Invio, apribile in nuova tab e con prefetch di Next. */
                <Link
                  key={project.slug}
                  href={hrefProject(project.slug)}
                  shallow
                  aria-label={`Apri il progetto ${project.name}`}
                  className={`marquee-row block w-full ${mode === "professional" ? "border-t-[2.5px] border-b-[2.5px] border-white" : "border-t-4 border-b-4 border-black"} overflow-hidden cursor-pointer ${activeRowSlug === project.slug ? "active" : ""}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onMouseEnter={() => onRowHover(project)}
                  onMouseLeave={onRowLeave}
                  onFocus={() => preloadAndScroll(project)}
                  onBlur={onRowLeave}
                  onClick={(e) => onRowClick(project, e)}
                >
                  {/* Contenitore relativo — il banner si posiziona dietro al testo */}
                  <div className="marquee-row__inner">
                    {/* Banner background — visibile solo su hover */}
                    {bannerSrc && (
                      <div className="marquee-row__banner">
                        {/* Anteprima @md (~59 KB): prima qui finiva
                            l'originale a piena risoluzione, fino a 17 MB,
                            per riempire una striscia sotto un overlay nero
                            al 45%. */}
                        <img src={preview(bannerSrc)} onError={fallbackToOriginal(bannerSrc)} alt="" className="marquee-row__banner-img" data-banner-slug={project.slug} data-banner-vertical={isVertical ? "1" : "0"} loading="lazy" decoding="async" style={{ objectPosition: `${aPos.x}% ${aPos.y}%` }} />
                        <div className="marquee-row__banner-overlay" />
                      </div>
                    )}

                    {/* Marquee text — sempre visibile, scorre sopra il banner */}
                    <div className={`marquee-track ${isReverse ? "reverse" : ""}`} style={{ position: "relative", zIndex: 2 }}>
                      <span className="marquee-seq">{marqueeText}</span>
                      <span className="marquee-seq" aria-hidden="true">{marqueeText}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
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
          className="viewer-fullscreen fixed inset-0 z-[200] flex flex-col bg-black/95 fade-in py-2"
          role="dialog"
          aria-modal="true"
          aria-label={`Visualizzazione a schermo intero — ${projectLabel}`}
          style={{ animationDuration: '250ms' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewerOpen(false);
          }}
        >
          {/* Title bar */}
          <div className="w-full flex items-center justify-center gap-3 h-[44px] shrink-0 pointer-events-none">
            <span className="text-white text-sm font-semibold text-center px-4 whitespace-nowrap">
              {projectLabel}
            </span>
            {selectedProject.images.length > 1 && (
              <span className="text-white/50 tabular-nums" style={{ fontSize: "var(--text-xs)" }}>
                {viewerIndex + 1}/{selectedProject.images.length}
              </span>
            )}
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
                {/* SVG al posto dei caratteri ‹ › : non dipendono dal font,
                    si allineano in modo prevedibile e il bersaglio arriva a
                    44x44px come richiesto sul touch. */}
                <button
                  className="viewer-nav absolute left-4 md:left-8 lg:left-12 top-1/2 -translate-y-1/2 z-10"
                  onClick={() => setViewerIndex((prev) => (prev - 1 + selectedProject.images.length) % selectedProject.images.length)}
                  aria-label="Immagine precedente"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  className="viewer-nav absolute right-4 md:right-8 lg:right-12 top-1/2 -translate-y-1/2 z-10"
                  onClick={() => setViewerIndex((prev) => (prev + 1) % selectedProject.images.length)}
                  aria-label="Immagine successiva"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </>
            )}
            <div className="relative max-w-[95vw] max-h-full w-full h-full">
              {/* Finestra fissa: corrente ±2, niente altro.
                  Prima teneva nel DOM corrente ±3 PIU' tutti gli indici già
                  visitati, tutti con loading="eager": su le-radici-ca-tieni
                  (98 foto) sfogliando la galleria si arrivava a ~95 <Image>
                  montati insieme. Il browser tiene comunque in cache le
                  immagini già scaricate, quindi tornare indietro resta
                  immediato senza mantenerle montate. */}
              {viewerWindow.map(({ idx, src, isCurrent }) => (
                <Image
                  key={src}
                  src={src}
                  alt={isCurrent ? viewerAlt(idx) : ""}
                  fill
                  sizes="95vw"
                  quality={85}
                  priority={isCurrent}
                  className={`object-contain select-none ${isCurrent ? "shadow-2xl" : ""}`}
                  style={{
                    opacity: isCurrent ? 1 : 0,
                    transition: "opacity 150ms cubic-bezier(0.23, 1, 0.32, 1)",
                    position: "absolute",
                    pointerEvents: isCurrent ? "auto" : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Close button */}
          <div className="w-full flex items-center justify-center shrink-0">
            <button
              className="viewer-nav"
              onClick={() => setViewerOpen(false)}
              aria-label="Chiudi visualizzazione"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
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
          transition: color 300ms ease;
        }

        /* === HOVER EXPAND: riga si allarga, banner appare dietro === */
        .marquee-row {
          transition: background-color 300ms ease;
        }

        .marquee-row__inner {
          position: relative;
          overflow: hidden;
        }

        /* Banner: immagine di sfondo dietro al testo */
        .marquee-row__banner {
          position: absolute;
          inset: 0;
          z-index: 1;
          opacity: 0;
          transition: opacity 400ms var(--ease-smooth);
        }
        @media (hover: hover) and (pointer: fine) {
          .marquee-row:hover .marquee-row__banner { opacity: 1; }
          .marquee-row:hover .marquee-seq { color: #f8f4ed; text-shadow: 0 2px 8px rgba(0,0,0,0.6); }
          .marquee-row:hover .marquee-row__inner { padding: 4.5rem 0; }
        }
        .marquee-row.active .marquee-row__banner {
          opacity: 1;
        }

        .marquee-row__banner-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Overlay semi-trasparente sopra il banner per leggibilità testo */
        .marquee-row__banner-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
        }

        /* Testo diventa bianco su active (hover è nel media query sopra) */
        .marquee-row.active .marquee-seq {
          color: #f8f4ed;
          text-shadow: 0 2px 8px rgba(0,0,0,0.6);
        }

        /* Riga si espande su active, testo centrato (hover è nel media query sopra) */
        .marquee-row__inner {
          padding: 0;
          display: flex;
          align-items: center;
          transition: padding 400ms cubic-bezier(.25,.8,.25,1);
        }
        .marquee-row.active .marquee-row__inner {
          padding: 4.5rem 0;
        }

        /* Mobile: padding ridotto, marquee più lento */
        @media (hover: none) and (pointer: coarse) {
          .marquee-row.active .marquee-row__inner {
            padding: 2.5rem 0;
          }
          .marquee-track {
            animation-duration: 110s !important;
          }
        }
      `}</style>
    </div>
  );
}
