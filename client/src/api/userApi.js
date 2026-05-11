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

export function getUserPosts(userId) {
  return apiRequest(`/api/users/${userId}/posts`);
}

export function getUserReplies(userId) {
  return apiRequest(`/api/users/${userId}/replies`);
}

export function getUserLikes(userId) {
  return apiRequest(`/api/users/${userId}/likes`);
}

export function getUserMedia(userId) {
  return apiRequest(`/api/users/${userId}/media`);
}
