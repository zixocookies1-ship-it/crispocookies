import mongoose, { Schema, Document } from "mongoose";

export interface IPromotion extends Document {
  name: string;
  discountType: "percentage";
  discountValue: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    name: { type: String, required: true },
    discountType: {
      type: String,
      enum: ["percentage"],
      default: "percentage",
    },
    discountValue: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Fast lookup of the currently-live promotion
PromotionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

export default mongoose.models.Promotion ||
  mongoose.model<IPromotion>("Promotion", PromotionSchema);