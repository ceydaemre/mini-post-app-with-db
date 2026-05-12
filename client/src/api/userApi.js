import { apiRequest } from "./client";

export function getUserProfile(userId) {
  return apiRequest(`/api/users/${userId}/profile`);
}

export function updateMyProfile({
  full_name,
  bio,
  profile_image_url,
  banner_image_url,
}) {
  return apiRequest("/api/users/me/profile", {
    method: "PATCH",
    body: {
      full_name,
      bio,
      profile_image_url,
      banner_image_url,
    },
  });
}

function buildPaginationQuery({ limit = 10, offset = 0 } = {}) {
  const params = new URLSearchParams();

  params.set("limit", String(limit));
  params.set("offset", String(offset));

  return params.toString();
}

export function getUserPosts(userId, pagination = {}) {
  return apiRequest(`/api/users/${userId}/posts?${buildPaginationQuery(pagination)}`);
}

export function getUserReplies(userId, pagination = {}) {
  return apiRequest(`/api/users/${userId}/replies?${buildPaginationQuery(pagination)}`);
}

export function getUserLikes(userId, pagination = {}) {
  return apiRequest(`/api/users/${userId}/likes?${buildPaginationQuery(pagination)}`);
}

export function getUserMedia(userId, pagination = {}) {
  return apiRequest(`/api/users/${userId}/media?${buildPaginationQuery(pagination)}`);
}
