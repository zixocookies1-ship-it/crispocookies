import Product from "@/models/Product";
import {
  delhiveryFetch,
  DelhiveryError,
  getDelhiveryBaseUrl,
  getPickupLocation,
  getOriginPincode,
  getShippingMode,
  isDelhiveryConfigured,
  assertDelhiveryConfigured,
} from "./client";
import type {
  DelhiveryRateItem,
  DelhiveryRatesResponse,
  DelhiveryServiceabilityResponse,
  DelhiveryShipmentPackage,
  DelhiveryShipmentRequest,
  DelhiveryShipmentResponse,
  DelhiveryShipmentResult,
  DelhiveryTrackResponse,
} from "./types";

/**
 * Delhivery One service layer.
 * All functions are server-side only and never receive/expose the API token.
 */

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { expires: number; value: unknown }>();

function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) {
    return Promise.resolve(hit.value as T);
  }
  return loader().then((value) => {
    cache.set(key, { expires: Date.now() + ttlMs, value });
    if (cache.size > 300) {
      const oldest = cache.keys().next().value as string;
      cache.delete(oldest);
    }
    return value;
  });
}

export interface ServiceabilityResult {
  serviceable: boolean;
  city?: string;
  state?: string;
  /** true when prepaid delivery is offered at the pincode. */
  prePaid?: boolean;
  remark?: string;
}

export async function checkPincodeServiceability(
  pincode: string
): Promise<ServiceabilityResult> {
  if (!/^\d{6}$/.test(pincode)) {
    return { serviceable: false, remark: "invalid" };
  }
  if (!isDelhiveryConfigured()) {
    // Integration not configured yet — do not block checkouts.
    return { serviceable: true };
  }
  const data = await cached<DelhiveryServiceabilityResponse>(
    `svc-${pincode}`,
    CACHE_TTL_MS,
    () =>
      delhiveryFetch<DelhiveryServiceabilityResponse>(
        `/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(pincode)}`
      )
  );

  const postal = data?.delivery_codes?.[0]?.postal_code;
  if (!postal || !postal.pin) {
    return { serviceable: false, remark: "unserviced" };
  }
  const prePaid = postal.pre_paid === "Y";
  const remark = postal.remarks || "";
  const blocked = remark.toLowerCase() === "embargo" || !prePaid;
  return {
    serviceable: !blocked,
    city: postal.city,
    state: postal.state_code,
    prePaid,
    remark,
  };
}

export interface RateEstimate {
  amount: number;
  chargeableWeightGrams: number;
  /** "S" surface / "E" express per the API. */
  md: string;
}

export async function estimateShippingRate(opts: {
  toPincode: string;
  weightGrams: number;
  md?: "S" | "E";
}): Promise<RateEstimate> {
  const toPincode = opts.toPincode.trim();
  const fromPincode = getOriginPincode();
  const md = opts.md ?? getShippingMode();
  const weightGrams = Math.max(1, Math.round(opts.weightGrams));

  if (!/^\d{6}$/.test(toPincode)) {
    throw new DelhiveryError("Invalid destination pincode", {
      status: 400,
      code: "INVALID_PINCODE",
      safeMessage: "Please enter a valid 6-digit pincode.",
    });
  }
  if (!fromPincode) {
    throw new DelhiveryError("DELHIVERY_ORIGIN_PINCODE is not configured", {
      status: 503,
      code: "DELHIVERY_NOT_CONFIGURED",
      safeMessage: "Shipping is not configured yet.",
    });
  }

  const cacheKey = `rate-${md}-${fromPincode}-${toPincode}-${weightGrams}`;
  const response = await cached<unknown>(
    cacheKey,
    10 * 60 * 1000,
    () =>
      delhiveryFetch(
        `/api/kinko/v1/invoice/charges/.json?md=${md}&ss=Delivered&d_pin=${encodeURIComponent(
          toPincode
        )}&o_pin=${encodeURIComponent(fromPincode)}&cgm=${weightGrams}&pt=Pre-paid`
      )
  );

  let amount = extractRateAmount(response);
  if (amount == null || !Number.isFinite(amount) || amount < 0) {
    // Non-serviceable / zone without a defined slab can come back empty.
    amount = 0;
  }
  // The invoice/charges API quotes IN RUPEES (e.g. total_amount 47.2 = ₹47.20).
  // Round to a whole rupee for the order charge.
  const inRupees = Math.round(amount);

  const quotedChargeable = extractChargeableWeight(response);
  return {
    amount: inRupees,
    chargeableWeightGrams: quotedChargeable ?? weightGrams,
    md,
  };
}

