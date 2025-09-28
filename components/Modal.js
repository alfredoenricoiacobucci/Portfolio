// components/Modal.jsx 
export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="w-full max-w-lg bg-white text-black rounded-lg shadow-2xl border-2 border-black">
        <div className="flex items-center justify-between p-4 border-b-2 border-black">
          <h3 className="text-xl font-bold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="text-2xl leading-none px-2 -mt-1"
            title="Chiudi"
          >
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
