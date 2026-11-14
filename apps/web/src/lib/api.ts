export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/backend${path}`, { ...init, headers, credentials: "include" });
  const skipRefresh = ["/auth/login", "/auth/register", "/auth/refresh"].some((item) => path.startsWith(item));
  if (response.status === 401 && retry && !skipRefresh) {
    refreshInFlight ??= fetch("/backend/auth/refresh", { method: "POST", credentials: "include" })
      .then((result) => result.ok)
      .finally(() => {
        refreshInFlight = null;
      });
    if (await refreshInFlight) return api<T>(path, init, false);
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message.join("، ") : data.message;
    throw new ApiError(response.status, message || "ارتباط با سرور برقرار نشد");
  }
  return data as T;
}

export function mediaUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `/backend${url}`;
}

export function safeNext(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
