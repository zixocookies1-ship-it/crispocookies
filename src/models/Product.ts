import mongoose, { Schema, Document } from "mongoose";
import { Types } from "mongoose";

export interface IProductVariant {
  weight: string;
  price: number;
  stock: number;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  ingredients: string;
  images: string[];
  category: Types.ObjectId;
  tags: string[];
  variants: IProductVariant[];
  isActive: boolean;
  createdAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  shortDescription: { type: String, maxlength: 150 },
  fullDescription: { type: String },
  ingredients: { type: String },
  images: [{ type: String }],
  category: { type: Schema.Types.ObjectId, ref: "Category" },
  tags: [{ type: String }],
  variants: [
    {
      weight: { type: String },
      price: { type: Number },
      stock: { type: Number, default: 0 },
    },
  ],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Product ||
  mongoose.model<IProduct>("Product", ProductSchema);