function extractRateAmount(response: unknown): number | null {
  if (Array.isArray(response)) {
    const first = (response[0] as DelhiveryRateItem | undefined)?.total_amount;
    if (typeof first === "number") return first;
    return null;
  }
  const obj = (response ?? {}) as Partial<DelhiveryRatesResponse>;
  if (obj.amount_due != null) return obj.amount_due;
  const first = obj.quote?.[0]?.total_amount;
  if (typeof first === "number") return first;
  return null;
}

function extractChargeableWeight(response: unknown): number | null {
  const obj = (response ?? {}) as Partial<DelhiveryRatesResponse>;
  const agg = obj.quote ?? (Array.isArray(response) ? response : null);
  const item = agg?.[0] as DelhiveryRateItem | undefined;
  if (item && typeof item.charged_weight === "number") return item.charged_weight;
  return null;
}

export interface ShipmentLine {
  name: string;
  qty: number;
  weightGrams: number;
  soldAmount: number;
  productDesc: string;
}

/** Resolve order item lines into shipment lines with real shipping weights. */
export async function resolveShipmentLines(items: Array<{
  productId?: unknown;
  name?: string;
  variant?: string;
  qty?: number;
}>, opts?: { requireWeights: boolean }): Promise<ShipmentLine[]> {
  const lines: ShipmentLine[] = [];
  for (const item of items) {
    const qty = Number(item.qty) || 0;
    if (qty <= 0) continue;
    let weightGrams = 0;
    let soldAmount = 0;
    if (item.productId) {
      const product = await Product.findById(item.productId).lean();
      const variant = product?.variants?.find(
        (v: { weight: string }) => v.weight === item.variant
      );
      weightGrams = Number(variant?.shippingWeightGrams) || 0;
      soldAmount = Number(variant?.price) || 0;
    }
    if (weightGrams <= 0 && opts?.requireWeights) {
      throw new DelhiveryError(
        `Shipping weight missing for ${item.name || "an item"} (${item.variant || ""})`,
        {
          status: 422,
          code: "MISSING_WEIGHT",
          safeMessage: "A product is missing its shipping weight. Update it in the admin panel.",
        }
      );
    }
    lines.push({
      name: item.name || "Product",
      qty,
      weightGrams,
      soldAmount: soldAmount * qty,
      productDesc: item.variant ? `${item.name} (${item.variant})` : item.name || "Product",
    });
  }
  if (lines.length === 0) {
    throw new DelhiveryError("No shippable items in the order", {
      status: 400,
      code: "MISSING_ORDER_DATA",
      safeMessage: "The order has no shippable items.",
    });
  }
  return lines;
}

export function totalWeightGrams(lines: ShipmentLine[]): number {
  return lines.reduce((sum, line) => sum + line.weightGrams * line.qty, 0);
}

