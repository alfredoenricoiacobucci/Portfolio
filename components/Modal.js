export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h3 className="mb-4 text-2xl font-bold">{title}</h3>}
        {children}
        <button
          className="mt-6 w-full rounded bg-black px-4 py-3 text-white"
          onClick={onClose}
          type="button"
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
