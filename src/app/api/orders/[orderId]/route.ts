export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";

/**
 * Public order receipt for the post-payment confirmation screen.
 *
 * Returns only what the customer already knows about their own order: the
 * reference, the verified payment state, the price breakdown and the items.
 * Address, email and phone are deliberately excluded.
 *
 * The confirmation screen is driven by this response rather than by the
 * browser's success callback, so it can never show an unverified order.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const orderId = String(params.orderId || "").trim();
  if (!orderId || orderId.length > 64) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  try {
    await connectDB();
  } catch {
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 500 }
    );
  }

  const order = await Order.findOne({ orderId })
    .lean()
    .select(
      "orderId paymentStatus orderStatus paymentVerifiedAt createdAt " +
        "customerName items subtotal subtotalBeforeDiscount catalogSubtotal " +
        "discount promotion couponDiscount coupon deliveryCharge total " +
        "razorpayOrderId razorpayPaymentId waybill trackingUrl"
    );

  if (!order) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  // Only a verified payment unlocks the full receipt. While the payment is
  // still in flight (or has failed) the confirmation screen only needs the
  // state, so nothing else is exposed for an order that has not been paid.
  if (order.paymentStatus !== "paid") {
    return NextResponse.json({
      found: true,
      orderId: order.orderId,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      placedAt: order.createdAt ? new Date(order.createdAt).toISOString() : null,
      receiptAvailable: false,
    });
  }

  return NextResponse.json({
    found: true,
    receiptAvailable: true,
    orderId: order.orderId,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    verifiedAt: order.paymentVerifiedAt
      ? new Date(order.paymentVerifiedAt).toISOString()
      : null,
    placedAt: order.createdAt ? new Date(order.createdAt).toISOString() : null,
    customerName: order.customerName,
    items: (order.items || []).map(
      (item: {
        name?: string;
        image?: string;
        variant?: string;
        qty?: number;
        mrp?: number;
        unitPrice?: number;
        offerDiscount?: number;
        price?: number;
      }) => ({
      name: item.name || "Item",
      image: item.image || "",
      variant: item.variant || "",
      qty: item.qty || 0,
      mrp: item.mrp ?? null,
      unitPrice: item.unitPrice ?? null,
      offerDiscount: item.offerDiscount ?? null,
      price: item.price ?? 0,
    })),
    pricing: {
      catalogSubtotal: order.catalogSubtotal || 0,
      subtotalBeforeDiscount: order.subtotalBeforeDiscount || 0,
      /** Product total after the launch offer, before the coupon. */
      finalSubtotal: order.subtotal || 0,
      offerDiscount: order.discount || 0,
      couponDiscount: order.couponDiscount || 0,
      deliveryCharge: order.deliveryCharge || 0,
      total: order.total || 0,
    },
    promotion: order.promotion
      ? {
          name: order.promotion.name,
          discountValue: order.promotion.discountValue,
        }
      : null,
    coupon: order.coupon ? { code: order.coupon.code } : null,
    payment: {
      razorpayOrderId: order.razorpayOrderId || null,
      razorpayPaymentId: order.razorpayPaymentId || null,
    },
    shipment: {
      waybill: order.waybill || null,
      trackingUrl: order.trackingUrl || null,
    },
  });
}
