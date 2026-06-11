import API_BASE_URL from "../config/api";

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
  allowUnauthorized = false
) {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      credentials: "include",
      ...options,
    }
  );

  if (!response.ok) {
    if (allowUnauthorized && response.status === 401) {
      return response;
    }
    throw new Error(`API Error: ${response.status}`);
  }

  return response;
}
