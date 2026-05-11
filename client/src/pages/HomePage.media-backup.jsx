import { useEffect, useState } from "react";

import MainLayout from "../layouts/MainLayout.jsx";
import EntryCard from "../components/EntryCard.jsx";
import {
  createPost,
  getEntryDetail,
  getTimelineEntries,
} from "../api/entryApi.js";
import { uploadMediaFile } from "../api/uploadApi.js";

function HomePage() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [feed, setFeed] = useState("foryou");
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const [content, setContent] = useState("");
  const [uploadedMedia, setUploadedMedia] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchTimeline(selectedFeed = feed, cursor = null) {
    setLoading(true);
    setError("");

    try {
      const result = await getTimelineEntries({
        feed: selectedFeed,
        limit: 10,
        cursor,
      });

      const newItems = result.data.items;
      const pagination = result.data.pagination;

      if (cursor) {
        setItems((currentItems) => [...currentItems, ...newItems]);
      } else {
        setItems(newItems);
      }

      setNextCursor(pagination.next_cursor);
      setHasMore(pagination.has_more);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function getCreatedEntryId(result) {
    return (
      result?.data?.entry?.id ||
      result?.data?.id ||
      result?.data?.entry_id ||
      result?.data?.created_entry?.id
    );
  }

  async function prependCreatedEntryToTimeline(createdEntryId) {
    if (!createdEntryId) {
      await fetchTimeline(feed, null);
      return;
    }

    try {
      const detailResult = await getEntryDetail(createdEntryId);

      const newTimelineItem = {
        entry_type: detailResult.data.entry_type,
        entry: detailResult.data.entry,
        repost_info: detailResult.data.repost_info,
        embedded_original_entry: detailResult.data.embedded_original_entry,
      };

      setItems((currentItems) => {
        const filteredItems = currentItems.filter(
          (item) => item.entry?.id !== newTimelineItem.entry?.id
        );

        return [newTimelineItem, ...filteredItems];
      });
    } catch (error) {
      await fetchTimeline(feed, null);
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
    } catch (error) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleCreatePost(event) {
    event.preventDefault();

    const normalizedContent = content.trim();

    const media = uploadedMedia
      ? [
          {
            media_url: uploadedMedia.media_url,
            media_type: uploadedMedia.media_type,
          },
        ]
      : [];

    if (!normalizedContent && media.length === 0) {
      setError("Post için yazı veya medya eklemelisin.");
      return;
    }

    setPosting(true);
    setError("");

    try {
      const result = await createPost({
        content: normalizedContent,
        media,
      });

      const createdEntryId = getCreatedEntryId(result);

      setContent("");
      setUploadedMedia(null);
      event.target.reset();

      await prependCreatedEntryToTimeline(createdEntryId);
    } catch (error) {
      setError(error.message);
    } finally {
      setPosting(false);
    }
  }

  function handleFeedChange(selectedFeed) {
    setFeed(selectedFeed);
    setItems([]);
    setNextCursor(null);
    setHasMore(false);
    fetchTimeline(selectedFeed, null);
  }

  async function handleCreatedEntryFromCard(result) {
    const createdEntryId = getCreatedEntryId(result);
    await prependCreatedEntryToTimeline(createdEntryId);
  }

  function handleEntryDeleted(entryId) {
    setItems((currentItems) =>
      currentItems.filter((item) => Number(item.entry?.id) !== Number(entryId))
    );
  }

  function handleEntryUpdated(updatedItem) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        Number(item.entry?.id) === Number(updatedItem.entry?.id)
          ? updatedItem
          : item
      )
    );
  }

  function handleLoadMore() {
    if (!nextCursor) return;
    fetchTimeline(feed, nextCursor);
  }

  useEffect(() => {
    fetchTimeline("foryou", null);
  }, []);

  return (
    <MainLayout>
      <section className="page-header">
        <h2>Home</h2>
        <p>
          {user
            ? `Hoş geldin, ${user.full_name}`
            : "Timeline burada görünecek."}
        </p>
      </section>

      <section className="timeline-tabs">
        <button
          className={feed === "foryou" ? "active-tab" : ""}
          onClick={() => handleFeedChange("foryou")}
        >
          For You
        </button>

        <button
          className={feed === "following" ? "active-tab" : ""}
          onClick={() => handleFeedChange("following")}
        >
          Following
        </button>
      </section>

      <form className="compose-box" onSubmit={handleCreatePost}>
        <textarea
          placeholder="Bugün ne düşünüyorsun?"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />

        <label className="file-upload-button">
          {uploading ? "Yükleniyor..." : "Medya ekle"}
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>

        {uploadedMedia && (
          <div className="media-preview">
            {uploadedMedia.media_type === "video" ? (
              <video src={uploadedMedia.media_url} controls />
            ) : (
              <img src={uploadedMedia.media_url} alt="media preview" />
            )}

            <button
              type="button"
              className="remove-media-button"
              onClick={() => setUploadedMedia(null)}
            >
              Medyayı kaldır
            </button>
          </div>
        )}

        <button type="submit" disabled={posting || uploading}>
          {posting ? "Paylaşılıyor..." : "Post Paylaş"}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {loading && items.length === 0 && (
        <section className="empty-state">
          <h3>Timeline yükleniyor...</h3>
        </section>
      )}

      {!loading && items.length === 0 && !error && (
        <section className="empty-state">
          <h3>Henüz gösterilecek post yok</h3>
          <p>İlk postu sen paylaşabilirsin.</p>
        </section>
      )}

      <section className="timeline-list">
        {items.map((item) => (
          <EntryCard
            key={`${item.entry_type}-${item.entry.id}`}
            item={item}
            onEntryCreated={handleCreatedEntryFromCard}
            onEntryDeleted={handleEntryDeleted}
            onEntryUpdated={handleEntryUpdated}
          />
        ))}
      </section>

      {hasMore && (
        <button
          className="load-more-button"
          onClick={handleLoadMore}
          disabled={loading}
        >
          {loading ? "Yükleniyor..." : "Daha fazla yükle"}
        </button>
      )}
    </MainLayout>
  );
}

export default HomePage;
