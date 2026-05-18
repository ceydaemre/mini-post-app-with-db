import { apiRequest } from "./client";

function buildPaginationQuery({ limit = 10, offset = 0 } = {}) {
  const params = new URLSearchParams();

  params.set("limit", String(limit));
  params.set("offset", String(offset));

  return params.toString();
}

export function getNotifications(pagination = {}) {
  return apiRequest(`/api/notifications?${buildPaginationQuery(pagination)}`);
}

export function markAllNotificationsAsRead() {
  return apiRequest("/api/notifications/read-all", {
    method: "PATCH",
  });
}

export function markNotificationAsRead(notificationId) {
  return apiRequest(`/api/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export function getUnreadNotificationsCount() {
  return apiRequest("/api/notifications/unread-count");
}