export async function createDelhiveryShipment(opts: {
  orderId: string;
  orderedAt: Date;
  customerName: string;
  address: { line1: string; line2?: string; city: string; state: string; pincode: string };
  phone: string;
  lines: ShipmentLine[];
  totalAmount: number;
  /** Optional override for the shipment weight when a stored order weight exists. */
  weightGrams?: number;
  /** Admin-entered package/box description; falls back to the line summary. */
  packageDescription?: string;
  /** Per-order shipping mode override; defaults to DELHIVERY_SHIPPING_MODE. */
  shippingMode?: "S" | "E";
}): Promise<DelhiveryShipmentResult> {
  const pickupLocation = getPickupLocation();
  if (!pickupLocation) {
    throw new DelhiveryError("DELHIVERY_PICKUP_LOCATION is not configured", {
      status: 503,
      code: "PICKUP_LOCATION_NOT_CONFIGURED",
      safeMessage: "Pickup location is not configured on the server.",
    });
  }
  const totalGrams =
    opts.weightGrams && opts.weightGrams > 0
      ? Math.round(opts.weightGrams)
      : totalWeightGrams(opts.lines);
  if (totalGrams <= 0) {
    throw new DelhiveryError("Order has no shipping weight", {
      status: 422,
      code: "MISSING_WEIGHT",
      safeMessage: "Order weight is missing. Update product shipping weights.",
    });
  }

  const addressLine = [opts.address.line1, opts.address.line2]
    .filter(Boolean)
    .join(", ")
    .trim();
  if (
    !opts.customerName?.trim() ||
    !addressLine ||
    !opts.address.city?.trim() ||
    !opts.address.state?.trim()
  ) {
    throw new DelhiveryError("Order address is incomplete", {
      status: 422,
      code: "INVALID_CUSTOMER_ADDRESS",
      safeMessage: "The delivery address is incomplete. Fix it in the admin panel.",
    });
  }
  if (!/^\d{6}$/.test(opts.address.pincode ?? "")) {
    throw new DelhiveryError("Order pincode is invalid", {
      status: 422,
      code: "INVALID_PINCODE",
      safeMessage: "The delivery pincode is invalid. Fix it in the admin panel.",
    });
  }
  const phone = normalizeIndianPhone(opts.phone ?? "");
  if (!/^\d{10}$/.test(phone)) {
    throw new DelhiveryError("Order phone number is invalid", {
      status: 422,
      code: "INVALID_CUSTOMER_ADDRESS",
      safeMessage: "The delivery phone number is invalid. Fix it in the admin panel.",
    });
  }

  // Pre-validate the configured pickup location name against the locations
  // actually registered for this token. Delhivery rejects a create request
  // with success:false when pickup_location.name is not an exact registered
  // warehouse name — surfacing that BEFORE the API call yields an actionable
  // error instead of a generic "shipment rejected". Only enforced when
  // Delhivery actually returned its location list (verified) so a transient
  // list failure never blocks a valid shipment.
  const pickupCheck = await checkPickupLocationRegistration();
  if (pickupCheck.verified && !pickupCheck.match) {
    const hint =
      pickupCheck.registered.length > 0
        ? ` Delhivery has these registered: ${pickupCheck.registered
            .slice(0, 5)
            .join(" · ")}.`
        : "";
    throw new DelhiveryError(
      `DELHIVERY_PICKUP_LOCATION "${pickupLocation}" is not a registered pickup location for this account.${hint}`,
      {
        status: 422,
        code: "PICKUP_LOCATION_INVALID",
        safeMessage: `The Delhivery pickup location name is invalid or not registered for this account. Update it in Admin → Settings → Delhivery.${hint}`,
      }
    );
  }

  const productsDesc =
    opts.packageDescription?.trim() ||
    opts.lines.map((l) => `${l.qty} × ${l.name}`).join(", ");

  const shipment: DelhiveryShipmentRequest = {
    name: opts.customerName,
    add: [opts.address.line1, opts.address.line2].filter(Boolean).join(", "),
    pin: opts.address.pincode,
    phone,
    city: opts.address.city,
    state: opts.address.state,
    country: "India",
    order: opts.orderId,
    order_date: formatDelhiveryDate(opts.orderedAt),
    payment_mode: "Pre-paid",
    shipping_mode:
      (opts.shippingMode ?? getShippingMode()) === "E" ? "Express" : "Surface",
    weight: String(totalGrams),
    quantity: String(opts.lines.reduce((s, l) => s + l.qty, 0)),
    total_amount: String(Math.round(opts.totalAmount)),
    products_desc: productsDesc,
    fragile_shipment: "true",
    plastic_packaging: "true",
  };
  if (process.env.DELHIVERY_SELLER_GST_TIN) {
    shipment.seller_gst_tin = process.env.DELHIVERY_SELLER_GST_TIN;
  }
  if (process.env.DELHIVERY_HSN_CODE) {
    shipment.hsn_code = process.env.DELHIVERY_HSN_CODE;
  }
  const requestPayload = {
    shipments: [shipment],
    pickup_location: { name: pickupLocation },
  };

  console.log("[delhivery] create shipment", {
    orderId: opts.orderId,
    pickupLocation,
    originPincode: getOriginPincode(),
    shippingMode: shipment.shipping_mode,
    weightGrams: totalGrams,
    paymentMode: shipment.payment_mode,
    lineCount: opts.lines.length,
  });

  // Delhivery requires the raw "format=json&data=<json>" body (text/plain).
  // A JSON-encoded object body is rejected with "format key missing in POST".
  const response = await delhiveryFetch<DelhiveryShipmentResponse>(
    "/api/cmu/create.json",
    {
      method: "POST",
      body: `format=json&data=${JSON.stringify(requestPayload)}`,
    }
  );

  const pkg = response?.packages?.[0];
  logCreateResponse(response, opts.orderId);

  const rejected =
    !response ||
    response.success === false ||
    response.error === true ||
    (response.error &&
      typeof response.error !== "boolean" &&
      (Array.isArray(response.error) ? response.error.length > 0 : true));
  if (rejected) {
    const reason = extractShipmentError(response, pkg);
    // Include the exact Delhivery reason (rmk/errors/remarks) verbatim in the
    // admin-facing message so the real cause is never hidden behind a generic
    // "API 400".
    throw new DelhiveryError(`Delhivery rejected the shipment${reason}`, {
      status: 422,
      code: "DELHIVERY_API_ERROR",
      safeMessage: `Could not create the courier shipment.${reason ? ` Delhivery said: ${reason.replace(/^: /, "")}` : ""} Check the pickup location and order details, then retry.`,
    });
  }
  if (pkg && typeof pkg.status === "string" && pkg.status.toLowerCase() !== "success") {
    const reason = extractShipmentError(response, pkg);
    throw new DelhiveryError(
      `Delhivery did not accept the shipment${reason}`,
      {
        status: 422,
        code: "DELHIVERY_API_ERROR",
        safeMessage: `Delhivery did not accept the shipment.${reason ? ` Delhivery said: ${reason.replace(/^: /, "")}` : ""}`,
      }
    );
  }
  // The ONLY real waybill is packages[].waybill. upload_wbn ("UPL…") is a
  // batch reference — treating it as an AWB fabricated "shipped" states.
  const waybill =
    pkg?.waybill && !/^UPL/i.test(pkg.waybill) ? pkg.waybill : undefined;
  if (!waybill) {
    const reason = extractShipmentError(response, pkg);
    throw new DelhiveryError(
      `Delhivery did not return a waybill for the shipment${reason}`,
      {
        status: 422,
        code: "DELHIVERY_API_ERROR",
        safeMessage: "Delhivery did not return a tracking number. The shipment was NOT created — retry, or contact Delhivery support if this persists.",
      }
    );
  }

  return {
    waybill,
    shipmentId: response.upload_wbn || undefined,
    raw: response,
  };
}

