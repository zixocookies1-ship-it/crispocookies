import mongoose, { Schema, Document } from "mongoose";
import { Types } from "mongoose";

/**
 * One row per successful (verified & paid) order that used a coupon.
 * This is the ONLY thing that counts as coupon usage, and its insert is what
 * per-customer limits + first-order logic consult (never the frontend).
 */
export interface ICouponUsage extends Document {
  couponId: Types.ObjectId;
  couponCode: string;
  orderObjectId: Types.ObjectId;
  orderId: string;
  customerName: string;
  email: string;
  phone: string;
  /** Normalized identity: "email:<lowercased>" or "phone:<digits>". */
  customerKey: string;
  discountAmount: number;
  orderSubtotal: number;
  orderTotal: number;
  createdAt: Date;
}

const CouponUsageSchema = new Schema<ICouponUsage>({
  couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true },
  couponCode: { type: String, required: true },
  orderObjectId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
  orderId: { type: String, required: true },
  customerName: { type: String, default: "" },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  customerKey: { type: String, default: "" },
  discountAmount: { type: Number, default: 0 },
  orderSubtotal: { type: Number, default: 0 },
  orderTotal: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

// A coupon can never count the same order twice.
CouponUsageSchema.index({ couponId: 1, orderObjectId: 1 }, { unique: true });
// Per-customer counting + usage-history queries.
CouponUsageSchema.index({ couponId: 1, customerKey: 1 });
CouponUsageSchema.index({ couponId: 1, createdAt: -1 });
CouponUsageSchema.index({ couponCode: 1, createdAt: -1 });

export default mongoose.models.CouponUsage ||
  mongoose.model<ICouponUsage>("CouponUsage", CouponUsageSchema);