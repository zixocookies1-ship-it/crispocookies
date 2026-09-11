import { connectDB } from "./mongodb";
import Coupon, { ICoupon } from "@/models/Coupon";
import CouponUsage from "@/models/CouponUsage";
import Order from "@/models/Order";
import { computeCouponDiscount } from "./pricing-math";
import { formatPrice } from "./helpers";

/**
 * Server-side coupon service. This is the ONLY authority on coupon validity,
 * status, eligibility and usage. The storefront never computes these values.
 */

export type CouponStatus =
  | "active"
  | "scheduled"
  | "expired"
  | "exhausted"
  | "inactive";

export class CouponError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "CouponError";
    this.status = status;
  }
}

/** Codes are normalized to uppercase on the server — never on the client only. */
export function normalizeCouponCode(code?: string | null): string {
  return (code ?? "").trim().toUpperCase();
}

export function isValidCouponCodeFormat(code: string): boolean {
  return /^[A-Z0-9_-]{2,32}$/.test(code);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Stable identity for guest customers. Never trusts a frontend ID. */
export function couponCustomerKey(
  email?: string | null,
  phone?: string | null
): string | null {
  const e = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (e && /\S+@\S+\.\S+/.test(e)) return `email:${e}`;
  const p = typeof phone === "string" ? String(phone).replace(/\D/g, "") : "";
  if (p.length >= 6) return `phone:${p}`;
  return null;
}

/** Effective status of a coupon record — single source of truth everywhere. */
export function couponStatus(c: {
  active: boolean;
  startDate: string | Date;
  expiryDate: string | Date;
  maxTotalUses: number;
  totalUsed: number;
}): CouponStatus {
  if (!c.active) return "inactive";
  const now = Date.now();
  const start = new Date(c.startDate).getTime();
  const expiry = new Date(c.expiryDate).getTime();
  if (now < start) return "scheduled";
  if (now > expiry) return "expired";
  if ((c.maxTotalUses || 0) > 0 && c.totalUsed >= c.maxTotalUses)
    return "exhausted";
  return "active";
}

export const COUPON_STATUS_LABELS: Record<CouponStatus, string> = {
  active: "active",
  scheduled: "scheduled",
  expired: "expired",
  exhausted: "exhausted",
  inactive: "inactive",
};

interface CouponEligibleLine {
  productId: string;
  categoryId?: string | null;
  unitPrice: number;
  qty: number;
}

export interface CouponValidationResult {
  coupon: ICoupon;
  couponDiscount: number;
  eligibleSubtotal: number;
}

async function countPaidOrdersByCustomer(
  email?: string | null,
  phone?: string | null
): Promise<number> {
  const or: Array<Record<string, unknown>> = [];
  const e = typeof email === "string" ? email.trim() : "";
  if (e) or.push({ email: { $regex: new RegExp(`^${escapeRegExp(e)}$`, "i") } });
  const p = typeof phone === "string" ? phone.trim() : "";
  if (p) or.push({ phone: p });
  if (or.length === 0) return 0;
  return Order.countDocuments({ paymentStatus: "paid", $or: or });
}

/**
 * Full server-side validation. Throws CouponError with a customer-safe message
 * when the coupon cannot be applied. Never trusts prices from the browser.
 */
export async function validateCoupon(opts: {
  code: string;
  lines: CouponEligibleLine[];
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerKey?: string | null;
}): Promise<CouponValidationResult> {
  await connectDB();

  const code = normalizeCouponCode(opts.code);
  if (!code) throw new CouponError("Invalid coupon code.");

  const coupon = await Coupon.findOne({ code }).lean();
  if (!coupon) throw new CouponError("Invalid coupon code.");

  const now = new Date();
  if (!coupon.active) throw new CouponError("This coupon is currently unavailable.");
  if (now < new Date(coupon.startDate))
    throw new CouponError("This coupon is not active yet.");
  if (now > new Date(coupon.expiryDate)) throw new CouponError("This coupon has expired.");
  if (
    (coupon.maxTotalUses || 0) > 0 &&
    coupon.totalUsed >= coupon.maxTotalUses
  )
    throw new CouponError("This coupon has reached its usage limit.");

  const key =
    opts.customerKey ??
    couponCustomerKey(opts.customerEmail, opts.customerPhone);

  if (key && (coupon.maxUsesPerCustomer || 0) > 0) {
    const used = await CouponUsage.countDocuments({
      couponId: coupon._id,
      customerKey: key,
    });
    if (used >= coupon.maxUsesPerCustomer)
      throw new CouponError("You have already used this coupon.");
  }

  if (key && coupon.firstOrderOnly) {
    const hasPaidOrder = await countPaidOrdersByCustomer(
      opts.customerEmail,
      opts.customerPhone
    );
    if (hasPaidOrder > 0)
      throw new CouponError("This coupon is valid for first orders only.");
  }

  const isObjId = (v: unknown) =>
    typeof v === "string" &&
    /^[0-9a-fA-F]{24}$/.test(v) &&
    v !== "000000000000000000000000";

  const appProducts = new Set((coupon.applicableProducts || []).map(String));
  const excProducts = new Set((coupon.excludedProducts || []).map(String));
  const appCategories = new Set(
    (coupon.applicableCategories || []).map(String)
  );
  const excCategories = new Set(
    (coupon.excludedCategories || []).map(String)
  );

  const hasIncludeRule =
    appProducts.size > 0 || appCategories.size > 0;

  let eligibleSubtotal = 0;
  let hasEligible = false;
  for (const line of opts.lines) {
    const productId = String(line.productId ?? "");
    const categoryId = line.categoryId ? String(line.categoryId) : "";
    if (!isObjId(productId)) continue;

    const appliesByProduct =
      appProducts.size > 0 && appProducts.has(productId);
    const appliesByCategory =
      appCategories.size > 0 &&
      !!categoryId &&
      isObjId(categoryId) &&
      appCategories.has(categoryId);
    const applies = !hasIncludeRule || appliesByProduct || appliesByCategory;
    const excluded =
      (excProducts.size > 0 && excProducts.has(productId)) ||
      (excCategories.size > 0 &&
        !!categoryId &&
        isObjId(categoryId) &&
        excCategories.has(categoryId));

    if (applies && !excluded) {
      const price = Math.max(0, Number(line.unitPrice) || 0);
      const qty = Math.max(0, Number(line.qty) || 0);
      eligibleSubtotal += price * qty;
      hasEligible = true;
    }
  }

  if (!hasEligible || eligibleSubtotal <= 0)
    throw new CouponError(
      "This coupon is not applicable to the selected products."
    );

  const checkoutSubtotal = opts.lines.reduce(
    (sum, line) =>
      sum +
      Math.max(0, Number(line.unitPrice) || 0) *
        Math.max(0, Number(line.qty) || 0),
    0
  );
  const minOrder = Math.max(0, coupon.minimumOrderValue || 0);
  if (minOrder > 0 && checkoutSubtotal < minOrder)
    throw new CouponError(
      `Minimum order value of ${formatPrice(minOrder)} is required to use this coupon.`
    );

  const couponDiscount = computeCouponDiscount({
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    eligibleSubtotal,
    maximumDiscount: coupon.maximumDiscount || null,
  });

  if (couponDiscount <= 0)
    throw new CouponError("This coupon does not reduce your order total.");

  return { coupon, couponDiscount, eligibleSubtotal };
}

/**
 * Atomically claim one unit of usage. Guards the final-remaining-use race:
 * two concurrent requests can never both pass the totalUsed < maxTotalUses
 * check because the increment happens in the same atomic update.
 * Returns true when the claim succeeded.
 */
export async function claimCouponUsage(couponId: string): Promise<boolean> {
  await connectDB();
  const res = await Coupon.updateOne(
    {
      _id: couponId,
      $expr: {
        $or: [
          { $lte: ["$maxTotalUses", 0] },
          { $lt: ["$totalUsed", "$maxTotalUses"] },
        ],
      },
    },
    { $inc: { totalUsed: 1 } }
  );
  return res.modifiedCount === 1;
}

/** Record one successful coupon use (history + per-customer counting). */
export async function recordCouponUsage(opts: {
  couponId: string;
  couponCode: string;
  orderObjectId: string;
  orderId: string;
  customerName: string;
  email: string;
  phone: string;
  customerKey: string | null;
  discountAmount: number;
  orderSubtotal: number;
  orderTotal: number;
}): Promise<void> {
  await connectDB();
  try {
    await CouponUsage.create({
      couponId: opts.couponId,
      couponCode: opts.couponCode,
      orderObjectId: opts.orderObjectId,
      orderId: opts.orderId,
      customerName: opts.customerName,
      email: opts.email,
      phone: opts.phone,
      customerKey:
        opts.customerKey ||
        couponCustomerKey(opts.email, opts.phone) ||
        "",
      discountAmount: opts.discountAmount,
      orderSubtotal: opts.orderSubtotal,
      orderTotal: opts.orderTotal,
    });
  } catch (error) {
    // Duplicate (already-recorded order, e.g. idempotent callback) — ignore.
    console.warn("[coupon] usage record skipped", {
      orderId: opts.orderId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}