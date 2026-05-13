function DeleteEntryConfirmModal({
  onCancel,
  onConfirm,
  deleting,
  title = "Entry silinsin mi?",
  description = "Entry'i silmek istediğine emin misin?",
  confirmText = "Entry’i sil",
  loadingText = "Siliniyor...",
}) {
  return (
    <div className="confirm-modal-backdrop" onClick={onCancel}>
      <section
        className="confirm-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{title}</h2>

        <p>{description}</p>

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="confirm-cancel-button"
            onClick={onCancel}
            disabled={deleting}
          >
            İptal
          </button>

          <button
            type="button"
            className="confirm-delete-button"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? loadingText : confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}

export default DeleteEntryConfirmModal;
