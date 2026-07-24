import type { Receipt, ReceiptCorrection, Summary } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Thrown for any failure talking to the API. */
export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError(
      "Couldn't reach the Receiptly server. Check that the API is running.",
    );
  }

  if (!res.ok) {
    // The API returns { message } for handled errors; surface it if present.
    let detail = `The server responded with an error (${res.status}).`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body?.message) {
        detail = Array.isArray(body.message)
          ? body.message.join(", ")
          : body.message;
      }
    } catch {
      /* non-JSON error body — keep the generic message */
    }
    throw new ApiError(detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Upload an image; the server extracts, stores, and returns the receipt. */
export async function uploadReceipt(file: File): Promise<Receipt> {
  const form = new FormData();
  form.append("image", file);
  return request<Receipt>("/receipts", { method: "POST", body: form });
}

export function listReceipts(): Promise<Receipt[]> {
  return request<Receipt[]>("/receipts", { cache: "no-store" });
}

export function getReceipt(id: string): Promise<Receipt> {
  return request<Receipt>(`/receipts/${id}`, { cache: "no-store" });
}

export function correctReceipt(
  id: string,
  correction: ReceiptCorrection,
): Promise<Receipt> {
  return request<Receipt>(`/receipts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(correction),
  });
}

export function deleteReceipt(id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/receipts/${id}`, { method: "DELETE" });
}

export function getSummary(): Promise<Summary> {
  return request<Summary>("/summary", { cache: "no-store" });
}

/**
 * Full URL for a receipt's stored image, served by the API from /uploads.
 * `imagePath` is stored as e.g. "uploads/<uuid>.jpg"; we take the basename so
 * this works whether the path is relative or absolute.
 */
export function imageUrl(imagePath: string): string {
  const name = imagePath.split(/[\\/]/).pop() ?? imagePath;
  return `${API_URL}/uploads/${name}`;
}

/** Format a money amount for a currency, keeping UNKNOWN readable. */
export function formatMoney(amount: number, currency: string): string {
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: currency === "RWF" ? 0 : 2,
    maximumFractionDigits: currency === "RWF" ? 0 : 2,
  });
  return `${formatted} ${currency}`;
}
