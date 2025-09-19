import axios, { AxiosInstance } from "axios";
import { NEXT_PUBLIC_APP_URL } from "@/constants/app.constants";

function createBaseClient(baseURL: string, config?: { withAuth?: boolean }): AxiosInstance {
  const instance = axios.create({ baseURL, withCredentials: true });
  instance.interceptors.request.use((req) => {
    // Attach any shared headers here
    return req;
  });
  instance.interceptors.response.use(
    (res) => res,
    (error) => {
      // Centralized error logging
      return Promise.reject(error);
    }
  );
  return instance;
}

export const apiClient = createBaseClient(NEXT_PUBLIC_APP_URL);

// External crawler client (no base URL, no cookies)
const externalClient = axios.create({
  timeout: 10000,
  withCredentials: false,
  headers: { "User-Agent": "iq-crawler" },
});

/**
 * externalGetWithRetry
 * Lightweight GET with retry/backoff tailored for crawling external domains.
 * Returns response text on success, otherwise null.
 */
export async function externalGetWithRetry(
  url: string,
  opts?: { maxRetries?: number; delayMs?: number }
): Promise<string | null> {
  const maxRetries = Math.max(0, opts?.maxRetries ?? 3);
  const delayMs = Math.max(0, opts?.delayMs ?? 1000);
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await externalClient.get(url, { responseType: "text", transformResponse: [(d) => d] });
      return typeof res.data === "string" ? res.data : String(res.data ?? "");
    } catch (err: any) {
      const status: number | undefined = err?.response?.status;
      if (typeof status === "number") {
        if (status === 429) {
          await new Promise((r) => setTimeout(r, delayMs * attempt * 2));
          continue;
        }
        if (status >= 400 && status < 500) return null;
      }
      if (attempt === maxRetries) return null;
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
  return null;
}

