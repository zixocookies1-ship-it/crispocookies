import mongoose, { Schema, Document } from "mongoose";
import { Types } from "mongoose";

export type CouponDiscountType = "percentage" | "fixed";

export interface ICoupon extends Document {
  code: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumOrderValue: number;
  maximumDiscount: number;
  startDate: Date;
  expiryDate: Date;
  maxTotalUses: number;
  maxUsesPerCustomer: number;
  totalUsed: number;
  active: boolean;
  firstOrderOnly: boolean;
  applicableProducts: Types.ObjectId[];
  excludedProducts: Types.ObjectId[];
  applicableCategories: Types.ObjectId[];
  excludedCategories: Types.ObjectId[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: "" },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
      default: "percentage",
    },
    discountValue: { type: Number, required: true, min: 0 },
    minimumOrderValue: { type: Number, default: 0, min: 0 },
    maximumDiscount: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    maxTotalUses: { type: Number, default: 0, min: 0 },
    maxUsesPerCustomer: { type: Number, default: 0, min: 0 },
    totalUsed: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
    firstOrderOnly: { type: Boolean, default: false },
    applicableProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    excludedProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    applicableCategories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    excludedCategories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);

// Fast code lookup (unique + normalized uppercase) and live-eligibility scans.
CouponSchema.index({ code: 1 }, { unique: true });
CouponSchema.index({ active: 1, startDate: 1, expiryDate: 1 });
CouponSchema.index({ expiryDate: 1 });

export default mongoose.models.Coupon ||
  mongoose.model<ICoupon>("Coupon", CouponSchema);