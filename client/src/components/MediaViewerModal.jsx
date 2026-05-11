import { useEffect, useState } from "react";
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  Repeat2,
  Trash2,
  X,
} from "lucide-react";

import DeleteEntryConfirmModal from "./DeleteEntryConfirmModal.jsx";
import EditEntryModal from "./EditEntryModal.jsx";
import {
  createComment,
  deleteEntry,
  getEntryDetail,
} from "../api/entryApi.js";
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

function formatFullDateTime(createdAt) {
  if (!createdAt) return "";

  return new Date(createdAt).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isUpdated(entry) {
  if (!entry?.created_at || !entry?.updated_at) return false;

  const createdTime = new Date(entry.created_at).getTime();
  const updatedTime = new Date(entry.updated_at).getTime();

  return updatedTime > createdTime + 1000;
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

function MediaViewerModal({
  entry,
  media,
  onClose,
  onEntryDeleted,
  onEntryUpdated,
}) {
  const currentUser = JSON.parse(localStorage.getItem("user"));

  const [detail, setDetail] = useState(null);
  const [comment, setComment] = useState("");
  const [uploadedMedia, setUploadedMedia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

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

  async function handleDeleteEntry() {
    setDeleting(true);
    setError("");

    try {
      await deleteEntry(shownEntry.id);

      if (onEntryDeleted) {
        onEntryDeleted(shownEntry.id);
      }

      setDeleteModalOpen(false);
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setDeleting(false);
    }
  }

  function handleUpdatedEntry(updatedItem) {
    const updatedEntry = updatedItem?.entry || updatedItem;

    setDetail((current) => {
      if (!current) return current;

      return {
        ...current,
        entry: {
          ...current.entry,
          ...updatedEntry,
        },
      };
    });

    if (onEntryUpdated) {
      onEntryUpdated(
        updatedItem?.entry
          ? updatedItem
          : {
              entry: updatedEntry,
            }
      );
    }
  }

  useEffect(() => {
    fetchDetail();
  }, [entry?.id]);

  const shownEntry = detail?.entry || entry;
  const comments = detail?.children || [];
  const canManageEntry =
    String(currentUser?.id) === String(shownEntry?.author?.id) &&
    !shownEntry?.is_deleted &&
    shownEntry?.type !== "REPOST";

  const updated = isUpdated(shownEntry);
  const shownDate = updated ? shownEntry?.updated_at : shownEntry?.created_at;
  const fullDateTime = formatFullDateTime(shownDate);
  const dateText = updated
    ? `${fullDateTime} tarihinde güncellendi`
    : fullDateTime;

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
            <div className="media-viewer-entry-top">
              <div className="entry-card-header">
                <Avatar user={shownEntry.author} />

                <div className="entry-author-line">
                  <strong>{shownEntry.author?.full_name}</strong>
                  <span>@{shownEntry.author?.username}</span>
                </div>
              </div>

              {canManageEntry && (
                <div className="entry-owner-menu-wrapper">
                  <button
                    type="button"
                    className="entry-owner-menu-button"
                    onClick={() => setOwnerMenuOpen((current) => !current)}
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {ownerMenuOpen && (
                    <div className="entry-owner-menu media-viewer-owner-menu">
                      <button
                        type="button"
                        onClick={() => {
                          setOwnerMenuOpen(false);
                          setEditModalOpen(true);
                        }}
                      >
                        <PenLine size={16} />
                        <span>Entry'i güncelle</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOwnerMenuOpen(false);
                          setDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 size={16} />
                        <span>Entry'i sil</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {shownEntry.content && (
              <p className="media-viewer-entry-content">{shownEntry.content}</p>
            )}

            {dateText && <p className="media-viewer-date">{dateText}</p>}

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

      {editModalOpen && (
        <EditEntryModal
          entry={shownEntry}
          embeddedOriginalEntry={detail?.embedded_original_entry}
          onClose={() => setEditModalOpen(false)}
          onUpdated={handleUpdatedEntry}
        />
      )}

      {deleteModalOpen && (
        <DeleteEntryConfirmModal
          deleting={deleting}
          onCancel={() => setDeleteModalOpen(false)}
          onConfirm={handleDeleteEntry}
        />
      )}
    </div>
  );
}

export default MediaViewerModal;
