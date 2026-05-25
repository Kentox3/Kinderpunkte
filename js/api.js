import { API_URL, API_KEY } from "./config.js";

export async function api(action, payload = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      key: API_KEY,
      action,
      ...payload
    })
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.error || "API Fehler");
  }

  return data;
}