/** Normalize an Indian phone to 10 digits: strip +91/0 prefixes, spaces, dashes. */
function normalizeIndianPhone(raw: string): string {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

/**
 * Log the create-shipment response with the waybill and any Delhivery reason
 * (rmk/remarks) — never logs the full payload/order PII.
 */
function logCreateResponse(
  response: DelhiveryShipmentResponse | null | undefined,
  orderId: string
): void {
  if (!response) {
    console.warn("[delhivery] create shipment returned an empty response", {
      orderId,
    });
    return;
  }
  console.log("[delhivery] create shipment response", {
    orderId,
    success: response.success,
    error: response.error,
    rmk: typeof response.rmk === "string" ? response.rmk.slice(0, 200) : undefined,
    uploadWbn: response.upload_wbn,
    packageCount: Array.isArray(response.packages) ? response.packages.length : 0,
    waybill: response.packages?.[0]?.waybill,
  });
}

/** Best-effort extraction of the exact reason Delhivery put in the body. */
function extractShipmentError(
  response: DelhiveryShipmentResponse | null | undefined,
  pkg?: DelhiveryShipmentPackage
): string {
  const bits: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === "string" && value.trim()) {
      bits.push(value.trim().slice(0, 200));
    } else if (value && typeof value === "object") {
      bits.push(JSON.stringify(value).slice(0, 200));
    }
  };
  push(response?.rmk);
  push(response?.error);
  push(response?.nearest);
  for (const remark of pkg?.remarks ?? []) push(remark);
  push(pkg?.status);
  if (bits.length) return `: ${bits.filter(Boolean).join(" · ")}`;
  return "";
}

