// components/TopRotator.js
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Banner rotator con crossfade.
 * - Filtra le immagini verticali PRIMA di mostrare qualsiasi cosa.
 * - Start random dopo il filtro.
 * - Due layer stabili (no flash).
 */
export default function TopRotator({
  images = [],
  alt = "",
  className = "relative w-full h-[56vh] overflow-hidden",
  interval = 5200,
  fadeMs = 1000,
  priorityFirst = true,
}) {
  const [bufSrc, setBufSrc] = useState([null, null]);
  const [top, setTop] = useState(0);
  const [fading, setFading] = useState(false);
  const [ready, setReady] = useState(false); // true dopo il filtro

  const slidesRef = useRef([]);
  const curIdxRef = useRef(0);
  const timers = useRef({ dwell: null, fade: null });
  const mounted = useRef(false);

  // Init: filtra verticali, poi mostra la prima immagine orizzontale
  useEffect(() => {
    mounted.current = true;
    setReady(false);
    setBufSrc([null, null]);
    slidesRef.current = [];

    if (!images?.length) return;

    (async () => {
      // Carica dimensioni di tutte le immagini
      const metas = await Promise.all(
        images.map(
          (src) =>
            new Promise((resolve) => {
              const img = new window.Image();
              img.onload = () =>
                resolve({ src, w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
              img.onerror = () => resolve({ src, w: 1, h: 1 });
              img.src = src;
            })
        )
      );
      if (!mounted.current) return;

      // Filtra: solo orizzontali (w >= h)
      const horiz = metas.filter((m) => m.w >= m.h).map((m) => m.src);
      const finalList = horiz.length ? shuffle(horiz) : shuffle(images.slice());
      slidesRef.current = finalList;

      // Parti da un indice random nella lista filtrata
      const rand = Math.floor(Math.random() * finalList.length);
      const next = (rand + 1) % finalList.length;
      curIdxRef.current = rand;

      setBufSrc([finalList[rand], finalList[next] || finalList[0]]);
      setTop(0);
      setFading(false);
      setReady(true);
    })();

    return () => {
      mounted.current = false;
      clearTimeout(timers.current.dwell);
      clearTimeout(timers.current.fade);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  // Ciclo crossfade
  useEffect(() => {
    if (!ready || !slidesRef.current.length) return;

    const loop = () => {
      timers.current.dwell = setTimeout(() => {
        if (!mounted.current) return;

        const list = slidesRef.current;
        const nextIdx = (curIdxRef.current + 1) % list.length;
        const incoming = list[nextIdx];

        const under = 1 - top;
        setBufSrc((prev) => {
          const copy = [...prev];
          copy[under] = incoming;
          return copy;
        });

        setFading(true);

        timers.current.fade = setTimeout(() => {
          if (!mounted.current) return;
          setTop(under);
          setFading(false);
          curIdxRef.current = nextIdx;
          loop();
        }, fadeMs);
      }, Math.max(0, interval - fadeMs));
    };

    loop();
    return () => {
      clearTimeout(timers.current.dwell);
      clearTimeout(timers.current.fade);
    };
  }, [interval, fadeMs, top, ready]);

  // Opacità incrociata
  const aIsTop = top === 0;
  const bIsTop = top === 1;
  const opacityA = aIsTop ? (fading ? 0 : 1) : (fading ? 1 : 0);
  const opacityB = bIsTop ? (fading ? 0 : 1) : (fading ? 1 : 0);

  const layerBase =
    "absolute inset-0 object-cover object-center will-change-opacity pointer-events-none";

  return (
    <div className={`${className} relative`}>
      {/* Layer A — fade-in iniziale quando ready */}
      {bufSrc[0] && (
        <Image
          src={bufSrc[0]}
          alt={alt}
          fill
          priority={priorityFirst}
          className={`${layerBase} ${aIsTop ? "z-20" : "z-10"}`}
          style={{
            opacity: opacityA,
            transition: `opacity ${fadeMs}ms ease-in-out`,
          }}
        />
      )}

      {/* Layer B */}
      {bufSrc[1] && (
        <Image
          src={bufSrc[1]}
          alt={alt}
          fill
          priority={false}
          className={`${layerBase} ${bIsTop ? "z-20" : "z-10"}`}
          style={{
            opacity: opacityB,
            transition: `opacity ${fadeMs}ms ease-in-out`,
          }}
        />
      )}
    </div>
  );
}
