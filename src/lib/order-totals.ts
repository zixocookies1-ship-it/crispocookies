import { connectDB } from "./mongodb";
import Product from "@/models/Product";
import { getActivePromotion, priceLines } from "./pricing";
import {
  PricedLine,
  computeOrderTotals,
  CouponDiscountType,
  ActivePromotion,
  DELIVERY_CHARGE,
} from "./pricing-math";
import {
  validateCoupon,
  normalizeCouponCode,
  CouponError,
} from "./coupons";
import {
  isDelhiveryConfigured,
  checkPincodeServiceability,
} from "./delhivery";

/**
 * SINGLE authoritative calculation for checkout, coupon validation, the
 * Razorpay order amount and the stored order. Never trusts product prices,
 * coupon validity or discount values from the browser. Product prices are
 * re-fetched from the database on every call.
 *
 * A flat â‚¹40 delivery charge applies to every order â€” there is no
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
  /** Shipping weight of one unit in grams (from the database). */
  shippingWeightGrams: number;
}

export interface StoredItem {
  productId: string;
  name: string;
  image: string;
  variant: string;
  qty: number;
  /** MRP at the time of purchase. Undefined for legacy rows. */
  mrp?: number;
  /** Selling price before the launch offer (Σ base × qty → unit). */
  unitPrice?: number;
  /** Reference/base the offer percentage was applied to. */
  basePrice?: number;
  /** Launch-offer discount for ONE unit, as charged at purchase time. */
  offerDiscount?: number;
  /** Unit price the customer actually paid (after launch offer). */
  price: number;
}

