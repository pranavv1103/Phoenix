export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  errorMessage,
}) {
  if (!isOpen) return null;

  const handleOverlayClick = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onClick={handleOverlayClick}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"></div>

      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 md:p-7 animate-slide-up"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">Delete Post</h3>
        <p className="text-gray-600 text-center mb-5">
          Are you sure you want to delete this post? This action cannot be undone.
        </p>

        {errorMessage && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-semibold hover:from-rose-700 hover:to-pink-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