/** Map a Delhivery HTTP status to an admin-safe, actionable message. */
function labelSafeMessage(status: number): string {
  if (status === 400) {
    return "Delhivery rejected the label request. Please check the shipment/AWB.";
  }
  if (status === 401 || status === 403) {
    return "Delhivery API authentication failed. Check the API token in Admin → Settings → Delhivery.";
  }
  if (status === 404) {
    return "Shipping label was not found for this AWB.";
  }
  if (status === 429) {
    return "Delivery service is rate-limiting requests. Try again shortly.";
  }
  if (status >= 500) {
    return "Delhivery is temporarily unavailable. Please try again.";
  }
  return "Could not fetch the shipping label from Delhivery.";
}

/**
 * Fetch the A4 shipping-label PDF directly.
 *
 * Endpoint (documented Delhivery Package Slip / Shipping Label API):
 *   GET {base}/api/p/packing_slip?wbns=<AWB>&pdf=True
 *   Authorization: Token <token>
 *   Content-Type: application/json
 *
 * IMPORTANT: Delhivery's API gateway performs content negotiation. Sending
 * `Accept: application/pdf` makes it reject the request with HTTP 400
 * "Could not satisfy the request Accept header." The documented request uses
 * `Accept: application/json` / `Content-Type: application/json` and the
 * endpoint still streams the raw PDF bytes. This function reads the body as
 * binary regardless.
 */
