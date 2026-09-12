/**
 * Thin HTTP client for the Delhivery One API (production / staging).
 * Server-side ONLY — never import this from client components.
 *
 * Reads configuration from environment:
 *   DELHIVERY_API_TOKEN          - required; the per-environment API token
 *   DELHIVERY_API_BASE           - optional; default production host
 *   DELHIVERY_PICKUP_LOCATION    - registered warehouse name (shipment/pickup)
 *   DELHIVERY_ORIGIN_PINCODE     - warehouse pincode (rate + serviceability)
 *   DELHIVERY_SHIPPING_MODE      - "S" | "E" (Surface/Express), default "S"
 *   DELHIVERY_SELLER_GST_TIN     - optional GST TIN sent on shipments
 *   DELHIVERY_HSN_CODE           - optional HSN code sent on shipments
 */

const DEFAULT_BASE = "https://track.delhivery.com";

export class DelhiveryError extends Error {
  readonly status: number;
  readonly code?: string;
  /** Customer-safe message. */
  readonly safeMessage: string;

  constructor(
    message: string,
    options: { status?: number; code?: string; safeMessage?: string } = {}
  ) {
    super(message);
    this.name = "DelhiveryError";
    this.status = options.status ?? 0;
    this.code = options.code;
    this.safeMessage = options.safeMessage ?? message;
  }
}

export function isDelhiveryConfigured(): boolean {
  return Boolean(process.env.DELHIVERY_API_TOKEN);
}

export function getDelhiveryBaseUrl(): string {
  return (process.env.DELHIVERY_API_BASE || DEFAULT_BASE).replace(/\/+$/, "");
}

export function getPickupLocation(): string {
  return process.env.DELHIVERY_PICKUP_LOCATION?.trim() || "";
}

export function getOriginPincode(): string {
  return process.env.DELHIVERY_ORIGIN_PINCODE?.trim() || "";
}

export function getShippingMode(): "S" | "E" {
  const mode = process.env.DELHIVERY_SHIPPING_MODE?.trim().toUpperCase();
  return mode === "E" ? "E" : "S";
}

export async function delhiveryFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; timeoutMs?: number } = {}
): Promise<T> {
  const token = process.env.DELHIVERY_API_TOKEN;
  if (!token) {
    throw new DelhiveryError("Delhivery is not configured", {
      status: 503,
      safeMessage: "Shipping service is not configured yet.",
    });
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 15000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${getDelhiveryBaseUrl()}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      throw new DelhiveryError(
        `Delhivery API ${res.status} on ${path}`,
        {
          status: res.status,
          safeMessage: "Delivery service reported an error. Please try again.",
        }
      );
    }

    return json as T;
  } catch (error) {
    if (error instanceof DelhiveryError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new DelhiveryError("Delhivery API request timed out", {
        status: 0,
        safeMessage: "Delivery service timed out. Please try again.",
      });
    }
    throw new DelhiveryError(
      error instanceof Error ? error.message : "Delhivery API request failed",
      { status: 0, safeMessage: "Delivery service is unreachable. Please try again." }
    );
  } finally {
    clearTimeout(timer);
  }
}