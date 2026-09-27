import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

/**
 * Guard for internal diagnostics endpoints (health checks, config probes).
 *
 * These routes are not part of the storefront and can reach secrets, so they
 * must never be publicly readable: an unauthenticated caller could otherwise
 * enumerate the deployment, read credential material and (for the Razorpay
 * probe) create real gateway objects.
 *
 * Two accepted callers:
 *   1. A signed-in admin session.
 *   2. A trusted platform caller (Vercel Cron / uptime monitor) presenting the
 *      CRON_SECRET as a bearer token or `x-cron-secret` header.
 */

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function hasValidCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-cron-secret") ?? "";
  const bearer = (request.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    ""
  );
  const provided = header || bearer;
  return !!provided && safeEqual(provided, secret);
}

export async function authorizeInternalRequest(
  request: NextRequest
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (hasValidCronSecret(request)) return { ok: true };

  try {
    const session = await getServerSession(authOptions);
    if (session) return { ok: true };
  } catch {
    // fall through to unauthorized
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    ),
  };
}
