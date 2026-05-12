import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import QuoteModal from "./QuoteModal.jsx";
import {
  createComment,
  deleteEntry,
  getEntryDetail,
  toggleEntryLike,
  toggleEntryRepost,
} from "../api/entryApi.js";
import { uploadMediaFile } from "../api/uploadApi.js";

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

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

function getEntryDateText(entry) {
  const updated = isUpdated(entry);
  const shownDate = updated ? entry?.updated_at : entry?.created_at;
  const fullDateTime = formatFullDateTime(shownDate);

  if (!fullDateTime) return "";

  return updated
    ? `${fullDateTime} tarihinde güncellendi`
    : fullDateTime;
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

function MediaPreview({ media }) {
  if (!Array.isArray(media) || media.length === 0) return null;

  return (
    <div className="media-viewer-comment-media-list">
      {media.map((item) => (
        <div className="media-viewer-comment-media" key={item.id || item.media_url}>
          {item.media_type === "video" ? (
            <video src={item.media_url} controls />
          ) : (
            <img src={item.media_url} alt="comment media" />
          )}
        </div>
      ))}
    </div>
  );
}

function MediaViewerMainActions({ entry, onOpenDetail }) {
  const [liked, setLiked] = useState(Boolean(entry?.viewer_state?.is_liked_by_me));
  const [reposted, setReposted] = useState(Boolean(entry?.viewer_state?.is_reposted_by_me));
  const [likesCount, setLikesCount] = useState(entry?.stats?.likes_count || 0);
  const [repostsCount, setRepostsCount] = useState(entry?.stats?.reposts_count || 0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [repostLoading, setRepostLoading] = useState(false);
  const [repostMenuOpen, setRepostMenuOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  useEffect(() => {
    setLiked(Boolean(entry?.viewer_state?.is_liked_by_me));
    setReposted(Boolean(entry?.viewer_state?.is_reposted_by_me));
    setLikesCount(entry?.stats?.likes_count || 0);
    setRepostsCount(entry?.stats?.reposts_count || 0);
  }, [entry]);

  async function handleLike() {
    if (likeLoading || entry?.is_deleted) return;

    const nextLiked = !liked;

    setLiked(nextLiked);
    setLikesCount((current) => current + (nextLiked ? 1 : -1));
    setLikeLoading(true);

    try {
      await toggleEntryLike(entry.id);
    } catch {
      setLiked(!nextLiked);
      setLikesCount((current) => current + (nextLiked ? -1 : 1));
    } finally {
      setLikeLoading(false);
    }
  }

  async function handleRepost() {
    if (repostLoading || entry?.is_deleted) return;

    const nextReposted = !reposted;

    setRepostMenuOpen(false);
    setReposted(nextReposted);
    setRepostsCount((current) => current + (nextReposted ? 1 : -1));
    setRepostLoading(true);

    try {
      await toggleEntryRepost(entry.id);
    } catch {
      setReposted(!nextReposted);
      setRepostsCount((current) => current + (nextReposted ? -1 : 1));
    } finally {
      setRepostLoading(false);
    }
  }

  function handleQuoteClick() {
    setRepostMenuOpen(false);
    setQuoteModalOpen(true);
  }

  function handleQuoteCreated() {
    setQuoteModalOpen(false);
  }

  return (
    <>
      <div className="media-viewer-actions">
        <button
          type="button"
          className="media-viewer-main-action comment-button"
          onClick={() => onOpenDetail(entry.id)}
        >
          <MessageCircle size={17} />
          <span>{entry?.stats?.comments_count || 0}</span>
        </button>

        <div className="repost-action-wrapper media-viewer-repost-wrapper">
          <button
            type="button"
            className={`media-viewer-main-action repost-button ${reposted ? "reposted" : ""}`}
            onClick={() => setRepostMenuOpen((current) => !current)}
            disabled={repostLoading}
          >
            <Repeat2 size={17} />
            {repostsCount}
          </button>

          {repostMenuOpen && (
            <div className="repost-menu media-viewer-repost-menu">
              <button type="button" onClick={handleRepost}>
                <Repeat2 size={17} />
                <span>{reposted ? "Repostu kaldır" : "Repost"}</span>
              </button>

              <button type="button" onClick={handleQuoteClick}>
                <PenLine size={17} />
                <span>Quote</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className={`media-viewer-main-action like-button ${liked ? "liked" : ""}`}
          onClick={handleLike}
          disabled={likeLoading}
        >
          <Heart size={17} fill={liked ? "currentColor" : "none"} />
          {likesCount}
        </button>
      </div>

      {quoteModalOpen && (
        <QuoteModal
          originalEntry={entry}
          onClose={() => setQuoteModalOpen(false)}
          onCreated={handleQuoteCreated}
        />
      )}
    </>
  );
}

function MediaViewerComment({
  commentItem,
  onOpenCommentDetail,
  onDeleted,
  onUpdated,
}) {
  const currentUser = getCurrentUser();

  const [localComment, setLocalComment] = useState(commentItem);
  const [liked, setLiked] = useState(Boolean(commentItem.viewer_state?.is_liked_by_me));
  const [reposted, setReposted] = useState(Boolean(commentItem.viewer_state?.is_reposted_by_me));
  const [likesCount, setLikesCount] = useState(commentItem.stats?.likes_count || 0);
  const [repostsCount, setRepostsCount] = useState(commentItem.stats?.reposts_count || 0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [repostLoading, setRepostLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [repostMenuOpen, setRepostMenuOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    setLocalComment(commentItem);
    setLiked(Boolean(commentItem.viewer_state?.is_liked_by_me));
    setReposted(Boolean(commentItem.viewer_state?.is_reposted_by_me));
    setLikesCount(commentItem.stats?.likes_count || 0);
    setRepostsCount(commentItem.stats?.reposts_count || 0);
  }, [commentItem]);

  const canManageEntry =
    String(currentUser?.id) === String(localComment.author?.id) &&
    !localComment.is_deleted &&
    localComment.type !== "REPOST";

  const dateText = getEntryDateText(localComment);

  async function handleLike(event) {
    event.stopPropagation();

    if (likeLoading || localComment.is_deleted) return;

    const nextLiked = !liked;

    setLiked(nextLiked);
    setLikesCount((current) => current + (nextLiked ? 1 : -1));
    setLikeLoading(true);

    try {
      await toggleEntryLike(localComment.id);
    } catch {
      setLiked(!nextLiked);
      setLikesCount((current) => current + (nextLiked ? -1 : 1));
    } finally {
      setLikeLoading(false);
    }
  }

  async function handleRepost(event) {
    event.stopPropagation();

    if (repostLoading || localComment.is_deleted) return;

    const nextReposted = !reposted;

    setRepostMenuOpen(false);
    setReposted(nextReposted);
    setRepostsCount((current) => current + (nextReposted ? 1 : -1));
    setRepostLoading(true);

    try {
      await toggleEntryRepost(localComment.id);
    } catch {
      setReposted(!nextReposted);
      setRepostsCount((current) => current + (nextReposted ? -1 : 1));
    } finally {
      setRepostLoading(false);
    }
  }

  async function handleDeleteEntry() {
    if (deleteLoading) return;

    setDeleteLoading(true);

    try {
      await deleteEntry(localComment.id);
      setDeleteModalOpen(false);

      if (onDeleted) {
        onDeleted(localComment.id);
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleUpdatedEntry(updatedItem) {
    const updatedEntry = updatedItem?.entry || updatedItem;

    const nextComment = {
      ...localComment,
      ...updatedEntry,
    };

    setLocalComment(nextComment);
    setEditModalOpen(false);

    if (onUpdated) {
      onUpdated(nextComment);
    }
  }

  function handleQuoteClick(event) {
    event.stopPropagation();
    setRepostMenuOpen(false);
    setQuoteModalOpen(true);
  }

  return (
    <>
      <article
        className="media-viewer-comment clickable-media-viewer-comment"
        onClick={() => onOpenCommentDetail(localComment.id)}
      >
        <Avatar user={localComment.author} />

        <div className="media-viewer-comment-body">
          <div className="media-viewer-comment-header">
            <div className="entry-author-line">
              <strong>{localComment.author?.full_name}</strong>
              <span>@{localComment.author?.username}</span>
            </div>

            {canManageEntry && (
              <div className="entry-owner-menu-wrapper">
                <button
                  type="button"
                  className="entry-owner-menu-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOwnerMenuOpen((current) => !current);
                  }}
                >
                  <MoreHorizontal size={17} />
                </button>

                {ownerMenuOpen && (
                  <div
                    className="entry-owner-menu media-viewer-comment-owner-menu"
                    onClick={(event) => event.stopPropagation()}
                  >
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

          <p>{localComment.is_deleted ? "Bu gönderi silinmiş." : localComment.content}</p>

          <MediaPreview media={localComment.media} />

          {dateText && <p className="media-viewer-comment-date">{dateText}</p>}

          <div className="media-viewer-comment-actions">
            <button
              type="button"
              className="media-viewer-comment-action comment-button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenCommentDetail(localComment.id);
              }}
            >
              <MessageCircle size={15} />
              <span>{localComment.stats?.comments_count || 0}</span>
            </button>

            <div className="repost-action-wrapper media-viewer-comment-repost-wrapper">
              <button
                type="button"
                className={`media-viewer-comment-action repost-button ${
                  reposted ? "reposted" : ""
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  setRepostMenuOpen((current) => !current);
                }}
                disabled={repostLoading}
              >
                <Repeat2 size={15} />
                <span>{repostsCount}</span>
              </button>

              {repostMenuOpen && (
                <div
                  className="repost-menu media-viewer-comment-repost-menu"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button type="button" onClick={handleRepost}>
                    <Repeat2 size={17} />
                    <span>{reposted ? "Repostu kaldır" : "Repost"}</span>
                  </button>

                  <button type="button" onClick={handleQuoteClick}>
                    <PenLine size={17} />
                    <span>Quote</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              className={`media-viewer-comment-action like-button ${
                liked ? "liked" : ""
              }`}
              onClick={handleLike}
              disabled={likeLoading}
            >
              <Heart size={15} fill={liked ? "currentColor" : "none"} />
              <span>{likesCount}</span>
            </button>
          </div>
        </div>
      </article>

      {quoteModalOpen && (
        <QuoteModal
          originalEntry={localComment}
          onClose={() => setQuoteModalOpen(false)}
          onCreated={() => setQuoteModalOpen(false)}
        />
      )}

      {editModalOpen && (
        <EditEntryModal
          entry={localComment}
          embeddedOriginalEntry={null}
          onClose={() => setEditModalOpen(false)}
          onUpdated={handleUpdatedEntry}
        />
      )}

      {deleteModalOpen && (
        <DeleteEntryConfirmModal
          deleting={deleteLoading}
          onCancel={() => setDeleteModalOpen(false)}
          onConfirm={handleDeleteEntry}
        />
      )}
    </>
  );
}

function MediaViewerModal({
  entry,
  media,
  onClose,
  onEntryDeleted,
  onEntryUpdated,
}) {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

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

  function handleCommentDeleted(commentId) {
    setDetail((current) => {
      if (!current) return current;

      return {
        ...current,
        children: current.children.filter(
          (child) => Number(child.id) !== Number(commentId)
        ),
      };
    });
  }

  function handleCommentUpdated(updatedComment) {
    setDetail((current) => {
      if (!current) return current;

      return {
        ...current,
        children: current.children.map((child) =>
          Number(child.id) === Number(updatedComment.id)
            ? {
                ...child,
                ...updatedComment,
              }
            : child
        ),
      };
    });
  }

  function handleOpenCommentDetail(commentId) {
    onClose();
    navigate(`/entries/${commentId}`);
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

  const dateText = getEntryDateText(shownEntry);

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

            <MediaViewerMainActions
              entry={shownEntry}
              onOpenDetail={handleOpenCommentDetail}
            />
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
                <MediaViewerComment
                  key={commentItem.id}
                  commentItem={commentItem}
                  onOpenCommentDetail={handleOpenCommentDetail}
                  onDeleted={handleCommentDeleted}
                  onUpdated={handleCommentUpdated}
                />
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
