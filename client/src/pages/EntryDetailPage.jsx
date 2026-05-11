import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import MainLayout from "../layouts/MainLayout.jsx";
import EntryCard from "../components/EntryCard.jsx";
import { createComment, getEntryDetail } from "../api/entryApi.js";
import { uploadMediaFile } from "../api/uploadApi.js";

function toEntryCardItem(entry) {
  return {
    entry_type: entry.type,
    entry,
  };
}

function EntryDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const currentUser = JSON.parse(localStorage.getItem("user"));

  const [detail, setDetail] = useState(null);
  const [comment, setComment] = useState("");
  const [uploadedMedia, setUploadedMedia] = useState(null);

  const [loading, setLoading] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function fetchDetail() {
    setLoading(true);
    setError("");

    try {
      const result = await getEntryDetail(id);
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
    } catch (error) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleCreateComment(event) {
    event.preventDefault();

    const normalizedComment = comment.trim();

    const media = uploadedMedia
      ? [
          {
            media_url: uploadedMedia.media_url,
            media_type: uploadedMedia.media_type,
          },
        ]
      : [];

    if (!normalizedComment && media.length === 0) {
      setError("Yanıt için yazı veya medya eklemelisin.");
      return;
    }

    setCommenting(true);
    setError("");

    try {
      await createComment(id, {
        content: normalizedComment,
        media,
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
  }, [id]);

  const isCommentDetail = detail?.entry_type === "COMMENT";

  const contextEntries = [];

  if (isCommentDetail && detail?.root_context) {
    contextEntries.push({
      key: `root-${detail.root_context.id}`,
      entry: detail.root_context,
      isSelected: false,
    });
  }

  if (isCommentDetail && detail?.parent_chain && detail.parent_chain.length > 0) {
    detail.parent_chain.forEach((parent) => {
      contextEntries.push({
        key: `parent-${parent.id}`,
        entry: parent,
        isSelected: false,
      });
    });
  }

  if (detail?.entry) {
    contextEntries.push({
      key: `selected-${detail.entry.id}`,
      entry: detail.entry,
      isSelected: true,
    });
  }

  return (
    <MainLayout>
      <section className="page-header detail-page-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Geri
        </button>
        <h2>Post</h2>
      </section>

      {error && <div className="error-message">{error}</div>}

      {loading && (
        <section className="empty-state">
          <h3>Yükleniyor...</h3>
        </section>
      )}

      {!loading && detail && (
        <section
          className={`detail-thread-shell ${
            isCommentDetail ? "comment-detail-shell" : "normal-detail-shell"
          }`}
        >
          <div className="detail-thread-flow">
            {contextEntries.map((contextItem, index) => {
              const shouldDrawConnector =
                isCommentDetail && index < contextEntries.length - 1;

              return (
                <div
                  key={contextItem.key}
                  className={`detail-thread-node ${
                    contextItem.isSelected ? "selected-thread-node" : ""
                  } ${shouldDrawConnector ? "has-connector" : ""}`}
                >
                  <EntryCard
                    item={{
                      entry_type: contextItem.isSelected
                        ? detail.entry_type
                        : contextItem.entry.type,
                      entry: contextItem.entry,
                      repost_info: contextItem.isSelected
                        ? detail.repost_info
                        : null,
                      embedded_original_entry: contextItem.isSelected
                        ? detail.embedded_original_entry
                        : null,
                    }}
                    compact
                    showCreatedAt={contextItem.isSelected}
                  />
                </div>
              );
            })}

            <div className="detail-reply-node">
              <form
                className="reply-inline-box thread-reply-box"
                onSubmit={handleCreateComment}
              >
                <div className="avatar reply-avatar">
                  {currentUser?.full_name?.charAt(0)?.toUpperCase() || "?"}
                </div>

                <div className="reply-upload-area">
                  <input
                    placeholder="Yanıtını gönder"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                  />

                  <label className="reply-file-button icon-upload-button">
                    {uploading ? "..." : "+"}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                      disabled={uploading}
                    />
                  </label>

                  {uploadedMedia && (
                    <div className="inline-selected-media detail-reply-selected-media">
                      {uploadedMedia.media_type === "video" ? (
                        <video src={uploadedMedia.media_url} controls />
                      ) : (
                        <img src={uploadedMedia.media_url} alt="selected media" />
                      )}

                      <button
                        type="button"
                        onClick={() => setUploadedMedia(null)}
                      >
                        Kaldır
                      </button>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={commenting || uploading}>
                  {commenting ? "..." : "Yanıtla"}
                </button>
              </form>
            </div>

            {detail.children && detail.children.length > 0 ? (
              <div className="detail-children-flow">
                {detail.children.map((child) => (
                  <div className="detail-child-node" key={`child-${child.id}`}>
                    <EntryCard item={toEntryCardItem(child)} compact />
                  </div>
                ))}
              </div>
            ) : (
              <div className="thread-empty-state">Henüz yorum yok.</div>
            )}
          </div>
        </section>
      )}
    </MainLayout>
  );
}

export default EntryDetailPage;
