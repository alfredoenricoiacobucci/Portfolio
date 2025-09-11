import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import Image from "next/image";

// helper per generare i percorsi delle immagini
const genImages = (folder, base, count) =>
  Array.from({ length: count }, (_, i) => `/projects/${folder}/${base}-${i + 1}.jpg`);

const projects = [
  {
    name: "Xylella, Bellezza Fragile - Martano (LE) 2025",
    description:
      "L'uomo è parte dell'ecosistema terrestre. In ogni ecosistema la più piccola variazione può rompere un anello e l'intera catena si spezzerà. L'epidemia di Xylella, ha mandato in rovina secoli di lavoro e sacrifici di generazioni di famiglie di un'intera regione. E a noi non rimane che osservare inermi, a raccogliere i cocci.",
    images: genImages("p1", "xylella", 7),
  },
  { name: "Le radici ca tieni - Martano (LE) 2024", description: "Come sono diventati oggi quesi volti, oggetti, luoghi, texture e atmosfere della mia infanzia?", images: genImages("p2", "radici", 20), },
  { name: "Gemelli Cosmici - Rimini (RM) 2025", description: "“Gemelli cosmici” è un ritratto fotografico a un'opera di land art sulla sabbia. L'esigenza di immortalare l'effimera scultura in sabbia scaturisce da un ragionamento: alla base degli elementi che compongono la materia vi sono le particelle elementari, cariche elettriche in equilibrio all’interno di legami, il numero e la disposizione di queste cariche determinano l’elemento specifico. Dunque la materia non è altro che energia, in particolare energia potenziale, perciò l’universo è un’unica unità di energia. In quest’ottica, i confini che abbiamo messo tra noi e le cose e tra lo cose stesse, svaniscono e l'individualismo che caratterizza la cultura occidentale viene superato: il mio volto non ha nulla di differente da quello scolpito nella sabbia: entrambi sono effimere espressioni temporanee dello stesso magma universale. “Portiamo in noi l’infanzia dell’universo” (E. Coccia)", images: genImages("p3", "gemelli", 6), },
  { name: "Benzina senza piombo, morti senza ferro - Pesaro (PS) 2024", description: "no comment", images: genImages("p4", "benzina", 11), },
  { name: "Incastri di cemento - Jesi (AN) 2024", description: "no coment", images: genImages("p5", "cimitero", 18), },
  { name: "SONO MANIFESTO, Workshop con Paola Bianchi - Urbino (PU) 2025", description: "Paola Bianchi è corpo parlante, manifestazione fisica di un pensiero, è un’idea che si esprime con gesti - ma anche con fiato, fruscii, urti - e che, di volta in volta, diventa iconografia, evocazione, messaggio. Paola Bianchi è una forma dinamica che parla di politica, di società, di collettività attraverso torsioni nodose, posture articolate e tensioni urgenti. Per conoscere meglio il suo FARSI MANIFESTO si propone un workshop di 2 giorni, rivolto ad un numero prestabilito di partecipanti (indicato dall’artista), che si completerà con una performance finale.", images: genImages("p6", "PB", 75), },
];

