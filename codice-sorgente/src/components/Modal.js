// components/Modal.js
import { useCallback, useEffect, useRef } from "react";

/**
 * Modale per il form contatti.
 *
 * Rispetto a prima: chiude con Escape, blocca lo scroll del fondo, sposta il
 * focus dentro e lo riporta sull'elemento che l'aveva aperta, e tiene il Tab
 * all'interno. Senza queste cose, aprendo la modale col Tab si continuava a
 * navigare la pagina sottostante, invisibile dietro il blur.
 */
export default function Modal({ open, onClose, title, children, mode = "artwork" }) {
  const panelRef = useRef(null);
  const restoreFocusRef = useRef(null);

  const isDark = mode === "professional";
  const bg = isDark ? "bg-black" : "bg-white";
  const text = isDark ? "text-white" : "text-black";
  const border = isDark ? "border-white/20" : "border-black/15";
  const overlayBg = isDark ? "bg-white/10" : "bg-black/40";

  const focusables = useCallback(
    () =>
      Array.from(
        panelRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) || []
      ),
    []
  );

  // Apertura: memorizza il focus corrente, lo sposta nella modale, blocca lo scroll.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const first = focusables()[0];
    (first || panelRef.current)?.focus?.();

    return () => {
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open, focusables]);

  // Escape chiude, Tab resta dentro.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose, focusables]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${overlayBg} p-4 fade-in`}
      style={{ animationDuration: "200ms", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`${bg} ${text} max-w-md w-full border ${border}`}
      >
        {/* Header minimale */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
          {/* SVG al posto del carattere ✕, che dipendeva dal font */}
          <button
            type="button"
            className={`inline-flex items-center justify-center w-11 h-11 -mr-3 transition-transform hover:scale-110 hover-red ${
              isDark ? "text-white" : "text-black"
            }`}
            onClick={onClose}
            aria-label="Chiudi"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}
