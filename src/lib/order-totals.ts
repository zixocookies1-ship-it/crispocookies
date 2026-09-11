import { connectDB } from "./mongodb";
import Product from "@/models/Product";
import { getActivePromotion, priceLines } from "./pricing";
import {
  PricedLine,
  computeOrderTotals,
  CouponDiscountType,
  ActivePromotion,
} from "./pricing-math";
import {
  validateCoupon,
  normalizeCouponCode,
  CouponError,
} from "./coupons";

/**
 * SINGLE authoritative calculation for checkout, coupon validation, the
 * Razorpay order amount and the stored order. Never trusts product prices,
 * coupon validity or discount values from the browser. Product prices are
 * re-fetched from the database on every call.
 *
 * A flat ₹100 delivery charge applies to every order — there is no
 * free-delivery threshold. Minimum-order-value is evaluated on the catalog
 * subtotal so the rule is stable regardless of any temporary launch offer.
 */

export interface RawCartLine {
  productId: string;
  variant: string;
  qty: number;
}

export interface ResolvedLine {
  productId: string;
  name: string;
  image: string;
  variant: string;
  qty: number;
  /** Catalog unit price (from the database). */
  unitPrice: number;
  /** MRP / reference price (from the database). */
  mrp?: number;
  categoryId: string | null;
}

export interface StoredItem {
  productId: string;
  name: string;
  image: string;
  variant: string;
  qty: number;
  /** Unit price the customer actually paid (after launch offer). */
  price: number;
}

export interface TotalsSnapshot {
  lines: ResolvedLine[];
  /** Items exactly as stored on the order (offer-discounted unit price). */
  items: StoredItem[];
  promotion: ActivePromotion | null;
  originalSubtotal: number; // catalog (pre-offer) subtotal
  offerDiscount: number; // launch-offer discount
  finalSubtotal: number; // after offer, before coupon
  eligibleSubtotal: number; // catalog value of coupon-eligible lines
  couponDiscount: number; // coupon discount actually applied
  totalDiscount: number; // offer + coupon
  deliveryCharge: number;
  freeDelivery: boolean;
  total: number; // the exact amount charged (paise = total * 100)
  coupon: {
    id: string;
    code: string;
    discountType: CouponDiscountType;
    discountValue: number;
    description: string;
  } | null;
}

const MAX_QTY_PER_ITEM = 50;
const MAX_ITEMS_PER_ORDER = 50;

export async function calculateOrderTotals(opts: {
  rawItems: RawCartLine[];
  couponCode?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
}): Promise<TotalsSnapshot> {
  await connectDB();

  if (!Array.isArray(opts.rawItems) || opts.rawItems.length === 0) {
    throw new CouponError("No items provided", 400);
  }
  if (opts.rawItems.length > MAX_ITEMS_PER_ORDER) {
    throw new CouponError("Too many items in order", 400);
  }

  const resolved: ResolvedLine[] = [];
  const eligibilityLines: Array<{
    productId: string;
    categoryId: string | null;
    unitPrice: number;
    qty: number;
  }> = [];

  for (const item of opts.rawItems) {
    if (
      typeof item?.productId !== "string" ||
      !item.productId ||
      typeof item?.variant !== "string" ||
      !item.variant ||
      !Number.isInteger(item.qty) ||
      item.qty <= 0 ||
      item.qty > MAX_QTY_PER_ITEM
    ) {
      throw new CouponError("Invalid item data", 400);
    }

    const product = await Product.findById(item.productId).lean();
    if (!product) throw new CouponError("Product not found", 400);

    const variant = product.variants?.find(
      (v: { weight: string }) => v.weight === item.variant
    );
    if (!variant) throw new CouponError("Variant not found", 400);
    if (variant.stock < item.qty)
      throw new CouponError(
        `Insufficient stock for ${product.name} (${item.variant})`,
        400
      );

    const unitPrice = Number(variant.price) || 0;
    if (unitPrice <= 0)
      throw new CouponError("Product price is invalid", 400);

    const mrp =
      typeof variant.mrp === "number" && Number.isFinite(variant.mrp)
        ? variant.mrp
        : undefined;

    resolved.push({
      productId: String(product._id),
      name: product.name,
      image: product.images?.[0] || "",
      variant: item.variant,
      qty: item.qty,
      unitPrice,
      mrp,
      categoryId: product.category ? String(product.category) : null,
    });
    eligibilityLines.push({
      productId: String(product._id),
      categoryId: product.category ? String(product.category) : null,
      unitPrice,
      qty: item.qty,
    });
  }

  const promotion = await getActivePromotion();
  const pricedLines: PricedLine[] = priceLines(
    resolved.map((l) => ({
      unitPrice: l.unitPrice,
      qty: l.qty,
      referencePrice: l.mrp,
    })),
    promotion
  );

  let coupon: TotalsSnapshot["coupon"] = null;
  let couponDiscount = 0;
  let eligibleSubtotal = 0;

  const normalizedCoupon = normalizeCouponCode(opts.couponCode);
  if (normalizedCoupon) {
    const result = await validateCoupon({
      code: normalizedCoupon,
      lines: eligibilityLines,
      customerEmail: opts.customerEmail,
      customerPhone: opts.customerPhone,
    });
    eligibleSubtotal = result.eligibleSubtotal;
    couponDiscount = result.couponDiscount;
    coupon = {
      id: String(result.coupon._id),
      code: result.coupon.code,
      discountType: result.coupon.discountType,
      discountValue: result.coupon.discountValue,
      description: result.coupon.description || "",
    };
  }

  const totals = computeOrderTotals(pricedLines, { couponDiscount });

  const items = resolved.map((line, i) => ({
    productId: line.productId,
    name: line.name,
    image: line.image,
    variant: line.variant,
    qty: line.qty,
    price: pricedLines[i].unitFinal,
  }));

  return {
    lines: resolved,
    items,
    promotion,
    originalSubtotal: totals.originalSubtotal,
    offerDiscount: totals.discount,
    finalSubtotal: totals.finalSubtotal,
    eligibleSubtotal: coupon ? eligibleSubtotal : 0,
    couponDiscount: totals.couponDiscount,
    totalDiscount: totals.totalDiscount,
    deliveryCharge: totals.deliveryCharge,
    freeDelivery: totals.freeDelivery,
    total: totals.total,
    coupon,
  };
}