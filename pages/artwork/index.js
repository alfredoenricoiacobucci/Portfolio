// pages/artwork/index.js
import { useEffect, useMemo, useState, useRef } from "react";
import Modal from "@/components/Modal";
import { useRouter } from "next/router";
import { BY_MODE } from "@/data/projects";

/**
 * Legge /public/projects/* e costruisce i progetti.
 * Imposta `banner: "nome-file.jpg"` per far partire il banner da quella foto.
 */
export async function getServerSideProps() {
  const fs = await import("fs");
  const path = await import("path");

  const PROJECTS_META = [
    {
      id: "p1",
      title: "Xylella, Bellezza Fragile - Martano (LE) 2025",
      description:
        "L'uomo è parte dell'ecosistema terrestre. In ogni ecosistema la più piccola variazione può rompere un anello e l'intera catena si spezzerà. L'epidemia di Xylella, ha mandato in rovina secoli di lavoro e sacrifici di generazioni di famiglie di un'intera regione. E a noi non rimane che osservare inermi, a raccogliere i cocci.",
      banner: "xylella-1.jpg",
    },
    {
      id: "p2",
      title: "Le radici ca tieni - Martano (LE) 2024",
      description:
        "Come sono diventati oggi quesi volti, oggetti, luoghi, texture e atmosfere della mia infanzia?",
      banner: "radici-001.jpg",
    },
    {
      id: "p3",
      title: "Gemelli Cosmici - Rimini (RM) 2025",
      description:
        "“Gemelli cosmici” è un ritratto fotografico a un'opera di land art sulla sabbia. L'esigenza di immortalare l'effimera scultura in sabbia scaturisce da un ragionamento: alla base degli elementi che compongono la materia vi sono le particelle elementari, cariche elettriche in equilibrio all’interno di legami, il numero e la disposizione di queste cariche determinano l’elemento specifico. Dunque la materia non è altro che energia, in particolare energia potenziale, perciò l’universo è un’unica unità di energia. In quest’ottica, i confini che abbiamo messo tra noi e le cose e tra lo cose stesse, svaniscono e l'individualismo che caratterizza la cultura occidentale viene superato: il mio volto non ha nulla di differente da quello scolpito nella sabbia: entrambi sono effimere espressioni temporanee dello stesso magma universale. “Portiamo in noi l’infanzia dell’universo” (E. Coccia)",
      banner: "gemelli-1.jpg",
    },
    {
      id: "p4",
      title: "Benzina senza piombo, morti senza ferro - Pesaro (PS) 2024",
      description: "no comment",
      banner: "benzina-01.jpg",
    },
    {
      id: "p5",
      title: "Incastri di cemento - Jesi (AN) 2024",
      description: "no coment",
      banner: "cimitero-01.jpg",
    },
    {
      id: "p6",
      title: "SONO MANIFESTO, Workshop con Paola Bianchi - Urbino (PU) 2025",
      description:
        "Paola Bianchi è corpo parlante, manifestazione fisica di un pensiero, è un’idea che si esprime con gesti - ma anche con fiato, fruscii, urti - e che, di volta in volta, diventa iconografia, evocazione, messaggio. Paola Bianchi è una forma dinamica che parla di politica, di società, di collettività attraverso torsioni nodose, posture articolate e tensioni urgenti. Per conoscere meglio il suo FARSI MANIFESTO si propone un workshop di 2 giorni, rivolto ad un numero prestabilito di partecipanti (indicato dall’artista), che si completerà con una performance finale.",
      banner: "PB-01.jpg",
    },
  ];

  const fsMod = await fs;
  const pathMod = await path;

  const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
  const natural = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

  const publicDir = pathMod.join(process.cwd(), "public");
  const base = pathMod.join(publicDir, "projects");

  const projects = PROJECTS_META.map((meta) => {
    const folder = pathMod.join(base, meta.id);
    let files = [];
    if (fsMod.existsSync(folder)) {
      files = fsMod
        .readdirSync(folder)
        .filter((f) => ALLOWED.has(pathMod.extname(f).toLowerCase()))
        .sort(natural.compare);
    }
    const images = files.map((f) => `/projects/${meta.id}/${f}`);

    let bannerStartIndex = 0;
    if (meta.banner && files.length > 0) {
      const idx = files.findIndex((f) => f.toLowerCase() === meta.banner.toLowerCase());
      bannerStartIndex = idx >= 0 ? idx : 0;
    }

    return {
      id: meta.id,
      name: meta.title,
      description: meta.description,
      images,
      bannerStartIndex,
    };
  });

  return { props: { projects } };
}

