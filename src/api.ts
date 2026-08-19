import type { Product, ProductBundle } from "./types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data as T;
}

export const api = {
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
};
