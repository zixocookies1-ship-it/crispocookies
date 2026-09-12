export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { DELIVERY_CHARGE } from "@/lib/pricing-math";
import {
  isDelhiveryConfigured,
  checkPincodeServiceability,
  estimateShippingRate,
  resolveShipmentLines,
  totalWeightGrams,
  DelhiveryError,
} from "@/lib/delhivery";

interface RateRequestItem {
  productId?: string;
  variant?: string;
  qty?: number;
}

export async function POST(request: NextRequest) {
  let body: { pincode?: string; items?: RateRequestItem[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  const pincode = String(body?.pincode || "").trim();
  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json(
      { error: "Please enter a valid 6-digit pincode" },
      { status: 400 }
    );
  }

  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  try {
    await connectDB();
  } catch {
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 500 }
    );
  }

  // Not configured yet → keep the legacy flat delivery charge.
  if (!isDelhiveryConfigured()) {
    return NextResponse.json({
      pincode,
      mode: "flat",
      serviceable: true,
      amount: DELIVERY_CHARGE,
    });
  }

  try {
    const serviceable = await checkPincodeServiceability(pincode);
    if (!serviceable.serviceable) {
      return NextResponse.json({
        pincode,
        mode: "delhivery",
        serviceable: false,
        amount: null,
        remark: serviceable.remark,
      });
    }

    const lines = await resolveShipmentLines(items as Array<{
      productId: string;
      variant: string;
      qty: number;
    }>, { requireWeights: false });
    const weightGrams = totalWeightGrams(lines);

    // Missing shipping weights on products → keep the flat charge as a safe
    // estimate; the authoritative shipment will fail loudly later.
    if (weightGrams <= 0) {
      return NextResponse.json({
        pincode,
        mode: "flat",
        serviceable: true,
        amount: DELIVERY_CHARGE,
        weightGrams: 0,
      });
    }

    const estimate = await estimateShippingRate({
      toPincode: pincode,
      weightGrams,
    });

    return NextResponse.json({
      pincode,
      mode: "delhivery",
      serviceable: true,
      amount: estimate.amount,
      weightGrams: estimate.chargeableWeightGrams,
    });
  } catch (error) {
    console.error("[shipping/rate] Delhivery failed", {
      message: error instanceof Error ? error.message : String(error),
      pincode,
      itemCount: items.length,
    });
    // Any Delhivery outage must never block checkout — fall back to the
    // legacy flat charge so the store keeps selling.
    return NextResponse.json({
      pincode,
      mode: "flat",
      serviceable: true,
      amount: DELIVERY_CHARGE,
      fallback: true,
      error:
        error instanceof DelhiveryError
          ? error.safeMessage
          : "Could not fetch exact delivery charges",
    });
  }
}