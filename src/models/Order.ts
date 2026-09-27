import mongoose, { Schema, Document } from "mongoose";

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  image: string;
  variant: string;
  qty: number;
  /** MRP at purchase time (optional — legacy rows may not have it). */
  mrp?: number;
  /** Selling price per unit before the launch offer. */
  unitPrice?: number;
  /** Reference base the offer percentage was applied to. */
  basePrice?: number;
  /** Launch-offer discount per unit. */
  offerDiscount?: number;
  /** Unit price actually charged (after launch offer). */
  price: number;
}

export interface IOrder extends Document {
  orderId: string;
  customerName: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  items: IOrderItem[];
  subtotal: number;
  /** Original (pre-discount) product subtotal. */
  subtotalBeforeDiscount: number;
  /**
   * MRP catalog subtotal (Σ base × qty) — the authoritative "Subtotal" for
   * display. Discount is derived from the same base, so discount ≤ this.
   */
  catalogSubtotal: number;
  /** Launch-offer discount applied to this order (0 when none). */
  discount: number;
  /** Snapshot of the promotion that produced the discount. */
  promotion?: {
    name: string;
    discountType: string;
    discountValue: number;
  };
  /** Coupon discount applied to this order (0 when none). */
  couponDiscount: number;
  /** Catalog value of the lines the coupon was eligible on. */
  eligibleSubtotal: number;
  /** Historical snapshot of the exact coupon configuration used. */
  coupon?: {
    code: string;
    id: string;
    discountType: string;
    discountValue: number;
    description: string;
  };
  deliveryCharge: number;
  total: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  /** Server-side verification timestamp (set with paymentStatus -> paid). */
  paymentVerifiedAt?: Date;
  /** When the order was first persisted as a pending payment attempt. */
  paymentInitiatedAt?: Date;
  /**
   * Client-generated idempotency key for one checkout attempt. Prevents a
   * double click or a retried create-order request from opening two gateway
   * orders for the same basket.
   */
  checkoutAttemptId?: string;
  /**
   * Per-step state for post-payment bookkeeping. Written after the atomic
   * pending -> paid flip so an interrupted run can be resumed by the
   * reconciliation cron instead of being silently dropped.
   */
  fulfillment?: {
    coupon?: "pending" | "done" | "failed" | "skipped";
    customer?: "pending" | "done" | "failed";
    notification?: "pending" | "done" | "failed";
    stock?: "pending" | "done" | "failed" | "attention";
    shipment?: "pending" | "done" | "failed";
    /**
     * Per-line record of the stock decrement, so a resumed or duplicated
     * post-payment run can never decrement the same variant twice.
     */
    stockLines?: Array<{
      productId: string;
      variant: string;
      applied: boolean;
      shortfall: number;
      /**
       * false while the line is only claimed and the outcome is still unknown.
       * A settled line is never touched again; an unsettled one is retried.
       */
      settled: boolean;
    }>;
    updatedAt?: Date;
  };
  paymentStatus: "pending" | "paid" | "failed";
  orderStatus:
    | "processing"
    | "confirmed"
    | "shipped"
    | "delivered"
    | "cancelled";
  /** Delhivery One integrations (all server-side). */
  deliveryProvider?: string;
  /** Total shipping weight of the order in grams. */
  shippingWeightGrams?: number;
  /** Shipment cost charged (already inside deliveryCharge/total). */
  shippingCost?: number;
  /** Admin-entered package weight in grams (overrides product-derived weight). */
  shipmentWeightOverrideGrams?: number;
  /** Admin-entered package/box description for the shipment. */
  packageDescription?: string;
  /** Admin-entered package dimensions in centimetres (pre-shipment only). */
  packageDimensions?: {
    lengthCm?: number;
    breadthCm?: number;
    heightCm?: number;
  };
  /** "S" Surface / "E" Express; overrides the server-wide DELHIVERY_SHIPPING_MODE for this order only. */
  shippingModeOverride?: "S" | "E";
  waybill?: string;
  shipmentStatus?: string;
  /** Latest Delhivery scan status text (e.g. "Manifested"). */
  lastScan?: string;
  lastScanTime?: Date;
  lastScanType?: string;
  trackingUrl?: string;
  /** null = label is streamed on demand via the admin label endpoint. */
  labelUrl?: string | null;
  shipmentId?: string;
  pickedUp?: boolean;
  pickedUpAt?: Date;
  shipmentCreatedAt?: Date;
  shipmentError?: string;
  /** Delhivery sync lifecycle: pending → synced | failed | unconfigured. */
  syncState?: "pending" | "synced" | "failed" | "unconfigured";
  /** Last time a Delhivery sync attempt touched this order (retry throttle). */
  syncAttemptedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

const OrderSchema = new Schema<IOrder>({
  orderId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: {
    line1: { type: String },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    country: { type: String, default: "India" },
  },
  items: [
    {
      productId: { type: Schema.Types.ObjectId, ref: "Product" },
      name: { type: String },
      image: { type: String },
      variant: { type: String },
      qty: { type: Number },
      mrp: { type: Number },
      unitPrice: { type: Number },
      basePrice: { type: Number },
      offerDiscount: { type: Number },
      price: { type: Number },
    },
  ],
  subtotal: { type: Number, required: true },
  subtotalBeforeDiscount: { type: Number, default: 0 },
  catalogSubtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  promotion: {
    name: { type: String },
    discountType: { type: String },
    discountValue: { type: Number },
  },
  couponDiscount: { type: Number, default: 0 },
  eligibleSubtotal: { type: Number, default: 0 },
  coupon: {
    code: { type: String },
    id: { type: String },
    discountType: { type: String },
    discountValue: { type: Number },
    description: { type: String },
  },
  deliveryCharge: { type: Number, default: 0 },
  total: { type: Number, required: true },
  razorpayOrderId: { type: String, default: "" },
  razorpayPaymentId: { type: String, default: "" },
  razorpaySignature: { type: String, default: "" },
  paymentVerifiedAt: { type: Date },
  paymentInitiatedAt: { type: Date },
  checkoutAttemptId: { type: String },
  fulfillment: {
    coupon: {
      type: String,
      enum: ["pending", "done", "failed", "skipped"],
      default: "pending",
    },
    customer: {
      type: String,
      enum: ["pending", "done", "failed"],
      default: "pending",
    },
    notification: {
      type: String,
      enum: ["pending", "done", "failed"],
      default: "pending",
    },
    stock: {
      type: String,
      enum: ["pending", "done", "failed", "attention"],
      default: "pending",
    },
    stockLines: {
      type: [
        {
          _id: false,
          productId: { type: String },
          variant: { type: String },
          applied: { type: Boolean, default: false },
          shortfall: { type: Number, default: 0 },
          settled: { type: Boolean, default: false },
        },
      ],
      default: undefined,
    },
    shipment: {
      type: String,
      enum: ["pending", "done", "failed"],
      default: "pending",
    },
    updatedAt: { type: Date },
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },
  orderStatus: {
    type: String,
    enum: ["processing", "confirmed", "shipped", "delivered", "cancelled"],
    default: "processing",
  },
  deliveryProvider: { type: String },
  shippingWeightGrams: { type: Number, default: 0 },
  shippingCost: { type: Number, default: 0 },
  shipmentWeightOverrideGrams: { type: Number, default: null },
  packageDescription: { type: String, default: "" },
  packageDimensions: {
    lengthCm: { type: Number },
    breadthCm: { type: Number },
    heightCm: { type: Number },
  },
  shippingModeOverride: { type: String, enum: ["S", "E"], default: null },
  waybill: { type: String },
  shipmentStatus: { type: String },
  lastScan: { type: String },
  lastScanTime: { type: Date },
  lastScanType: { type: String },
  trackingUrl: { type: String },
  labelUrl: { type: String, default: null },
  shipmentId: { type: String },
  pickedUp: { type: Boolean, default: false },
  pickedUpAt: { type: Date },
  shipmentCreatedAt: { type: Date },
  shipmentError: { type: String },
  syncState: {
    type: String,
    enum: ["pending", "synced", "failed", "unconfigured"],
  },
  syncAttemptedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for admin dashboard + order lookups (sorts/filters must not COLLSCAN as volume grows)
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ waybill: 1 });
OrderSchema.index({ email: 1, createdAt: -1 });
// Reconciliation scans paid orders whose post-payment bookkeeping is unfinished.
OrderSchema.index({ paymentStatus: 1, "fulfillment.notification": 1 });
// Gateway identifiers must map to exactly one local order — this is the last
// line of defence against a duplicated callback/webhook creating two orders.
// Partial + non-empty: legacy documents default these fields to "", so a plain
// unique index would collide across every pre-existing pending order.
const nonEmptyString = {
  $type: "string",
  $gt: "",
} as const;
OrderSchema.index(
  { razorpayOrderId: 1 },
  { unique: true, partialFilterExpression: { razorpayOrderId: nonEmptyString } }
);
OrderSchema.index(
  { razorpayPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: { razorpayPaymentId: nonEmptyString },
  }
);
OrderSchema.index(
  { checkoutAttemptId: 1 },
  {
    unique: true,
    partialFilterExpression: { checkoutAttemptId: nonEmptyString },
  }
);

export default mongoose.models.Order ||
  mongoose.model<IOrder>("Order", OrderSchema);
