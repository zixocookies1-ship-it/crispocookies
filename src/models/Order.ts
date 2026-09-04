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

export default mongoose.models.Order ||
  mongoose.model<IOrder>("Order", OrderSchema);
