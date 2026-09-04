import mongoose, { Schema, Document } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  email: string;
  phone: string;
  createdAt: Date;
}

const CustomerSchema = new Schema<ICustomer>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);
