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

/**
 * Exactly which Delhivery env knobs are set. Used by the admin health
 * endpoint and by attemptAutoShipment to return a precise, actionable
 * "not configured" error instead of a bare message.
 */
export function getDelhiveryConfigStatus(): {
  configured: boolean;
  tokenConfigured: boolean;
  pickupLocationConfigured: boolean;
  originPincodeConfigured: boolean;
  missing: string[];
} {
  const tokenConfigured = Boolean(process.env.DELHIVERY_API_TOKEN);
  const pickupLocationConfigured = Boolean(getPickupLocation());
  const originPincodeConfigured = /^\d{6}$/.test(getOriginPincode());
  const missing: string[] = [];
  if (!tokenConfigured) missing.push("DELHIVERY_API_TOKEN");
  if (!pickupLocationConfigured) missing.push("DELHIVERY_PICKUP_LOCATION");
  if (!originPincodeConfigured) missing.push("DELHIVERY_ORIGIN_PINCODE");
  return {
    configured: tokenConfigured,
    tokenConfigured,
    pickupLocationConfigured,
    originPincodeConfigured,
    missing,
  };
}

/** Throw a DELHIVERY_NOT_CONFIGURED error when the token is missing. */
export function assertDelhiveryConfigured(): void {
  const status = getDelhiveryConfigStatus();
  if (!status.configured) {
    const missing = status.missing.length ? status.missing.join(", ") : "DELHIVERY_API_TOKEN";
    throw new DelhiveryError(
      `Delhivery is not configured (missing: ${missing})`,
      {
        status: 503,
        code: "DELHIVERY_NOT_CONFIGURED",
        safeMessage:
          "Shipping is not configured on this server yet. Add the missing Delhivery environment variables in Admin → Settings → Delhivery / on Vercel.",
      }
    );
  }
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
    throw new DelhiveryError(
      "Delhivery is not configured (missing: DELHIVERY_API_TOKEN)",
      {
        status: 503,
        code: "DELHIVERY_NOT_CONFIGURED",
        safeMessage: "Shipping is not configured on this server yet.",
      }
    );
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 15000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Delhivery's create-shipment API reads the request body as a raw
  // "format=json&data=<json>" STRING. Sending a JSON object with
  // Content-Type: application/json makes it reject with "format key missing
  // in POST". Callers pass a string when they need the raw form; objects are
  // sent as JSON (rates, serviceability, tracking, pickup requests).

  // Build the body and content-type up-front with explicit if-branches so
  // TypeScript narrows options.body fully in each branch (the nested
  // rawBody-ternary form does not propagate the typeof narrowing and fails
  // with "Type '{}' is not assignable to 'BodyInit'").
  let requestBody: BodyInit | undefined;
  let contentType: string;
  if (options.body === undefined) {
    requestBody = undefined;
    contentType = "application/json";
  } else if (typeof options.body === "string") {
    requestBody = options.body;
    contentType = "text/plain";
  } else {
    requestBody = JSON.stringify(options.body);
    contentType = "application/json";
  }

  try {
    const res = await fetch(`${getDelhiveryBaseUrl()}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": contentType,
        Accept: "application/json",
      },
      body: requestBody,
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
      // Include whatever Delhivery returned so the admin panel shows the real
      // reason (invalid pickup location, bad phone, GST issues …) instead of a
      // useless "API 400" line.
      const detail = summarizeResponseBody(json, text);
      const authFailed = res.status === 401 || res.status === 403;
      const rateLimited = res.status === 429;
      throw new DelhiveryError(
        `Delhivery API ${res.status} on ${path}${detail ? ` — ${detail}` : ""}`,
        {
          status: res.status,
          code: authFailed
            ? "DELHIVERY_AUTH_FAILED"
            : rateLimited
              ? "DELHIVERY_RATE_LIMITED"
              : "DELHIVERY_API_ERROR",
          safeMessage: authFailed
            ? "The Delhivery API token was rejected. Check it in Admin → Settings → Delhivery."
            : rateLimited
              ? "Delivery service is rate-limiting requests. Try again shortly."
              : "Delivery service reported an error. Please try again.",
        }
      );
    }

    return json as T;
  } catch (error) {
    if (error instanceof DelhiveryError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new DelhiveryError("Delhivery API request timed out", {
        status: 0,
        code: "DELHIVERY_TIMEOUT",
        safeMessage: "Delivery service timed out. Please try again.",
      });
    }
    throw new DelhiveryError(
      error instanceof Error ? error.message : "Delhivery API request failed",
      {
        status: 0,
        code: "DELHIVERY_UNREACHABLE",
        safeMessage: "Delivery service is unreachable. Please try again.",
      }
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Pull a short, human-actionable message out of a Delhivery error body. */
function summarizeResponseBody(
  json: unknown,
  text: string
): string {
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    // Delhivery create-shipment errors arrive with success:false, error:true
    // and the real reason in "rmk" (+ per-package remarks when applicable).
    const candidates = [
      obj.rmk,
      obj.error,
      obj.errors,
      obj.message,
      obj.Error,
      obj.Message,
      obj.reason,
      obj.detail,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.slice(0, 300);
      }
      if (Array.isArray(candidate)) {
        const joined = candidate
          .map((entry) =>
            typeof entry === "string"
              ? entry
              : entry && typeof entry === "object"
                ? JSON.stringify(entry)
                : ""
          )
          .filter(Boolean)
          .join(" · ");
        if (joined) return joined.slice(0, 300);
      }
    }
    const trimmed = JSON.stringify(json);
    return trimmed ? trimmed.slice(0, 300) : text.slice(0, 300);
  }
  if (typeof json === "string" && json.trim()) return json.slice(0, 300);
  return text ? text.slice(0, 300) : "";
}