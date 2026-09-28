export interface ApiErrorShape {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api";

export const TOKEN_KEY = "eis_token";

export class ApiError extends Error {
  status: number;

  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  campusId?: number | null;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { body, campusId, headers, ...rest } = options;

  const token =
    typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(campusId ? { "X-Campus-Id": String(campusId) } : {}),
      ...(headers ?? {}),
    },
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as Partial<ApiErrorShape>;
    throw new ApiError(
      errorPayload.message ?? response.statusText ?? "Request failed",
      response.status,
      errorPayload.errors
    );
  }

  return payload as T;
}

export async function apiUpload<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    body: formData,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as Partial<ApiErrorShape>;
    throw new ApiError(
      errorPayload.message ?? response.statusText ?? "Request failed",
      response.status,
      errorPayload.errors
    );
  }

  return payload as T;
}

export async function apiDownload(path: string): Promise<Blob> {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new ApiError(response.statusText || "Download failed", response.status);
  }

  return response.blob();
}
