import { useState } from "react";
import { X } from "lucide-react";

import { updateEntry } from "../api/entryApi.js";
import { uploadMediaFile } from "../api/uploadApi.js";

function normalizeMedia(media) {
  if (!Array.isArray(media)) return [];

  return media
    .filter((item) => item?.media_url && item?.media_type)
    .map((item) => ({
      media_url: item.media_url,
      media_type: item.media_type,
    }));
}

function MediaPreview({ media, onRemove }) {
  if (!media) return null;

  return (
    <div className="edit-entry-media-preview">
      {media.media_type === "video" ? (
        <video src={media.media_url} controls />
      ) : (
        <img src={media.media_url} alt="entry media" />
      )}

      <button type="button" onClick={onRemove}>
        Medyayı kaldır
      </button>
    </div>
  );
}

function EmbeddedOriginalEntry({ entry }) {
  if (!entry) return null;

  return (
    <div className="quote-embedded-card">
      <header className="quote-embedded-header">
        <div className="avatar quote-embedded-avatar">
          {entry.author?.profile_image_url ? (
            <img src={entry.author.profile_image_url} alt={entry.author.full_name || "avatar"} />
          ) : (
            entry.author?.full_name?.charAt(0)?.toUpperCase() || "?"
          )}
        </div>

        <div className="entry-author-line">
          <strong>{entry.author?.full_name}</strong>
          <span>@{entry.author?.username}</span>
        </div>
      </header>

      <p>{entry.is_deleted ? "Bu gönderi silinmiş." : entry.content}</p>
    </div>
  );
}

function EditEntryModal({ entry, embeddedOriginalEntry, onClose, onUpdated }) {
  const [content, setContent] = useState(entry.content || "");
  const [media, setMedia] = useState(normalizeMedia(entry.media));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedMedia = media[0] || null;

  async function handleFileChange(event) {
    const file = event.target.files[0];

    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const result = await uploadMediaFile(file);

      setMedia([
        {
          media_url: result.data.media_url,
          media_type: result.data.media_type,
        },
      ]);

      event.target.value = "";
    } catch (error) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedContent = content.trim();

    if (!normalizedContent && media.length === 0) {
      setError("Entry için yazı veya medya eklemelisin.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const result = await updateEntry(entry.id, {
        content: normalizedContent,
        media,
      });

      onUpdated(result.data);
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="edit-entry-modal" onClick={(event) => event.stopPropagation()}>
        <header className="edit-entry-modal-header">
          <h2>Entry Güncelle</h2>

          <button type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        {error && <div className="error-message">{error}</div>}

        <form className="edit-entry-form" onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Ne düşünüyorsun?"
          />

          <div className="modal-compose-actions">
            <label className="icon-upload-button">
              {uploading ? "..." : "+"}
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>

            <button type="submit" disabled={saving || uploading}>
              {saving ? "..." : "Kaydet"}
            </button>
          </div>

          <MediaPreview
            media={selectedMedia}
            onRemove={() => setMedia([])}
          />

          <EmbeddedOriginalEntry entry={embeddedOriginalEntry} />
        </form>
      </section>
    </div>
  );
}

export default EditEntryModal;
