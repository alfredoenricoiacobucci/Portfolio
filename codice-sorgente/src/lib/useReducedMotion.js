// lib/useReducedMotion.js
// Il blocco @media (prefers-reduced-motion) in globals.css copre solo le
// animazioni CSS. Restavano fuori quelle guidate da JS, che su questo sito
// sono le più invadenti: lo scroll dell'objectPosition del banner (rAF),
// l'auto-switch della landing ogni 2.5s e la rotazione del banner ogni 4s.

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/** true se l'utente ha chiesto meno animazioni. Reagisce ai cambi di sistema. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    setReduced(mq.matches);
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** Variante sincrona, per codice fuori da React (handler, rAF). */
export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}
