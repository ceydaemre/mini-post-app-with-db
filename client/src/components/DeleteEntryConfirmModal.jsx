function DeleteEntryConfirmModal({ onCancel, onConfirm, deleting }) {
  return (
    <div className="confirm-modal-backdrop" onClick={onCancel}>
      <section
        className="confirm-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>Entry silinsin mi?</h2>

        <p>Entry'i silmek istediğine emin misin?</p>

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
            {deleting ? "Siliniyor..." : "Sil"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default DeleteEntryConfirmModal;
