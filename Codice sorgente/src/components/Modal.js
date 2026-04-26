// components/Modal.jsx
import React from "react";

export default function Modal({ open, onClose, title, children, mode = "artwork" }) {
  if (!open) return null;

  const isDark = mode === "professional";
  const bg = isDark ? "bg-black" : "bg-white";
  const text = isDark ? "text-white" : "text-black";
  const border = isDark ? "border-white/20" : "border-black/15";
  const overlayBg = isDark ? "bg-white/10" : "bg-black/40";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${overlayBg} p-4 fade-in`}
      style={{ animationDuration: "200ms", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={`${bg} ${text} max-w-md w-full border ${border}`}>
        {/* Header minimale */}
        <div className={`flex items-center justify-between px-6 pt-6 pb-4`}>
          <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
          <button
            className={`text-2xl hover:scale-110 transition-all hover-red ${isDark ? "text-white" : "text-black"}`}
            onClick={onClose}
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}
