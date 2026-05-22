const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export async function uploadMediaFile(file) {
  const token = localStorage.getItem("token");

  const formData = new FormData();
  formData.append("media", file);

  const response = await fetch(`${API_BASE_URL}/api/uploads/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Medya yüklenirken hata oluştu.");
  }

  return data;
}
