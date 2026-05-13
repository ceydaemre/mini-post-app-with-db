import { apiRequest } from "./client";

function buildSearchQuery({ query, limit = 10, offset = 0 }) {
  const params = new URLSearchParams();

  params.set("q", query);
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  return params.toString();
}

export function searchUsers({ query, limit = 10, offset = 0 }) {
  return apiRequest(`/api/search/users?${buildSearchQuery({ query, limit, offset })}`);
}

export function searchEntries({ query, limit = 10, offset = 0 }) {
  return apiRequest(`/api/search/entries?${buildSearchQuery({ query, limit, offset })}`);
}
