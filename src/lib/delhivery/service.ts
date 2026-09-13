import Product from "@/models/Product";
import {
  delhiveryFetch,
  DelhiveryError,
  getDelhiveryBaseUrl,
  getPickupLocation,
  getOriginPincode,
  getShippingMode,
  isDelhiveryConfigured,
} from "./client";
import type {
  DelhiveryRateItem,
  DelhiveryRatesResponse,
  DelhiveryServiceabilityResponse,
  DelhiveryShipmentPackage,
  DelhiveryShipmentRequest,
  DelhiveryShipmentResponse,
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
      safeMessage: "Please enter a valid 6-digit pincode.",
    });
  }
  if (!fromPincode) {
    throw new DelhiveryError("DELHIVERY_ORIGIN_PINCODE is not configured", {
      status: 503,
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
        { status: 422, safeMessage: "A product is missing its shipping weight. Update it in the admin panel." }
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
}): Promise<DelhiveryShipmentResponse> {
  const pickupLocation = getPickupLocation();
  if (!pickupLocation) {
    throw new DelhiveryError("DELHIVERY_PICKUP_LOCATION is not configured", {
      status: 503,
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
      safeMessage: "Order weight is missing. Update product shipping weights.",
    });
  }

  const shipment: DelhiveryShipmentRequest = {
    name: opts.customerName,
    add: [opts.address.line1, opts.address.line2].filter(Boolean).join(", "),
    pin: opts.address.pincode,
    phone: opts.phone,
    city: opts.address.city,
    state: opts.address.state,
    country: "India",
    order: opts.orderId,
    order_date: formatDelhiveryDate(opts.orderedAt),
    payment_mode: "Pre-paid",
    shipping_mode: getShippingMode() === "E" ? "Express" : "Surface",
    weight: String(totalGrams),
    quantity: String(opts.lines.reduce((s, l) => s + l.qty, 0)),
    total_amount: String(Math.round(opts.totalAmount)),
    products_desc: opts.lines.map((l) => `${l.qty} × ${l.name}`).join(", "),
    fragile_shipment: "true",
    plastic_packaging: "true",
  };
  if (process.env.DELHIVERY_SELLER_GST_TIN) {
    shipment.seller_gst_tin = process.env.DELHIVERY_SELLER_GST_TIN;
  }
  if (process.env.DELHIVERY_HSN_CODE) {
    shipment.hsn_code = process.env.DELHIVERY_HSN_CODE;
  }

  const response = await delhiveryFetch<DelhiveryShipmentResponse>(
    "/api/cmu/create.json",
    {
      method: "POST",
      body: {
        format: "json",
        data: {
          shipments: [shipment],
          pickup_location: { name: pickupLocation },
        },
      },
    }
  );

  const pkg = response?.packages?.[0];
  if (!response || (!response.success && !response.packages)) {
    // Delhivery replies HTTP 200 with success:false + the real reason here.
    const reason = extractShipmentError(response, pkg);
    throw new DelhiveryError(`Delhivery rejected the shipment${reason}`, {
      status: 422,
      safeMessage: "Could not create the courier shipment. Check the order address and try again.",
    });
  }
  if (pkg && typeof pkg.status === "string" && pkg.status.toLowerCase() !== "success") {
    const reason = extractShipmentError(response, pkg);
    throw new DelhiveryError(
      `Delhivery did not accept the shipment${reason}`,
      {
        status: 422,
        safeMessage: "Delhivery did not accept the shipment. Check the pickup location and order details.",
      }
    );
  }
  return response;
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
  push(response?.error);
  push(response?.nearest);
  for (const remark of pkg?.remarks ?? []) push(remark);
  push(pkg?.status);
  if (bits.length) return `: ${bits.filter(Boolean).join(" · ")}`;
  return "";
}

/** Fetch the A4 shipping-label PDF directly (the packing-slip route returns raw PDF, not JSON). */
export async function fetchShippingLabelPdf(waybill: string): Promise<Buffer> {
  const token = process.env.DELHIVERY_API_TOKEN;
  if (!token) {
    throw new DelhiveryError("Delhivery is not configured", {
      status: 503,
      safeMessage: "Shipping service is not configured yet.",
    });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(
      `${getDelhiveryBaseUrl()}/api/p/packing_slip?wbns=${encodeURIComponent(waybill)}&pdf=True`,
      {
        headers: {
          Authorization: `Token ${token}`,
          Accept: "application/pdf",
        },
        signal: controller.signal,
        cache: "no-store",
      }
    );
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!res.ok) {
      throw new DelhiveryError(
        `Delhivery label API ${res.status}: ${buffer.toString("utf8").slice(0, 300) || "no label PDF"}`,
        { status: res.status, safeMessage: "Could not fetch the shipping label from Delhivery." }
      );
    }
    if (buffer.length === 0) {
      throw new DelhiveryError("Delhivery returned an empty label PDF", {
        status: 422,
        safeMessage: "Delhivery returned an empty label PDF. The label may not be ready yet.",
      });
    }
    return buffer;
  } catch (error) {
    if (error instanceof DelhiveryError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new DelhiveryError("Delhivery label request timed out", {
        status: 0,
        safeMessage: "Label request timed out. Try again.",
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

export async function requestPickup(opts: {
  pickupLocation?: string;
  packageCount: number;
}): Promise<{ pickupId: number | string }> {
  const pickupLocation = opts.pickupLocation?.trim() || getPickupLocation();
  if (!pickupLocation) {
    throw new DelhiveryError("DELHIVERY_PICKUP_LOCATION is not configured", {
      status: 503,
      safeMessage: "Pickup location is not configured on the server.",
    });
  }
  const pickupDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const pickupTime = process.env.DELHIVERY_PICKUP_TIME || "10:00:00";

  const response = await delhiveryFetch<{
    pickup_id?: number;
    error?: string | Array<unknown> | Record<string, unknown>;
    request_response?: { reason?: string };
  }>("/fm/request/new/", {
    method: "POST",
    body: {
      pickup_time: pickupTime,
      pickup_date: pickupDate,
      pickup_location: pickupLocation,
      expected_package_count: opts.packageCount,
    },
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
        safeMessage: "Could not request a pickup from Delhivery.",
      }
    );
  }
  return { pickupId: response.pickup_id };
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