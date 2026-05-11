import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  Repeat2,
  Trash2,
} from "lucide-react";

import EditEntryModal from "./EditEntryModal.jsx";
import QuoteModal from "./QuoteModal.jsx";
import {
  deleteEntry,
  toggleEntryLike,
  toggleEntryRepost,
} from "../api/entryApi.js";

function formatRelativeTime(createdAt) {
  if (!createdAt) return "";

  const createdDate = new Date(createdAt);
  const now = new Date();

  const diffMs = now - createdDate;
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    const seconds = Math.max(diffSeconds, 1);
    return `${seconds} sn`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffMinutes < 60) {
    return `${diffMinutes} dk`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} sa`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays <= 7) {
    return `${diffDays} g`;
  }

  return createdDate.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatFullDateTime(createdAt) {
  if (!createdAt) return "";

  const createdDate = new Date(createdAt);

  return createdDate.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function MediaRenderer({ media }) {
  if (!media || media.length === 0) return null;

  return (
    <div className="entry-media-grid">
      {media.map((item) => (
        <div className="entry-media-item" key={item.id || item.media_url}>
          {item.media_type === "video" ? (
            <video src={item.media_url} controls />
          ) : (
            <img src={item.media_url} alt="entry media" />
          )}
        </div>
      ))}
    </div>
  );
}

function EntryCard({
  item,
  compact = false,
  showCreatedAt = false,
  onEntryCreated,
  onEntryDeleted,
  onEntryUpdated,
}) {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user"));

  const [localItem, setLocalItem] = useState(item);
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    setLocalItem(item);
  }, [item]);

  const entry = localItem.entry;

  if (!entry) {
    return null;
  }

  const isMyEntry = String(currentUser?.id) === String(entry.author?.id);

  const [liked, setLiked] = useState(
    Boolean(entry.viewer_state?.is_liked_by_me)
  );

  const [reposted, setReposted] = useState(
    Boolean(entry.viewer_state?.is_reposted_by_me)
  );

  const [likesCount, setLikesCount] = useState(entry.stats?.likes_count || 0);
  const [repostsCount, setRepostsCount] = useState(
    entry.stats?.reposts_count || 0
  );

  const [likeLoading, setLikeLoading] = useState(false);
  const [repostLoading, setRepostLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [repostMenuOpen, setRepostMenuOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  async function handleLike(event) {
    event.stopPropagation();

    if (likeLoading || entry.is_deleted) return;

    const nextLiked = !liked;

    setLiked(nextLiked);
    setLikesCount((current) => current + (nextLiked ? 1 : -1));
    setLikeLoading(true);

    try {
      await toggleEntryLike(entry.id);
    } catch (error) {
      setLiked(!nextLiked);
      setLikesCount((current) => current + (nextLiked ? -1 : 1));
    } finally {
      setLikeLoading(false);
    }
  }

  async function handleRepost(event) {
    event.stopPropagation();

    if (repostLoading || entry.is_deleted) return;

    const nextReposted = !reposted;

    setRepostMenuOpen(false);
    setReposted(nextReposted);
    setRepostsCount((current) => current + (nextReposted ? 1 : -1));
    setRepostLoading(true);

    try {
      await toggleEntryRepost(entry.id);
    } catch (error) {
      setReposted(!nextReposted);
      setRepostsCount((current) => current + (nextReposted ? -1 : 1));
    } finally {
      setRepostLoading(false);
    }
  }

  async function handleDeleteEntry(event) {
    event.stopPropagation();

    if (deleteLoading) return;

    const confirmed = window.confirm("Bu entry silinsin mi?");

    if (!confirmed) return;

    setDeleteLoading(true);
    setOwnerMenuOpen(false);

    try {
      await deleteEntry(entry.id);

      const deletedEntry = {
        ...entry,
        is_deleted: true,
        content: null,
        media: [],
      };

      const nextItem = {
        ...localItem,
        entry: deletedEntry,
      };

      setLocalItem(nextItem);

      if (onEntryDeleted) {
        onEntryDeleted(entry.id);
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleUpdatedEntry(updatedEntry) {
    const nextItem = {
      ...localItem,
      entry: {
        ...entry,
        ...updatedEntry,
      },
    };

    setLocalItem(nextItem);

    if (onEntryUpdated) {
      onEntryUpdated(nextItem);
    }
  }

  function handleOwnerMenuClick(event) {
    event.stopPropagation();
    setOwnerMenuOpen((current) => !current);
  }

  function handleEditClick(event) {
    event.stopPropagation();
    setOwnerMenuOpen(false);
    setEditModalOpen(true);
  }

  function handleRepostButtonClick(event) {
    event.stopPropagation();
    setRepostMenuOpen((current) => !current);
  }

  function handleQuoteClick(event) {
    event.stopPropagation();
    setRepostMenuOpen(false);
    setQuoteModalOpen(true);
  }

  function handleComment(event) {
    event.stopPropagation();
    navigate(`/entries/${entry.id}`);
  }

  function handleCardClick() {
    navigate(`/entries/${entry.id}`);
  }

  const relativeTime = formatRelativeTime(entry.created_at);
  const fullDateTime = formatFullDateTime(entry.created_at);

  return (
    <>
      <article
        className={`entry-card clickable-card ${
          compact ? "compact-entry-card" : ""
        } ${showCreatedAt ? "detail-selected-entry-card" : ""}`}
        onClick={handleCardClick}
      >
        <header className="entry-card-header entry-card-header-with-menu">
          <div className="entry-card-author-group">
            <Avatar user={entry.author} />

            <div>
              <div className="entry-author-line">
                <strong>{entry.author?.full_name}</strong>
                <span>@{entry.author?.username}</span>
                {relativeTime ? (
                  <span className="entry-relative-time">· {relativeTime}</span>
                ) : null}
              </div>
            </div>
          </div>

          {isMyEntry && !entry.is_deleted && entry.type !== "REPOST" && (
            <div className="entry-owner-menu-wrapper">
              <button
                type="button"
                className="entry-owner-menu-button"
                onClick={handleOwnerMenuClick}
              >
                <MoreHorizontal size={18} />
              </button>

              {ownerMenuOpen && (
                <div className="entry-owner-menu" onClick={(event) => event.stopPropagation()}>
                  <button type="button" onClick={handleEditClick}>
                    <PenLine size={16} />
                    <span>Entry'i güncelle</span>
                  </button>

                  <button type="button" onClick={handleDeleteEntry}>
                    <Trash2 size={16} />
                    <span>{deleteLoading ? "Siliniyor..." : "Entry'i sil"}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </header>

        {localItem.entry_type === "REPOST" && localItem.repost_info && (
          <p className="entry-label">{localItem.repost_info.label}</p>
        )}

        <p className="entry-content">
          {entry.is_deleted ? "Bu gönderi silinmiş." : entry.content}
        </p>

        <MediaRenderer media={entry.media} />

        {localItem.embedded_original_entry && (
          <div
            className="embedded-entry clickable-embedded-entry"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/entries/${localItem.embedded_original_entry.id}`);
            }}
          >
            <div className="embedded-entry-header">
              <Avatar user={localItem.embedded_original_entry.author} />

              <div className="entry-author-line">
                <strong>{localItem.embedded_original_entry.author?.full_name}</strong>
                <span>@{localItem.embedded_original_entry.author?.username}</span>
              </div>
            </div>

            <p>{localItem.embedded_original_entry.content}</p>

            <MediaRenderer media={localItem.embedded_original_entry.media} />
          </div>
        )}

        {showCreatedAt && fullDateTime && (
          <p className="entry-created-at">{fullDateTime}</p>
        )}

        <footer className="entry-actions">
          <button
            type="button"
            className="entry-icon-button comment-button"
            onClick={handleComment}
            title="Yorumlar"
          >
            <MessageCircle size={16} />
            <span>{entry.stats?.comments_count || 0}</span>
          </button>

          <div className="repost-action-wrapper">
            <button
              type="button"
              className={`entry-icon-button repost-button ${
                reposted ? "reposted" : ""
              }`}
              onClick={handleRepostButtonClick}
              disabled={repostLoading}
              title="Repost"
            >
              <Repeat2 size={16} />
              <span>{repostsCount}</span>
            </button>

            {repostMenuOpen && (
              <div
                className="repost-menu"
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
            className={`entry-icon-button like-button ${liked ? "liked" : ""}`}
            onClick={handleLike}
            disabled={likeLoading}
            title="Beğen"
          >
            <Heart size={16} fill={liked ? "currentColor" : "none"} />
            <span>{likesCount}</span>
          </button>
        </footer>
      </article>

      {quoteModalOpen && (
        <QuoteModal
          originalEntry={entry}
          onClose={() => setQuoteModalOpen(false)}
          onCreated={onEntryCreated}
        />
      )}

      {editModalOpen && (
        <EditEntryModal
          entry={entry}
          embeddedOriginalEntry={localItem.embedded_original_entry}
          onClose={() => setEditModalOpen(false)}
          onUpdated={handleUpdatedEntry}
        />
      )}
    </>
  );
}

export default EntryCard;
