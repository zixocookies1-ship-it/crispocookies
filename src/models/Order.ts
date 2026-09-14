import mongoose, { Schema, Document } from "mongoose";

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  image: string;
  variant: string;
  qty: number;
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
  paymentStatus: "pending" | "paid" | "failed";
  orderStatus: "processing" | "shipped" | "delivered" | "cancelled";
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
      price: { type: Number },
    },
  ],
  subtotal: { type: Number, required: true },
  subtotalBeforeDiscount: { type: Number, default: 0 },
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
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },
  orderStatus: {
    type: String,
    enum: ["processing", "shipped", "delivered", "cancelled"],
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
OrderSchema.index({ razorpayOrderId: 1 });
OrderSchema.index({ razorpayPaymentId: 1 });
OrderSchema.index({ waybill: 1 });

export default mongoose.models.Order ||
  mongoose.model<IOrder>("Order", OrderSchema);