export async function fetchShippingLabelPdf(waybill: string): Promise<Buffer> {
  assertDelhiveryConfigured();
  const token = process.env.DELHIVERY_API_TOKEN as string;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(
      `${getDelhiveryBaseUrl()}/api/p/packing_slip?wbns=${encodeURIComponent(waybill)}&pdf=True`,
      {
        headers: {
          Authorization: `Token ${token}`,
          // Delhivery's content negotiation rejects `Accept: application/pdf`.
          // The documented headers below return the PDF stream successfully.
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      }
    );

    // Always read the raw bytes first — the success body is a PDF, but error
    // bodies (and some 200 responses) are JSON.
    const buffer = Buffer.from(await res.arrayBuffer());

    if (!res.ok) {
      const bodyText = buffer.toString("utf8").trim();
      throw new DelhiveryError(
        `Delhivery label API ${res.status}: ${bodyText.slice(0, 300) || "no label PDF"}`,
        { status: res.status, safeMessage: labelSafeMessage(res.status) }
      );
    }

    if (buffer.length === 0) {
      throw new DelhiveryError("Delhivery returned an empty label PDF", {
        status: 422,
        safeMessage:
          "Delhivery returned an empty label PDF. The label may not be ready yet.",
      });
    }

    // A successfully generated label is a PDF. If Delhivery answers 200 with a
    // JSON body (e.g. {"packages": [], "packages_found": 0}) the AWB is wrong or
    // the shipment is not manifested yet — surface that instead of streaming
    // JSON to the browser as a "PDF".
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const looksLikePdf =
      contentType.includes("pdf") ||
      buffer.subarray(0, 4).toString("latin1") === "%PDF";
    if (!looksLikePdf) {
      const text = buffer.toString("utf8").trim().slice(0, 300);
      throw new DelhiveryError(
        `Delhivery did not return a PDF for AWB ${waybill}: ${text || "unknown response"}`,
        {
          status: 422,
          code: "LABEL_NOT_READY",
          safeMessage:
            "Shipping label is not available until the Delhivery shipment is manifested.",
        }
      );
    }

    return buffer;
  } catch (error) {
    if (error instanceof DelhiveryError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new DelhiveryError("Delhivery label request timed out", {
        status: 0,
        safeMessage: "Delivery service timed out. Please try again.",
      });
    }
    throw new DelhiveryError(
      error instanceof Error ? error.message : "Delhivery label request failed",
      { status: 0, safeMessage: "Could not fetch the shipping label from Delhivery." }
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calendar date (YYYY-MM-DD) `offsetDays` from now in the Asia/Kolkata (IST)
 * business timezone that Delhivery's pickup executives operate in. India has
 * no DST, so a fixed +05:30 shift is exact. Reading the UTC fields after the
 * shift yields the IST wall-clock date.
 */
function istDateString(offsetDays = 0): string {
  const shifted = new Date(
    Date.now() +
      (5 * 60 + 30) * 60 * 1000 +
      offsetDays * 24 * 60 * 60 * 1000
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate()
  )}`;
}

/** Delhivery expects hh:mm:ss; tolerate hh:mm and fall back to 10:00:00. */
function normalizePickupTime(value: string | undefined): string {
  const raw = (value || "").trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw;
  if (/^\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  return "10:00:00";
}

export async function requestPickup(opts: {
  pickupLocation?: string;
  packageCount: number;
}): Promise<{
  pickupId: number | string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
}> {
  assertDelhiveryConfigured();

  const pickupLocation = opts.pickupLocation?.trim() || getPickupLocation();
  if (!pickupLocation) {
    throw new DelhiveryError("DELHIVERY_PICKUP_LOCATION is not configured", {
      status: 503,
      code: "PICKUP_LOCATION_NOT_CONFIGURED",
      safeMessage: "Pickup location is not configured on the server.",
    });
  }

  // Delhivery references a pickup location by its exact registered warehouse
  // NAME. Mirror the create-shipment pre-check so a wrong/inactive name yields
  // an actionable error instead of a bare 400. Only enforced when Delhivery
  // actually returned its location list (verified) so a transient list failure
  // never blocks a valid pickup.
  const pickupCheck = await checkPickupLocationRegistration();
  if (pickupCheck.verified && !pickupCheck.match) {
    const hint =
      pickupCheck.registered.length > 0
        ? ` Delhivery has these registered: ${pickupCheck.registered
            .slice(0, 5)
            .join(" · ")}.`
        : "";
    throw new DelhiveryError(
      `DELHIVERY_PICKUP_LOCATION "${pickupLocation}" is not a registered pickup location for this account.${hint}`,
      {
        status: 422,
        code: "PICKUP_LOCATION_INVALID",
        safeMessage: `The Delhivery pickup location name is invalid or not registered for this account. Update it in Admin → Settings → Delhivery.${hint}`,
      }
    );
  }

  // Schedule for the next business day in IST. The previous "now + 24h" in UTC
  // produced *today's* date during the early-morning IST window (00:00–05:29),
  // which Delhivery rejects for same-day/past pickup dates.
  const pickupDate = istDateString(1);
  const pickupTime = normalizePickupTime(process.env.DELHIVERY_PICKUP_TIME);
  const expectedPackageCount = Math.max(1, Math.round(opts.packageCount) || 1);

  const body = {
    pickup_time: pickupTime,
    pickup_date: pickupDate,
    pickup_location: pickupLocation,
    expected_package_count: expectedPackageCount,
  };

  let response: {
    pickup_id?: number;
    error?: string | Array<unknown> | Record<string, unknown>;
    request_response?: { reason?: string };
  };
  try {
    response = await delhiveryFetch<typeof response>("/fm/request/new/", {
      method: "POST",
      body,
    });
  } catch (error) {
    if (error instanceof DelhiveryError) {
      const detail = (error.message || "").toLowerCase();
      if (detail.includes("already") && detail.includes("pickup")) {
        throw new DelhiveryError(error.message, {
          status: error.status || 400,
          code: "PICKUP_ALREADY_EXISTS",
          safeMessage:
            "A pickup request already exists for this pickup location. Wait for it to complete, or cancel the existing request.",
        });
      }
      if (detail.includes("auto pickup") || detail.includes("auto-pickup")) {
        throw new DelhiveryError(error.message, {
          status: error.status || 400,
          code: "PICKUP_AUTO_ENABLED",
          safeMessage:
            "Automatic pickup is enabled for this Delhivery account, so a pickup request is not needed.",
        });
      }
      if (detail.includes("not active") || detail.includes("inactive")) {
        throw new DelhiveryError(error.message, {
          status: error.status || 400,
          code: "PICKUP_LOCATION_INACTIVE",
          safeMessage:
            "The Delhivery pickup location is inactive. Ask Delhivery to activate the warehouse or choose another registered location.",
        });
      }
    }
    throw error;
  }

  console.log("[delhivery] pickup request", {
    pickupLocation,
    pickupDate,
    pickupTime,
    packageCount: expectedPackageCount,
    pickupId: response?.pickup_id ?? null,
  });

  if (!response || response.pickup_id == null) {
    const reason =
      (typeof response?.error === "string" && response.error) ||
      (typeof response?.request_response?.reason === "string" &&
        response.request_response.reason);
    throw new DelhiveryError(
      `Pickup request was not accepted${reason ? `: ${reason}` : ""}`,
      {
        status: 422,
        code: "DELHIVERY_API_ERROR",
        safeMessage: "Could not request a pickup from Delhivery.",
      }
    );
  }
  return { pickupId: response.pickup_id, pickupDate, pickupTime, pickupLocation };
}

export interface PickupLocationCheck {
  /** The configured DELHIVERY_PICKUP_LOCATION value. */
  configured?: string;
  /**
   * true when Delhivery actually returned its registered pickup-location
   * list and we were able to compare names. If the API is unreachable or
   * returns an unexpected shape this stays false so we never falsely
   * accuse a valid location.
   */
  verified: boolean;
  /** The exact registered pickup-location names Delhivery returned. */
  registered: string[];
  /** Exactly one of the registered names matches the configured value. */
  match: boolean;
  /** Customer-safe reason when verification was impossible. */
  error?: string;
}

/**
 * Validates the configured DELHIVERY_PICKUP_LOCATION against the locations
 * actually registered in the connected Delhivery account.
 *
 * Delhivery's create-shipment / pickup APis reference a pickup location by
 * its exact registered NAME (not a postal address). If the env var is set to
 * an unregistered name (e.g. a full street address), shipments fail. This
 * lists what Delhivery knows so the admin can paste the exact registered
 * name. Throws a DelhiveryError only if the API call itself fails.
 */
export async function checkPickupLocationRegistration(): Promise<PickupLocationCheck> {
  const configured = getPickupLocation();
  if (!configured) {
    return {
      configured: undefined,
      verified: false,
      registered: [],
      match: false,
      error: "DELHIVERY_PICKUP_LOCATION is not set on this server.",
    };
  }
  try {
    // GET /api/v1/pickup-location/ lists the pickup locations registered to
    // the token's client account. API errors are mapped by delhiveryFetch.
    const payload = await delhiveryFetch<unknown>("/api/v1/pickup-location/");
    const registered = normalizePickupLocationNames(payload);
    if (registered.length === 0) {
      return {
        configured,
        verified: false,
        registered: [],
        match: false,
        error:
          "Delhivery returned no registered pickup locations for this token. Verify the token's client account has pickup locations set up.",
      };
    }
    const match = registered.some(
      (name) => name.trim().toLowerCase() === configured.trim().toLowerCase()
    );
    return {
      configured,
      verified: true,
      registered,
      match,
      error: match
        ? undefined
        : "Pickup location is not recognized/valid by Delhivery.",
    };
  } catch (error) {
    const safe = error instanceof DelhiveryError ? error.safeMessage : error instanceof Error ? error.message : "Unknown error";
    return {
      configured,
      verified: false,
      registered: [],
      match: false,
      error: `Could not verify pickup location with Delhivery: ${safe}`,
    };
  }
}

/**
 * Delhivery returns the location list either as a bare array or wrapped in a
 * "pickup_location" / "data" array. Each entry may be a string name or an
 * object with name/pickup_location. Tolerate the shapes so a running
 * production never falses out on a harmless response format.
 */
function normalizePickupLocationNames(payload: unknown): string[] {
  const raw = Array.isArray(payload)
    ? payload
    : (payload as Record<string, unknown> | null)?.pickup_location ??
      (payload as Record<string, unknown> | null)?.data;
  if (!Array.isArray(raw)) return [];
  const names = raw
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object") {
        const obj = entry as Record<string, unknown>;
        const value = obj.name ?? obj.pickup_location;
        return typeof value === "string" ? value : "";
      }
      return "";
    })
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  return Array.from(new Set(names));
}

export interface TrackEntry {
  scan?: string;
  scanType?: string;
  location?: string;
  status?: string;
  statusType?: string;
  statusDateTime?: string;
}

export async function getShipmentTracking(waybills: string[]): Promise<{
  entries: TrackEntry[];
  latest: TrackEntry | null;
}> {
  const clean = Array.from(new Set(waybills.filter(Boolean)));
  if (clean.length === 0) {
    return { entries: [], latest: null };
  }
  const response = await delhiveryFetch<DelhiveryTrackResponse>(
    `/api/v1/packages/json/?waybill=${clean.map(encodeURIComponent).join(",")}`
  );
  const shipment = response?.ShipmentData?.[0]?.Shipment;
  if (!shipment) return { entries: [], latest: null };

  const entries: TrackEntry[] = (shipment.Scans ?? [])
    .map((scan) => ({
      scan: scan.ScanDetail?.Scan,
      scanType: scan.ScanDetail?.ScanType,
      location: scan.ScanDetail?.ScannedLocation,
      statusDateTime: scan.ScanDetail?.ScanDateTime,
    }))
    .filter((entry) => entry.scan || entry.scanType);

  const latest: TrackEntry = {
    status: shipment.Status?.Status,
    statusType: shipment.Status?.StatusType,
    location: shipment.Status?.StatusLocation,
    statusDateTime: shipment.Status?.StatusDateTime,
    scan: shipment.Status?.Status,
  };
  return { entries, latest };
}

/**
 * Map Delhivery status type/status to an internal orderStatus.
 * StatusType is the reliable machine field (UD=manifested, DL=delivered …).
 */
export function mapDelhiveryState(latest: TrackEntry | null): {
  shipmentStatus?: string;
  orderStatus?: "processing" | "shipped" | "delivered" | "cancelled";
} {
  const type = (latest?.statusType || "").toUpperCase();
  const status = (latest?.status || "").toUpperCase();
  if (type === "DL" || status.includes("DELIVERED")) {
    return { shipmentStatus: latest?.status || "Delivered", orderStatus: "delivered" };
  }
  if (type === "RTO" || status.startsWith("RTO")) {
    return { shipmentStatus: latest?.status || "RTO" };
  }
  if (type === "UD" || type === "IT" || status) {
    return { shipmentStatus: latest?.status || "In Transit", orderStatus: "shipped" };
  }
  return { shipmentStatus: latest?.status };
}

export function buildDhlTrackingUrl(waybill: string): string {
  return `https://www.delhivery.com/track/package/${encodeURIComponent(waybill)}`;
}

function formatDelhiveryDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}