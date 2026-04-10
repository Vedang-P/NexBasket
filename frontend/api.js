const DEFAULT_API_BASE = "http://127.0.0.1:8000";
const VERCEL_BACKEND_PREFIX = "/_/backend";

export function getApiBase() {
  const customBase = (localStorage.getItem("apiBase") || "").trim();
  if (customBase) {
    return customBase.replace(/\/$/, "");
  }

  const host = window.location.hostname || "";
  const isLocalHost = host === "127.0.0.1" || host === "localhost";
  const isLocalFastApi = isLocalHost && window.location.port === "8000";

  if (isLocalFastApi) {
    return window.location.origin;
  }

  if (window.location.origin && window.location.origin.startsWith("http")) {
    return `${window.location.origin}${VERCEL_BACKEND_PREFIX}`;
  }

  return DEFAULT_API_BASE;
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${getApiBase()}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload;
  try {
    payload = await response.json();
  } catch (_) {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.detail || "Request failed");
  }

  return payload;
}

export function setActiveUser(user) {
  localStorage.setItem("activeUser", JSON.stringify(user));
}

export function getActiveUser() {
  const raw = localStorage.getItem("activeUser");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export function clearActiveUser() {
  localStorage.removeItem("activeUser");
}

export function requireActiveUser() {
  const user = getActiveUser();
  if (!user?.user_id) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}
