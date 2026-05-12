import { apiRequest } from "./client";

export function getTimelineEntries({
  feed = "foryou",
  limit = 10,
  cursor = null,
} = {}) {
  const params = new URLSearchParams();

  params.set("feed", feed);
  params.set("limit", String(limit));

  if (cursor?.cursor_score !== undefined && cursor?.cursor_score !== null) {
    params.set("cursor_score", String(cursor.cursor_score));
  }

  if (cursor?.cursor_created_at) {
    params.set("cursor_created_at", cursor.cursor_created_at);
  }

  if (cursor?.cursor_id !== undefined && cursor?.cursor_id !== null) {
    params.set("cursor_id", String(cursor.cursor_id));
  }

  return apiRequest(`/api/entries?${params.toString()}`);
}

export function getEntryDetail(entryId) {
  return apiRequest(`/api/entries/${entryId}`);
}

export function createPost({ content, media = [] }) {
  return apiRequest("/api/entries", {
    method: "POST",
    body: {
      content,
      media,
    },
  });
}

export function createComment(entryId, { content, media = [] }) {
  return apiRequest(`/api/entries/${entryId}/comments`, {
    method: "POST",
    body: {
      content,
      media,
    },
  });
}

export function createQuote(entryId, { content, media = [] }) {
  return apiRequest(`/api/entries/${entryId}/quote`, {
    method: "POST",
    body: {
      content,
      media,
    },
  });
}

export function toggleEntryLike(entryId) {
  return apiRequest(`/api/entries/${entryId}/like`, {
    method: "PATCH",
  });
}

export function toggleEntryRepost(entryId) {
  return apiRequest(`/api/entries/${entryId}/repost`, {
    method: "PATCH",
  });
}


export function updateEntry(entryId, { content }) {
  return apiRequest(`/api/entries/${entryId}`, {
    method: "PATCH",
    body: {
      content,
    },
  });
}

export function deleteEntry(entryId) {
  return apiRequest(`/api/entries/${entryId}`, {
    method: "DELETE",
  });
}