// util: titolo -> slug per URL
const slugify = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function Portfolio({ projects }) {
  const router = useRouter();

  // --- Qui calcoliamo la "mode" (artwork/professional) e backdrop per i link
  const mode = router.pathname.startsWith("/professional") ? "professional" : "artwork";
  const basePath = `/${mode}`;

  const [selectedProject, setSelectedProject] = useState(null);

  // Modal contatti
  const [showContact, setShowContact] = useState(false);

  // Viewer fullscreen
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Banner slideshow
  const [bannerIndex, setBannerIndex] = useState(0);
  const [prevBannerIndex, setPrevBannerIndex] = useState(null);
  const timerRef = useRef(null);

  // Progetti con slug (filtrati in base al mode)
  const allow = useMemo(() => new Set(BY_MODE[mode]), [mode]);
  const projectsWithSlug = useMemo(
    () =>
      (projects || [])
        .filter((p) => allow.has(p.id))
        .map((p) => ({ ...p, slug: slugify(p.name) })),
    [projects, allow]
  );
  const currentSlug = useMemo(
    () => (selectedProject ? slugify(selectedProject.name) : null),
    [selectedProject]
  );

  const hrefProject = (slug) => `${basePath}?p=${slug}`;
  const hrefImage = (slug, i) => `${basePath}?p=${slug}&img=${i}`;
  const pushShallow = (href) => router.push(href, undefined, { shallow: true });

  // URL → stato
  useEffect(() => {
    const q = router.query?.p;
    const imgIndex = router.query?.img ? parseInt(router.query.img, 10) : null;

    if (!q) {
      setSelectedProject(null);
      setViewerOpen(false);
      return;
    }

    if (q === "info") {
      setSelectedProject({
        name: "Info",
        description:
          "Sono Alfredo Enrico Iacobucci nato a Urbino, nel 2002. Dopo aver concluso il percorso al Liceo Scientifico Laurana di Urbino, ho proseguito gli studi presso l’Accademia di Belle Arti della stessa città. Ho approfondito la mia ricerca attraverso viaggi, corsi di teatro e di strumento, oltre a workshop in collaborazione con l’Accademia e personalità di rilievo come Paola Bianchi, Ivan Fantini, Felix Schramm, Emilio Isgrò, Piero Percoco e Marco Bellocchio. La mia ricerca si concentra sulla consapevolezza della relatività della realtà: partendo dalla letteratura scientifica e classica, utilizzo fotografia e installazione per indagare i limiti della percezione umana e il rapporto tra mondo materiale e impalpabile, con lo scopo di urlare al mondo che, per quanto ne sappiamo finora, “nulla è reale, e tutto è lecito”.",
      });
      setViewerOpen(false);
      return;
    }

    const found = projectsWithSlug.find((p) => p.slug === q);
    if (found) {
      setSelectedProject(found);
      if (found.images?.length) {
        setBannerIndex(found.bannerStartIndex || 0);
        setPrevBannerIndex(null);
      }
      if (imgIndex !== null && !isNaN(imgIndex) && found.images[imgIndex]) {
        setViewerIndex(imgIndex);
        setViewerOpen(true);
      } else {
        setViewerOpen(false);
      }
    }
  }, [router.query?.p, router.query?.img, projectsWithSlug]);

  // Timer per cambio banner con dissolvenza incrociata
  useEffect(() => {
    if (!selectedProject?.images?.length) return;
    const TOTAL = 12000; // durata ciclo (ms)
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setPrevBannerIndex((prev) => (prev === null ? bannerIndex : (prev + 1) % selectedProject.images.length));
      setBannerIndex((i) => (i + 1) % selectedProject.images.length);
    }, TOTAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedProject, bannerIndex]);

  // Tastiera viewer
  useEffect(() => {
    if (!viewerOpen || !selectedProject?.images?.length) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setViewerOpen(false);
        if (currentSlug) pushShallow(hrefProject(currentSlug));
      }
      if (e.key === "ArrowRight") {
        setViewerIndex((i) => {
          const ni = (i + 1) % selectedProject.images.length;
          if (currentSlug) pushShallow(hrefImage(currentSlug, ni));
          return ni;
        });
      }
      if (e.key === "ArrowLeft") {
        setViewerIndex((i) => {
          const ni = (i - 1 + selectedProject.images.length) % selectedProject.images.length;
          if (currentSlug) pushShallow(hrefImage(currentSlug, ni));
          return ni;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerOpen, selectedProject, currentSlug]);

  return (
    <div className={`min-h-screen ${mode === "professional" ? "bg-base text-white" : "bg-base text-black"} flex flex-col items-center`}>
      {/* HEADER */}
<header className="w-full flex justify-between items-center py-14 px-4 border-b-4 site-border text-[22px] font-bold">
  {/* SWITCH Artwork / Professional (stesso stile delle altre voci) */}
  <div className="flex items-center gap-2 text-[20px]">
    <button
      onClick={() => {
        // vai a artwork (reset query)
        router.push("/artwork", undefined, { shallow: true });
      }}
      className={`cursor-pointer transition-opacity ${router.pathname.startsWith("/artwork") ? "opacity-100" : "opacity-50"}`}
      aria-pressed={router.pathname.startsWith("/artwork")}
    >
      Artwork
    </button>

    <span className="px-2">/</span>

    <button
      onClick={() => {
        router.push("/professional", undefined, { shallow: true });
      }}
      className={`cursor-pointer transition-opacity ${router.pathname.startsWith("/professional") ? "opacity-100" : "opacity-50"}`}
      aria-pressed={router.pathname.startsWith("/professional")}
    >
      Professional
    </button>
  </div>

  {/* NAV: Email, Info, Insta (lasciamo identico il markup, stesse classi) */}
  <nav className="flex gap-2 text-[20px]">
    <span className="cursor-pointer" onClick={() => setShowContact(true)}>Email</span>,{" "}
    <span
      className="cursor-pointer"
      onClick={() => {
        setSelectedProject({
          name: "Info",
          description:
            "Sono Alfredo Enrico Iacobucci nato a Urbino, nel 2002. Dopo aver concluso il percorso al Liceo Scientifico Laurana di Urbino, ho proseguito gli studi presso l’Accademia di Belle Arti della stessa città...",
        });
        pushShallow(hrefProject("info"));
      }}
    >
      Info
    </span>,{" "}
    <a href="https://instagram.com/alfredoenricoiacobucci" target="_blank" rel="noopener noreferrer">Insta</a>
  </nav>
</header>



      {/* ===== BANNER TITOLO FULL-BLEED con zoom-out leggero + dissolvenza incrociata ===== */}
      {selectedProject && selectedProject.name !== "Info" && selectedProject.images?.length > 0 && (
        <section className="w-full">
          {(() => {
            const imgs = selectedProject.images;
            const cur = imgs[bannerIndex % imgs.length];
            const prev = prevBannerIndex !== null ? imgs[prevBannerIndex % imgs.length] : null;

            return (
              <div className="relative w-full h-[40vh] md:h-[48vh] lg:h-[56vh] overflow-hidden bg-black">
                {/* Strato precedente (fade out + zoom-out leggero) */}
                {prev && (
                  <img
                    key={`prev-${prev}`}
                    src={prev}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover object-center animate-kb-out fade-out"
                  />
                )}

                {/* Strato corrente (fade in + zoom-out leggero) */}
                <img
                  key={`cur-${cur}`}
                  src={cur}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-center animate-kb-out fade-in"
                />

                {/* Gradiente più scuro per leggibilità del titolo */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black/95" />

                {/* Titolo in basso a sinistra */}
                <div className="absolute inset-0 flex items-end px-6 md:px-12">
                  <h2 className="text-white text-4xl md:text-6xl font-extrabold mb-6 drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)]">
                    {selectedProject.name}
                  </h2>
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* ===== CONTENUTO PROGETTO ===== */}
      {selectedProject && selectedProject.name !== "Info" ? (
        <div className="w-full max-w-6xl px-6 py-12">
          {/* Descrizione */}
          <p className={`${mode === "professional" ? "text-white" : "text-black"} text-sm md:text-base leading-relaxed mb-10 max-w-3xl whitespace-pre-line`}>
            {selectedProject.description}
          </p>

          {/* Galleria 2-per-riga con overlay */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {selectedProject.images?.map((img, i) => (
              <button
                key={i}
                type="button"
                className="group relative w-full cursor-zoom-in focus:outline-none"
                onClick={() => {
                  setViewerIndex(i);
                  setViewerOpen(true);
                }}
                aria-label={`Apri immagine ${i + 1} a schermo intero`}
              >
                <div className="relative w-full h-56 md:h-72 lg:h-80 overflow-hidden">
                  <img
                    src={img}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01] group-active:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 group-active:bg-black/25 group-focus:bg-black/25 transition-colors duration-200" />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="rounded px-3 py-1 text-white text-xs md:text-sm font-semibold opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus:opacity-100 transition-opacity duration-150 drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">
                      visualizza a schermo intero
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : selectedProject && selectedProject.name === "Info" ? (
        <div className="max-w-4xl p-24">
          <h2 className="text-6xl font-bold mb-6 text-left">{selectedProject.name}</h2>
          <div className={`${mode === "professional" ? "text-white" : "text-black"} text-sm md:text-base leading-relaxed whitespace-pre-line`}>
            {selectedProject.description}
            <div className="mt-8 space-y-2">
              <div>Telefono: <a href="tel:+393737286324" className="underline">+39 373 7286324</a></div>
              <div>Email: <a href="mailto:a.e.iacobucci@icloud.com" className="underline">a.e.iacobucci@icloud.com</a></div>
              <div>Instagram: <a href="https://instagram.com/alfredoenricoiacobucci" target="_blank" rel="noopener noreferrer" className="underline">@alfredoenricoiacobucci</a></div>
            </div>
          </div>
        </div>
      ) : (
        // Home: fasce scorrevoli
        <div className="w-full flex flex-col gap-0 p-0">
          {projectsWithSlug.map((project, index) => (
            <div key={project.slug} className="w-full border-t-4 border-b-4 border-black min-h-[1vh] flex items-center overflow-hidden">
              <div className={`marquee-track ${index % 2 === 1 ? "reverse" : ""}`}>
                <span
                  className="marquee-seq"
                  onClick={() => {
                    setSelectedProject(project);
                    pushShallow(hrefProject(project.slug));
                  }}
                >
                  {Array(20).fill(`${project.name} |`).join(" ")}
                </span>
                <span
                  className="marquee-seq"
                  aria-hidden="true"
                  onClick={() => {
                    setSelectedProject(project);
                    pushShallow(hrefProject(project.slug));
                  }}
                >
                  {Array(20).fill(`${project.name} |`).join(" ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contact Modal */}
      <Modal open={showContact} onClose={() => setShowContact(false)} title="Contattami">
        <form
          action="mailto:a.e.iacobucci@icloud.com"
          method="GET"
          onSubmit={(e) => {
            e.preventDefault();
            const email = "a.e.iacobucci@icloud.com";
            const subject = encodeURIComponent("Contatto dal portfolio");
            const body = encodeURIComponent(`Ciao Alfredo,\n\nTi scrivo dal portfolio.\n\n[Scrivi il tuo messaggio qui]\n`);
            window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
          }}
          className="space-y-4"
        >
          <input type="email" placeholder="La tua email (opzionale)" className="w-full rounded border border-black p-3" />
          <textarea placeholder="Il tuo messaggio" className="w-full rounded border border-black p-3" rows={6} required></textarea>
          <button type="submit" className="w-full rounded bg-black p-3 text-white">Invia</button>
        </form>
      </Modal>

      {/* VIEWER FULLSCREEN */}
      {viewerOpen && selectedProject?.images?.length > 0 && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setViewerOpen(false);
              if (currentSlug) pushShallow(hrefProject(currentSlug));
            }
          }}
        >
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-lg font-semibold text-center px-4">
            {selectedProject?.name}
          </div>

          {selectedProject.images.length > 1 && (
            <>
              <button
                className="absolute left-6 md:left-10 lg:left-14 top-1/2 -translate-y-1/2 text-white text-4xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)] px-2"
                onClick={() =>
                  setViewerIndex((i) => {
                    const ni = (i - 1 + selectedProject.images.length) % selectedProject.images.length;
                    if (currentSlug) pushShallow(hrefImage(currentSlug, ni));
                    return ni;
                  })
                }
                aria-label="Immagine precedente"
              >
                ‹
              </button>
              <button
                className="absolute right-6 md:right-10 lg:right-14 top-1/2 -translate-y-1/2 text-white text-4xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)] px-2"
                onClick={() =>
                  setViewerIndex((i) => {
                    const ni = (i + 1) % selectedProject.images.length;
                    if (currentSlug) pushShallow(hrefImage(currentSlug, ni));
                    return ni;
                  })
                }
                aria-label="Immagine successiva"
              >
                ›
              </button>
            </>
          )}

          <img
            src={selectedProject.images[viewerIndex]}
            alt=""
            className="max-w-[95vw] max-h-[85vh] w-auto h-auto object-contain shadow-2xl"
          />

          <button
            className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-4xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]"
            onClick={() => {
              setViewerOpen(false);
              if (currentSlug) pushShallow(hrefProject(currentSlug));
            }}
            aria-label="Chiudi visualizzazione"
          >
            ×
          </button>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full py-12 border-t-4 site-border text-center text-sm font-bold space-y-2">
  <div>Alfredo Enrico Iacobucci © {new Date().getFullYear()}</div>
  <div className="text-xs font-normal">
    Tutte le immagini presenti sono coperte da copyright e non possono essere utilizzate senza autorizzazione.
  </div>
</footer>

    </div>
  );
}