export interface TotalsSnapshot {
  lines: ResolvedLine[];
  /** Items exactly as stored on the order (offer-discounted unit price). */
  items: StoredItem[];
  promotion: ActivePromotion | null;
  originalSubtotal: number; // catalog (pre-offer) subtotal
  /**
   * MRP catalog subtotal (Î£ base Ã— qty). The authoritative "Subtotal" every
   * frontend should render â€” the launch-offer discount is derived from the
   * same base so discount can never exceed it.
   */
  catalogSubtotal: number; // MRP/reference catalog subtotal
  offerDiscount: number; // launch-offer discount
  finalSubtotal: number; // after offer, before coupon
  eligibleSubtotal: number; // catalog value of coupon-eligible lines
  couponDiscount: number; // coupon discount actually applied
  totalDiscount: number; // offer + coupon
  deliveryCharge: number;
  /** "delhivery" when the charge came from Delhivery rate, else "flat". */
  deliveryProvider: "delhivery" | "flat";
  /** Total shipping weight of the order in grams. */
  shippingWeightGrams: number;
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
  deliveryPincode?: string | null;
}): Promise<TotalsSnapshot> {
  await connectDB();

  if (!Array.isArray(opts.rawItems) || opts.rawItems.length === 0) {
    throw new CouponError("No items provided", 400);
  }
  if (opts.rawItems.length > MAX_ITEMS_PER_ORDER) {
    throw new CouponError("Too many items in order", 400);
  }

  // Validate and merge duplicate product+variant lines BEFORE hitting the
  // database. Without this, repeated lines were each stock-checked on their own,
  // so two lines of qty 3 against stock 5 both passed and the order oversold.
  const merged = new Map<string, { productId: string; variant: string; qty: number }>();
  for (const item of opts.rawItems) {
    if (
      typeof item?.productId !== "string" ||
      !item.productId ||
      typeof item?.variant !== "string" ||
      !item.variant ||
      !Number.isInteger(item.qty) ||
      item.qty <= 0
    ) {
      throw new CouponError("Invalid item data", 400);
    }

    const key = `${item.productId}::${item.variant}`;
    const current = merged.get(key);
    const qty = (current?.qty ?? 0) + item.qty;
    if (qty > MAX_QTY_PER_ITEM) {
      throw new CouponError(
        `Maximum ${MAX_QTY_PER_ITEM} units per product per order`,
        400
      );
    }
    merged.set(key, { productId: item.productId, variant: item.variant, qty });
  }

  const mergedItems = Array.from(merged.values());

  // One round trip for the whole cart instead of one findById per line.
  // Inactive/unpublished products are excluded so a stale cart can never
  // order something that has been removed from the storefront.
  const productDocs = await Product.find({
    _id: { $in: mergedItems.map((i) => i.productId) },
    isActive: true,
  })
    .select("name images category variants")
    .lean();

  const productById = new Map(productDocs.map((p) => [String(p._id), p]));

  const resolved: ResolvedLine[] = [];
  const eligibilityLines: Array<{
    productId: string;
    categoryId: string | null;
    unitPrice: number;
    qty: number;
  }> = [];

  for (const item of mergedItems) {
    const product = productById.get(item.productId);
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
    const shippingWeightGrams =
      typeof variant.shippingWeightGrams === "number" &&
      Number.isFinite(variant.shippingWeightGrams)
        ? variant.shippingWeightGrams
        : 0;

    resolved.push({
      productId: String(product._id),
      name: product.name,
      image: product.images?.[0] || "",
      variant: item.variant,
      qty: item.qty,
      unitPrice,
      mrp,
      categoryId: product.category ? String(product.category) : null,
      shippingWeightGrams,
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

  const totalWeightGrams = resolved.reduce(
    (sum, line) => sum + line.shippingWeightGrams * line.qty,
    0
  );
  let deliveryCharge = DELIVERY_CHARGE;
  let deliveryProvider: "delhivery" | "flat" = "flat";

  const deliveryPincode = opts.deliveryPincode?.trim();
  if (deliveryPincode && isDelhiveryConfigured()) {
    try {
      const serviceable = await checkPincodeServiceability(deliveryPincode);
      if (!serviceable.serviceable) {
        throw new CouponError(
          "Delivery is not available at this pincode.",
          400
        );
      }
      // Delivery charge is a fixed â‚¹40 for every order â€” never reduced or
      // increased by the live Delhivery rate. Keep only the serviceability
      // gate; do NOT replace deliveryCharge with a Delhivery estimate.
    } catch (error) {
      if (error instanceof CouponError) throw error;
      console.warn(
        "[order-totals] Delhivery rate unavailable â€” using flat delivery",
        { message: error instanceof Error ? error.message : String(error) }
      );
      deliveryCharge = DELIVERY_CHARGE;
      deliveryProvider = "flat";
    }
  }

  const finalTotals = computeOrderTotals(pricedLines, {
    couponDiscount,
    charge: deliveryCharge,
  });

  // Immutable per-item price snapshot. Everything the order summary, the
  // customer confirmation and the admin UI display is derived from these
  // values, so a later catalog price/promotion change can never rewrite what
  // a historical order says it cost.
  const items = resolved.map((line, i) => ({
    productId: line.productId,
    name: line.name,
    image: line.image,
    variant: line.variant,
    qty: line.qty,
    mrp: line.mrp,
    unitPrice: line.unitPrice,
    basePrice: pricedLines[i].base,
    offerDiscount: pricedLines[i].unitDiscount,
    price: pricedLines[i].unitFinal,
  }));

  return {
    lines: resolved,
    items,
    promotion,
    originalSubtotal: finalTotals.originalSubtotal,
    catalogSubtotal: finalTotals.catalogSubtotal,
    offerDiscount: finalTotals.discount,
    finalSubtotal: finalTotals.finalSubtotal,
    eligibleSubtotal: coupon ? eligibleSubtotal : 0,
    couponDiscount: finalTotals.couponDiscount,
    totalDiscount: finalTotals.totalDiscount,
    deliveryCharge: finalTotals.deliveryCharge,
    deliveryProvider,
    shippingWeightGrams: totalWeightGrams,
    freeDelivery: finalTotals.freeDelivery,
    total: finalTotals.total,
    coupon,
  };
}