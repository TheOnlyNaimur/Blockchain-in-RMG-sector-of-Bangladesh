// API Client with error handling and base configuration
const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string) || "http://localhost:3000/api";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface ApiError {
  message: string;
  status: number;
  data?: any;
}

class ApiErrorClass implements ApiError {
  message: string;
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    this.message = message;
    this.status = status;
    this.data = data;
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
    body?: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      };

      if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      // Handle non-JSON responses gracefully
      const contentType = response.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { success: response.ok, message: text };
      }

      if (!response.ok) {
        throw new ApiErrorClass(
          data?.error || data?.message || `HTTP ${response.status}`,
          response.status,
          data,
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof ApiErrorClass) {
        throw error;
      }

      throw new ApiErrorClass(
        error instanceof Error ? error.message : "Unknown error",
        0,
        error,
      );
    }
  }

  get<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, "GET", undefined, headers);
  }

  post<T>(endpoint: string, body: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, "POST", body, headers);
  }

  put<T>(endpoint: string, body: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, "PUT", body, headers);
  }

  patch<T>(endpoint: string, body: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, "PATCH", body, headers);
  }

  delete<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, "DELETE", undefined, headers);
  }
}

export const apiClient = new ApiClient();
export type { ApiError, ApiResponse };
