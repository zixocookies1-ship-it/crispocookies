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
  createdAt: Date;
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
  createdAt: { type: Date, default: Date.now },
});

// Indexes for admin dashboard + order lookups (sorts/filters must not COLLSCAN as volume grows)
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ razorpayOrderId: 1 });

export default mongoose.models.Order ||
  mongoose.model<IOrder>("Order", OrderSchema);
