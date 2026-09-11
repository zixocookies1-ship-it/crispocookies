export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getActivePromotion } from "@/lib/pricing";

export async function GET() {
  try {
    const promotion = await getActivePromotion();
    return NextResponse.json({ promotion });
  } catch (error) {
    console.error("GET /api/promotions/active error:", error);
    // Fail-open: if we cannot determine a promotion, charge full prices.
    return NextResponse.json({ promotion: null });
  }
}