export default function Portfolio() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [showContact, setShowContact] = useState(false);

  // --- LIGHTBOX (fullscreen) ---
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // tastiera: ESC chiude, frecce navigano
  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setViewerOpen(false);
      if (!selectedProject?.images?.length) return;
      if (e.key === "ArrowRight") setViewerIndex((i) => (i + 1) % selectedProject.images.length);
      if (e.key === "ArrowLeft")
        setViewerIndex((i) => (i - 1 + selectedProject.images.length) % selectedProject.images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerOpen, selectedProject]);

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center">
      {/* Header */}
      <header className="w-full flex justify-between items-center py-14 px-4 border-b-4 border-black text-[22px] font-bold">
        <h1 className="cursor-pointer" onClick={() => setSelectedProject(null)}>
          Alfredo Enrico Iacobucci
        </h1>
        <nav className="flex gap-2 text-[20px]">
          <span className="cursor-pointer" onClick={() => setShowContact(true)}>
            Email
          </span>
          ,{" "}
          <span
            className="cursor-pointer"
            onClick={() =>
              setSelectedProject({
                name: "Info",
                description:
                  "Sono Alfredo Enrico Iacobucci nato a Urbino, nel 2002. Dopo aver concluso il percorso al Liceo Scientifico Laurana di Urbino, ho proseguito gli studi presso l’Accademia di Belle Arti della stessa città. Ho approfondito la mia ricerca attraverso viaggi, corsi di teatro e di strumento, oltre a workshop in collaborazione con l’Accademia e personalità di rilievo come Paola Bianchi, Ivan Fantini, Felix Schramm, Emilio Isgrò, Piero Percoco e Marco Bellocchio. La mia ricerca si concentra sulla consapevolezza della relatività della realtà: partendo dalla letteratura scientifica e classica, utilizzo fotografia e installazione per indagare i limiti della percezione umana e il rapporto tra mondo materiale e impalpabile, con lo scopo di urlare al mondo che, per quanto ne sappiamo finora, “nulla è reale, e tutto è lecito”.",
              })
            }
          >
            Info
          </span>
          ,{" "}
          <a href="https://instagram.com/alfredoenricoiacobucci" target="_blank" rel="noopener noreferrer">
            Insta
          </a>
        </nav>
      </header>

      {/* Home or Project Details */}
      {selectedProject && selectedProject.name !== "Info" ? (
        <div className="w-full max-w-6xl px-6 py-24">
          <h2 className="text-6xl font-bold mb-6 text-left">{selectedProject.name}</h2>

          {/* testo progetto - PIÙ GRANDE */}
          <p className="text-sm md:text-base leading-relaxed text-black mb-12 max-w-3xl whitespace-pre-line">
            {selectedProject.description}
          </p>

          {/* Galleria immagini */}
          <div className="masonry">
  {selectedProject.images?.map((img, index) => (
    <button
      key={index}
      type="button"
      className="masonry-item block w-full cursor-zoom-in"
      onClick={() => {
        setViewerIndex(index);
        setViewerOpen(true);
      }}
      aria-label="Apri immagine a schermo intero"
    >
      <img
        src={img}
        alt=""
        className="block w-full h-auto rounded border border-black/10 bg-white"
      />
    </button>
  ))}
</div>
        </div>
      ) : selectedProject && selectedProject.name === "Info" ? (
        // INFO senza righe nere aggiuntive
        <div className="max-w-4xl p-24">
          <h2 className="text-6xl font-bold mb-6 text-left">{selectedProject.name}</h2>
          <p className="text-sm md:text-base leading-relaxed text-black whitespace-pre-line">
            {selectedProject.description}
            <div className="mt-8 space-y-2 text-sm md:text-base">
                <div>
    Telefono:{" "}
    <a href="mailto:a.e.iacobucci@icloud.com" className="underline">
      +39 373 7286324
    </a>
  </div>
  <div>
    Email:{" "}
    <a href="mailto:a.e.iacobucci@icloud.com" className="underline">
      a.e.iacobucci@icloud.com
    </a>
  </div>
  <div>
    Instagram:{" "}
    <a
      href="https://instagram.com/alfredoenricoiacobucci"
      target="_blank"
      rel="noopener noreferrer"
      className="underline"
    >
      @alfredoenricoiacobucci
    </a>
  </div>
  {/* Aggiungi altri contatti se vuoi */}
  {/* <div>Telefono: +39 ...</div> */}
</div>
          </p>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-0 p-0">
          {projects.map((project, index) => (
            <div
              key={index}
              className="w-full border-t-4 border-b-4 border-black min-h-[1vh] flex items-center overflow-hidden"
            >
              <div className={`marquee-track ${index % 2 === 1 ? "reverse" : ""}`}>
                <span className="marquee-seq" onClick={() => setSelectedProject(project)}>
                  {Array(20).fill(`${project.name} |`).join(" ")}
                </span>
                <span className="marquee-seq" aria-hidden="true" onClick={() => setSelectedProject(project)}>
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
          <button type="submit" className="w-full rounded bg-black p-3 text-white">
            Invia
          </button>
        </form>
      </Modal>

      {/* Footer */}
      <footer className="w-full py-12 border-t-4 border-black text-center text-sm font-bold">
        Alfredo Enrico Iacobucci © {new Date().getFullYear()}
      </footer>

      {/* FULLSCREEN VIEWER */}
      {viewerOpen && selectedProject?.images?.length > 0 && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95">
            {/* Titolo progetto in alto al centro */}
<div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-lg md:text-base font-semibold text-center px-4">
  {selectedProject?.name}
</div>
          {/* Prev / Next */}
          {selectedProject.images.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded bg-white/10 px-4 py-3 text-white backdrop-blur hover:bg-white/20"
                onClick={() =>
                  setViewerIndex((i) => (i - 1 + selectedProject.images.length) % selectedProject.images.length)
                }
                aria-label="Immagine precedente"
              >
                ‹
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded bg-white/10 px-4 py-3 text-white backdrop-blur hover:bg-white/20"
                onClick={() => setViewerIndex((i) => (i + 1) % selectedProject.images.length)}
                aria-label="Immagine successiva"
              >
                ›
              </button>
            </>
          )}

          {/* Immagine fullscreen */}
          <img
            src={selectedProject.images[viewerIndex]}
            alt=""
            className="max-w-[95vw] max-h-[85vh] w-auto h-auto object-contain shadow-2xl"
          />

          {/* Chiudi (ESC) in basso al centro */}
          <button
            className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded bg-white/10 px-5 py-3 text-white backdrop-blur hover:bg-white/20"
            onClick={() => setViewerOpen(false)}
            aria-label="Chiudi visualizzazione"
          >
            ×
          </button>
        </div>
      )}

      <style jsx>{`
      .masonry {
  column-count: 1;
  column-gap: 1.5rem; /* come il vecchio gap-6 */
}
@media (min-width: 768px) {
  .masonry {
    column-count: 2;
  }
}
/* Evita che gli elementi si spezzino tra le colonne */
.masonry-item {
  break-inside: avoid;
  margin-bottom: 1.5rem; /* distanzia verticalmente gli elementi nella colonna */
}
        .marquee-track {
          display: flex;
          align-items: center;
          white-space: nowrap;
          width: max-content;
          will-change: transform;
          animation: marquee 80s linear infinite;
        }
        .marquee-track.reverse {
          animation-direction: reverse;
        }
        .marquee-seq {
          display: inline-block;
          padding-right: 2rem;
          font-size: 7rem;
          font-weight: 800;
          text-transform: uppercase;
          cursor: pointer;
        }
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
