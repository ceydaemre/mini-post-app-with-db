import { apiRequest } from "./client";

export function loginUser({ email, password }) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: {
      email,
      password,
    },
  });
}

export function registerUser({ full_name, username, email, password }) {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: {
      full_name,
      username,
      email,
      password,
    },
  });
}
