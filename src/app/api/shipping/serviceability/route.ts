export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  checkPincodeServiceability,
  isDelhiveryConfigured,
  DelhiveryError,
} from "@/lib/delhivery";

export async function POST(request: NextRequest) {
  let body: { pincode?: string };
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

  try {
    await connectDB();
  } catch {
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 500 }
    );
  }

  try {
    const result = await checkPincodeServiceability(pincode);
    return NextResponse.json({
      pincode,
      configured: isDelhiveryConfigured(),
      ...result,
    });
  } catch (error) {
    console.error("[serviceability] Delhivery check failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error:
          error instanceof DelhiveryError
            ? error.safeMessage
            : "Could not check delivery availability",
      },
      { status: error instanceof DelhiveryError && error.status ? error.status : 502 }
    );
  }
}