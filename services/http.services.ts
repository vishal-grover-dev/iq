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

