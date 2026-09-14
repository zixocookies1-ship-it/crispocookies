export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDelhiveryConfigStatus } from "@/lib/delhivery";

/**
 * PUBLIC BY INTENT — deployment/ops verification for the site owner.
 *
 * Returns ONLY booleans about whether the server-side Delhivery environment
 * variables are present. It never returns the token, a masked token, the base
 * URL, pickup location, origin pincode, or any customer/shipping data, so it
 * is safe to call without a session (no admin login available to a deploy
 * pipeline). Admin-only full status lives on
 * /api/admin/shipping/delhivery/health.
 *
 * Response shape:
 *   { configured, tokenConfigured, pickupConfigured, originConfigured }
 */
export async function GET() {
  const status = getDelhiveryConfigStatus();
  return NextResponse.json({
    configured: status.configured,
    tokenConfigured: status.tokenConfigured,
    pickupConfigured: status.pickupLocationConfigured,
    originConfigured: status.originPincodeConfigured,
  });
}