export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import {
  getDelhiveryConfigStatus,
  getDelhiveryBaseUrl,
  getPickupLocation,
  getOriginPincode,
  getShippingMode,
} from "@/lib/delhivery";

/**
 * Admin health check for the Delhivery integration (admin-session only).
 *
 * Reports what is CONFIGURED vs MISSING without ever exposing the token.
 * Live connectivity checks (token validity, serviceability) live on
 * /api/admin/shipping/diagnostics; keep this endpoint side-effect-free.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  const config = getDelhiveryConfigStatus();
  const token = process.env.DELHIVERY_API_TOKEN;
  const pickupLocation = getPickupLocation();
  const originPincode = getOriginPincode();

  return NextResponse.json({
    provider: "delhivery",
    configured: config.configured,
    status: config.configured ? "configured" : "not_configured",
    environment: {
      baseUrl: getDelhiveryBaseUrl(),
      shippingMode: getShippingMode() === "E" ? "Express" : "Surface",
    },
    pickupLocationConfigured: config.pickupLocationConfigured,
    pickupLocation: config.pickupLocationConfigured ? pickupLocation : null,
    originPincodeConfigured: config.originPincodeConfigured,
    originPincode: config.originPincodeConfigured ? originPincode : null,
    apiTokenConfigured: config.tokenConfigured,
    apiTokenMasked: token
      ? `${token.slice(0, 6)}…${token.slice(-4)}`
      : null,
    missing: config.missing,
  });
}