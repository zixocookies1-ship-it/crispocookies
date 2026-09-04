export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Customer from "@/models/Customer";
import Notification from "@/models/Notification";
import Product from "@/models/Product";
import { generateOrderId } from "@/lib/helpers";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customerName,
      email,
      phone,
      address,
      items,
      subtotal,
      deliveryCharge,
      total,
    } = body;

    const hmac = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isValid = hmac === razorpay_signature;
    const orderId = generateOrderId();

    if (isValid) {
      const order = await Order.create({
        orderId,
        customerName,
        email,
        phone,
        address,
        items,
        subtotal,
        deliveryCharge,
        total,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentStatus: "paid",
        orderStatus: "processing",
      });

      await Customer.findOneAndUpdate(
        { email },
        { name: customerName, email, phone },
        { upsert: true, new: true }
      );

      await Notification.create({
        message: `New order #${orderId} from ${customerName} - ₹${total}`,
        type: "order",
        orderId: order._id.toString(),
      });

      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (product) {
          const variant = product.variants.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (v: any) => v.weight === item.variant
          );
          if (variant) {
            variant.stock = Math.max(0, variant.stock - item.qty);
            await product.save();

            if (variant.stock < 10) {
              await Notification.create({
                message: `Low Stock: ${product.name} (${variant.weight}) - ${variant.stock} left`,
                type: "stock",
                orderId: order._id.toString(),
              });
            }
          }
        }
      }

      return NextResponse.json({ success: true, orderId });
    } else {
      await Order.create({
        orderId,
        customerName,
        email,
        phone,
        address,
        items,
        subtotal,
        deliveryCharge,
        total,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentStatus: "failed",
        orderStatus: "processing",
      });

      return NextResponse.json({ success: false, orderId });
    }
  } catch (error) {
    console.error("POST /api/razorpay/verify-payment error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
