import { useEffect, useState } from "react";
import { Heart, MessageCircle, Repeat2, X } from "lucide-react";

import { createComment, getEntryDetail } from "../api/entryApi.js";
import { uploadMediaFile } from "../api/uploadApi.js";

function Avatar({ user }) {
  return (
    <div className="avatar">
      {user?.profile_image_url ? (
        <img src={user.profile_image_url} alt={user.full_name || "avatar"} />
      ) : (
        user?.full_name?.charAt(0)?.toUpperCase() || "?"
      )}
    </div>
  );
}

function buildMediaPayload(media) {
  if (!media) return [];

  return [
    {
      media_url: media.media_url,
      media_type: media.media_type,
    },
  ];
}

function SmallMediaPreview({ media, onRemove }) {
  if (!media) return null;

  return (
    <div className="inline-selected-media">
      {media.media_type === "video" ? (
        <video src={media.media_url} controls />
      ) : (
        <img src={media.media_url} alt="selected media" />
      )}

      <button type="button" onClick={onRemove}>
        Kaldır
      </button>
    </div>
  );
}

function MediaViewerModal({ entry, media, onClose }) {
  const currentUser = JSON.parse(localStorage.getItem("user"));

  const [detail, setDetail] = useState(null);
  const [comment, setComment] = useState("");
  const [uploadedMedia, setUploadedMedia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function fetchDetail() {
    if (!entry?.id) return;

    setLoading(true);
    setError("");

    try {
      const result = await getEntryDetail(entry.id);
      setDetail(result.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files[0];

    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const result = await uploadMediaFile(file);
      setUploadedMedia(result.data);
      event.target.value = "";
    } catch (error) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleCreateComment(event) {
    event.preventDefault();

    const normalizedComment = comment.trim();
    const mediaPayload = buildMediaPayload(uploadedMedia);

    if (!normalizedComment && mediaPayload.length === 0) {
      setError("Yanıt için yazı veya medya eklemelisin.");
      return;
    }

    setCommenting(true);
    setError("");

    try {
      await createComment(entry.id, {
        content: normalizedComment,
        media: mediaPayload,
      });

      setComment("");
      setUploadedMedia(null);
      event.target.reset();

      await fetchDetail();
    } catch (error) {
      setError(error.message);
    } finally {
      setCommenting(false);
    }
  }

  useEffect(() => {
    fetchDetail();
  }, [entry?.id]);

  const shownEntry = detail?.entry || entry;
  const comments = detail?.children || [];

  return (
    <div className="media-viewer-backdrop">
      <button type="button" className="media-viewer-close" onClick={onClose}>
        <X size={22} />
      </button>

      <section className="media-viewer-shell">
        <div className="media-viewer-media-panel">
          {media.media_type === "video" ? (
            <video src={media.media_url} controls autoPlay />
          ) : (
            <img src={media.media_url} alt="entry media" />
          )}
        </div>

        <aside className="media-viewer-side-panel">
          <div className="media-viewer-entry">
            <div className="entry-card-header">
              <Avatar user={shownEntry.author} />

              <div className="entry-author-line">
                <strong>{shownEntry.author?.full_name}</strong>
                <span>@{shownEntry.author?.username}</span>
              </div>
            </div>

            {shownEntry.content && (
              <p className="media-viewer-entry-content">{shownEntry.content}</p>
            )}

            <div className="media-viewer-actions">
              <span>
                <MessageCircle size={17} />
                {shownEntry.stats?.comments_count || 0}
              </span>

              <span>
                <Repeat2 size={17} />
                {shownEntry.stats?.reposts_count || 0}
              </span>

              <span>
                <Heart size={17} />
                {shownEntry.stats?.likes_count || 0}
              </span>
            </div>
          </div>

          <form className="media-viewer-reply-box" onSubmit={handleCreateComment}>
            <Avatar user={currentUser} />

            <div className="media-viewer-reply-main">
              <input
                placeholder="Yanıtını gönder"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />

              <SmallMediaPreview
                media={uploadedMedia}
                onRemove={() => setUploadedMedia(null)}
              />
            </div>

            <label className="icon-upload-button">
              {uploading ? "..." : "+"}
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>

            <button type="submit" disabled={commenting || uploading}>
              {commenting ? "..." : "Yanıtla"}
            </button>
          </form>

          {error && <div className="error-message media-viewer-error">{error}</div>}

          {loading && <div className="media-viewer-empty">Yükleniyor...</div>}

          {!loading && comments.length === 0 && (
            <div className="media-viewer-empty">Henüz yorum yok.</div>
          )}

          {!loading && comments.length > 0 && (
            <div className="media-viewer-comments">
              {comments.map((commentItem) => (
                <article className="media-viewer-comment" key={commentItem.id}>
                  <Avatar user={commentItem.author} />

                  <div>
                    <div className="entry-author-line">
                      <strong>{commentItem.author?.full_name}</strong>
                      <span>@{commentItem.author?.username}</span>
                    </div>

                    <p>{commentItem.content}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

export default MediaViewerModal;
