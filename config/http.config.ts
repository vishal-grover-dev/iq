import axios, { AxiosInstance } from "axios";
import { NEXT_PUBLIC_APP_URL } from "@/constants/app.constants";

function createBaseClient(baseURL: string): AxiosInstance {
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

// Resolve a safe base URL for browser, server, or CLI contexts
const RESOLVED_APP_URL = NEXT_PUBLIC_APP_URL || "http://localhost:3050";

export const apiClient = createBaseClient(RESOLVED_APP_URL);
