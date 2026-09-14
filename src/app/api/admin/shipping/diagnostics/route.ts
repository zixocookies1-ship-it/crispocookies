export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import {
  getDelhiveryBaseUrl,
  getPickupLocation,
  getOriginPincode,
  getShippingMode,
  isDelhiveryConfigured,
  checkPincodeServiceability,
  estimateShippingRate,
  checkPickupLocationRegistration,
} from "@/lib/delhivery";

/**
 * Admin diagnostics for the Delhivery sync. Answers: is the integration
 * configured, and does the token actually work? Non-mutating.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();

  const token = process.env.DELHIVERY_API_TOKEN;
  const configured = isDelhiveryConfigured();
  const originPincode = getOriginPincode();
  const pickupLocation = getPickupLocation();

  const report: Record<string, unknown> = {
    configured,
    env: {
      DELHIVERY_API_TOKEN: token ? `set (${token.length} chars, masked)` : "MISSING",
      DELHIVERY_API_BASE: getDelhiveryBaseUrl(),
      DELHIVERY_PICKUP_LOCATION: pickupLocation || "MISSING",
      DELHIVERY_ORIGIN_PINCODE: originPincode || "MISSING",
      DELHIVERY_SHIPPING_MODE: getShippingMode(),
      DELHIVERY_SELLER_GST_TIN: process.env.DELHIVERY_SELLER_GST_TIN ? "set" : "not set",
      DELHIVERY_HSN_CODE: process.env.DELHIVERY_HSN_CODE ? "set" : "not set",
      DELHIVERY_WEBHOOK_TOKEN: process.env.DELHIVERY_WEBHOOK_TOKEN ? "set" : "not set",
    },
  };

  if (!configured) {
    report.status = "DELHIVERY IS NOT CONFIGURED — paid orders are never sent to Delhivery. Add DELHIVERY_API_TOKEN (plus PICKUP_LOCATION and ORIGIN_PINCODE) to the server/vercel environment.";
    return NextResponse.json(report);
  }

  // Live checks — the token + credentials work only if these succeed.
  const checks: Record<string, unknown> = {};
  let serviceabilityCheck: { error?: string } = {};
  let rateCheck: { error?: string } = {};
  if (originPincode && /^\d{6}$/.test(originPincode)) {
    try {
      checks.serviceability = await checkPincodeServiceability(originPincode);
    } catch (error) {
      serviceabilityCheck = {
        error: error instanceof Error ? error.message : String(error),
      };
      checks.serviceability = serviceabilityCheck;
    }
    try {
      checks.rate = await estimateShippingRate({
        toPincode: originPincode,
        weightGrams: 100,
      });
    } catch (error) {
      rateCheck = {
        error: error instanceof Error ? error.message : String(error),
      };
      checks.rate = rateCheck;
    }
  } else {
    serviceabilityCheck = { error: "DELHIVERY_ORIGIN_PINCODE missing/invalid" };
    checks.serviceability = serviceabilityCheck;
  }

  // Validates DELHIVERY_PICKUP_LOCATION against what is actually registered
  // in the connected Delhivery account (a full postal address is NOT a valid
  // pickup-location name and would fail every create-shipment).
  const pickupCheck = await checkPickupLocationRegistration();
  checks.pickupLocation = {
    configured: pickupCheck.configured ?? undefined,
    registered: pickupCheck.registered,
    match: pickupCheck.match,
    error: pickupCheck.error ?? undefined,
  };

  report.checks = checks;

  if (pickupCheck.verified && !pickupCheck.match) {
    report.status =
      "Pickup location is not recognized/valid by Delhivery. Set DELHIVERY_PICKUP_LOCATION to the exact registered name listed under checks → pickupLocation → registered, then redeploy. Shipments will keep failing until it matches.";
  } else if (serviceabilityCheck.error || rateCheck.error) {
    report.status =
      "Credentials reach Delhivery but something is wrong (see checks) — e.g. token invalid, origin pincode unserviceable, or origin not linked to the token's client.";
  } else if (!pickupCheck.verified || pickupCheck.error) {
    report.status = `Credentials reach Delhivery but the pickup location could not be verified — ${
      pickupCheck.error || "unknown reason"
    }`;
  } else {
    report.status =
      "OK — token is live, the origin pincode is serviceable, and the configured pickup location matches a registered Delhivery location. Check GST/HSN fields at the create/shipment step.";
  }

  return NextResponse.json(report);
}