import { useState } from "react";
import { X } from "lucide-react";

import { createQuote } from "../api/entryApi.js";
import { uploadMediaFile } from "../api/uploadApi.js";

function buildMediaPayload(media) {
  if (!media) return [];

  return [
    {
      media_url: media.media_url,
      media_type: media.media_type,
    },
  ];
}

function MediaPreview({ media, onRemove }) {
  if (!media) return null;

  return (
    <>
      <div className="media-preview">
        {media.media_type === "video" ? (
          <video src={media.media_url} controls />
        ) : (
          <img src={media.media_url} alt="media preview" />
        )}
      </div>

      <button
        type="button"
        className="remove-media-button"
        onClick={onRemove}
      >
        Medyayı kaldır
      </button>
    </>
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

function QuoteModal({ originalEntry, onClose, onCreated }) {
  const [content, setContent] = useState("");
  const [uploadedMedia, setUploadedMedia] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(event) {
    const file = event.target.files[0];

    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const result = await uploadMediaFile(file);
      setUploadedMedia(result.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedContent = content.trim();
    const media = buildMediaPayload(uploadedMedia);

    if (!normalizedContent && media.length === 0) {
      setError("Quote için yazı veya medya eklemelisin.");
      return;
    }

    setPosting(true);
    setError("");

    try {
      const result = await createQuote(originalEntry.id, {
        content: normalizedContent,
        media,
      });

      setContent("");
      setUploadedMedia(null);

      if (onCreated) {
        onCreated(result);
      }

      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="quote-modal" onClick={(event) => event.stopPropagation()}>
        <header className="quote-modal-header">
          <h2>Quote</h2>

          <button type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        {error && <div className="error-message">{error}</div>}

        <form className="quote-form" onSubmit={handleSubmit}>
          <textarea
            placeholder="Bu gönderi hakkında ne düşünüyorsun?"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />

          <label className="file-upload-button icon-upload-button">
            {uploading ? "..." : "+"}
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>

          <MediaPreview
            media={uploadedMedia}
            onRemove={() => setUploadedMedia(null)}
          />

          <EmbeddedOriginalEntry entry={originalEntry} />

          <div className="quote-modal-footer">
            <button type="submit" disabled={posting || uploading}>
              {posting ? "Paylaşılıyor..." : "Post Paylaş"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default QuoteModal;
