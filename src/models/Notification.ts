import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  message: string;
  type: "order" | "stock" | "payment";
  orderId?: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  message: { type: String, required: true },
  type: { type: String, enum: ["order", "stock", "payment"], required: true },
  orderId: { type: String, default: "" },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
