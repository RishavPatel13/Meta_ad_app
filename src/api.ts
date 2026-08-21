import type { Product, ProductBundle } from "./types";

const TOKEN_KEY = "meta-ad-token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class AuthError extends Error {
  constructor(message = "Sign in required") {
    super(message);
    this.name = "AuthError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    clearToken();
    throw new AuthError(data.error || "Sign in required");
  }
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data as T;
}

export type FileKind = "product-image" | "angle-creative" | "script-creative";

export async function downloadFile(
  kind: FileKind,
  recordId: string,
  fileId: string,
  filename: string
) {
  const token = getToken();
  const response = await fetch(
    `/api/files/${kind}/${recordId}/${encodeURIComponent(fileId)}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  if (response.status === 401) {
    clearToken();
    throw new AuthError("Sign in required");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Download failed (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "creative";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  me: () => request<{ user: { username: string; role: string } }>("/api/auth/me"),
  products: () => request<{ products: Product[] }>("/api/products"),
  product: (id: string) => request<ProductBundle>(`/api/products/${id}`),
  createProduct: (body: {
    name: string;
    description: string;
    targetAudience: string;
    url?: string;
    notes?: string;
    category?: string;
    runResearch?: boolean;
  }) =>
    request<{ product: Product }>("/api/products", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  runResearch: (id: string) =>
    request(`/api/products/${id}/research`, { method: "POST" }),
  generatePersonas: (id: string) =>
    request(`/api/products/${id}/personas`, { method: "POST" }),
  generateAngles: (recordIds: string[]) =>
    request("/api/personas/generate-angles", {
      method: "POST",
      body: JSON.stringify({ recordIds }),
    }),
  generateScript: (recordIds: string[], creativeType: string) =>
    request("/api/angles/generate-script", {
      method: "POST",
      body: JSON.stringify({ recordIds, creativeType }),
    }),
  generateImageCopy: (recordIds: string[], creativeType: string) =>
    request("/api/angles/generate-image-copy", {
      method: "POST",
      body: JSON.stringify({ recordIds, creativeType }),
    }),
  generateCreative: (id: string) =>
    request(`/api/scripts/${id}/generate-creative`, { method: "POST" }),
  pushToMeta: (id: string) =>
    request(`/api/scripts/${id}/push-to-meta`, { method: "POST" }),
  deleteProduct: (id: string) =>
    request<{
      deleted: {
        product: string;
        personas: number;
        angles: number;
        scripts: number;
      };
    }>(`/api/products/${id}`, { method: "DELETE" }),
};
