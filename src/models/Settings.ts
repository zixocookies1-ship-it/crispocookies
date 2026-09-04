import mongoose, { Schema, Document } from "mongoose";

export interface ISettings extends Document {
  storeName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  freeDeliveryAbove: number;
  deliveryCharge: number;
  instagram: string;
  facebook: string;
  whatsapp: string;
}

const SettingsSchema = new Schema<ISettings>({
  storeName: { type: String, default: "Crispo Cookies" },
  tagline: { type: String, default: "Baked with Love" },
  contactEmail: { type: String, default: "" },
  contactPhone: { type: String, default: "" },
  address: { type: String, default: "" },
  freeDeliveryAbove: { type: Number, default: 499 },
  deliveryCharge: { type: Number, default: 49 },
  instagram: { type: String, default: "" },
  facebook: { type: String, default: "" },
  whatsapp: { type: String, default: "" },
});

export default mongoose.models.Settings ||
  mongoose.model<ISettings>("Settings", SettingsSchema);
