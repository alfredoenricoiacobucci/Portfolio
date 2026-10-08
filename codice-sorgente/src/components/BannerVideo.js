// components/BannerVideo.js
// Video del banner in rotazione: ogni video scorre fino alla fine, poi
// sfuma nel successivo. Sotto resta la foto del banner, così non si vede
// mai il nero mentre il primo video si carica (o se il telefono blocca la
// riproduzione automatica, ad esempio in risparmio energetico).
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const FADE_MS = 1200;

export default function BannerVideo({ videos = [], poster = null, alt = "", className = "" }) {
  const aRef = useRef(null);
  const bRef = useRef(null);
  const [top, setTop] = useState(0); // layer visibile: 0 = A, 1 = B
  const [started, setStarted] = useState(false);
  const idxRef = useRef(0);
  const topRef = useRef(0);
  const busyRef = useRef(false);

  const layers = () => [aRef.current, bRef.current];

  useEffect(() => {
    const [a, b] = layers();
    if (!a || !videos.length) return;
    a.muted = true;
    if (b) b.muted = true;
    idxRef.current = 0;
    topRef.current = 0;
    busyRef.current = false;
    setTop(0);
    setStarted(false);

    a.src = videos[0];
    a.loop = videos.length === 1;
    a.play().catch(() => {});
    if (b && videos.length > 1) {
      b.src = videos[1 % videos.length];
      b.preload = "auto";
      b.load();
    }
    return () => {
      [a, b].forEach((v) => {
        if (!v) return;
        v.pause();
        v.removeAttribute("src");
        v.load();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos.join("|")]);

  const next = () => {
    if (videos.length < 2 || busyRef.current) return;
    busyRef.current = true;
    const cur = topRef.current;
    const nxt = 1 - cur;
    const els = layers();
    const incoming = els[nxt];
    const outgoing = els[cur];
    if (!incoming) return;
    incoming.currentTime = 0;
    incoming.play().catch(() => {});
    topRef.current = nxt;
    setTop(nxt);
    idxRef.current = (idxRef.current + 1) % videos.length;
    setTimeout(() => {
      // il layer appena nascosto prepara il video dopo
      if (outgoing) {
        outgoing.pause();
        outgoing.src = videos[(idxRef.current + 1) % videos.length];
        outgoing.preload = "auto";
        outgoing.load();
      }
      busyRef.current = false;
    }, FADE_MS + 50);
  };

  // Parte la sfumatura poco prima della fine, mentre l'ultimo fotogramma è ancora in movimento
  const onTime = (layer) => (e) => {
    if (layer !== topRef.current || videos.length < 2) return;
    const v = e.currentTarget;
    if (v.duration && v.duration - v.currentTime <= FADE_MS / 1000) next();
  };
  const onEnded = (layer) => () => {
    if (layer === topRef.current) next();
  };

  const videoStyle = (layer) => ({
    opacity: started && top === layer ? 1 : 0,
    transition: `opacity ${FADE_MS}ms ease-in-out`,
    zIndex: top === layer ? 22 : 21,
  });

  return (
    <div className={`${className} relative`}>
      {poster && (
        <Image
          src={poster.src || poster}
          alt={alt}
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 object-cover object-center z-10 pointer-events-none"
        />
      )}
      {[aRef, bRef].map((ref, layer) => (
        <video
          key={layer}
          ref={ref}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={videoStyle(layer)}
          muted
          playsInline
          preload={layer === 0 ? "auto" : "none"}
          disablePictureInPicture
          aria-hidden="true"
          onPlaying={() => { if (layer === 0) setStarted(true); }}
          onTimeUpdate={onTime(layer)}
          onEnded={onEnded(layer)}
        />
      ))}
    </div>
  );
}
