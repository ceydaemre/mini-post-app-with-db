import { apiRequest } from "./client";

function buildPaginationQuery({ limit = 10, offset = 0 } = {}) {
  const params = new URLSearchParams();

  params.set("limit", String(limit));
  params.set("offset", String(offset));

  return params.toString();
}

export function getConversations(pagination = {}) {
  return apiRequest(`/api/messages/conversations?${buildPaginationQuery(pagination)}`);
}

export function getConversationMessages(conversationId, pagination = {}) {
  return apiRequest(
    `/api/messages/conversations/${conversationId}?${buildPaginationQuery(pagination)}`
  );
}

export function sendMessage(receiverId, content) {
  return apiRequest(`/api/messages/${receiverId}`, {
    method: "POST",
    body: {
      content,
    },
  });
}

export function markConversationMessagesAsRead(conversationId) {
  return apiRequest(`/api/messages/conversations/${conversationId}/read`, {
    method: "PATCH",
  });
}

export function getUnreadMessagesCount() {
  return apiRequest("/api/messages/unread-count");
}
