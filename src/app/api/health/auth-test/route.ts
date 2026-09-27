export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { authorizeInternalRequest } from "@/lib/internal-route-auth";
import Admin from "@/models/Admin";

/**
 * Admin-credential connectivity probe.
 *
 * Reports only whether a usable admin record can be read. It never performs a
 * password comparison and never returns hash material, because this route is a
 * credential oracle the moment those are exposed.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeInternalRequest(request);
  if (!auth.ok) return auth.response;

  const result: Record<string, unknown> = {};

  try {
    result.step = "connecting";
    await connectDB();
    result.step = "connected";

    const session = await getServerSession(authOptions);
    if (!session) {
      result.step = "no-session";
      result.status = "FAIL";
      return NextResponse.json(result, { status: 401 });
    }

    result.step = "querying";
    const admin = await Admin.findOne({
      email: String(session.user?.email ?? "").toLowerCase(),
      isActive: true,
    })
      .lean<{ _id: { toString(): string }; name: string; role: string }>()
      .select({ _id: 1, name: 1, role: 1 });

    if (!admin) {
      result.step = "no-admin";
      result.status = "FAIL";
      return NextResponse.json(result, { status: 404 });
    }

    result.status = "OK";
    result.step = "done";
    result.user = {
      id: admin._id.toString(),
      name: admin.name,
      role: admin.role,
    };
    return NextResponse.json(result);
  } catch (err: unknown) {
    result.status = "ERROR";
    result.error = err instanceof Error ? err.message : String(err);
    return NextResponse.json(result, { status: 500 });
  }
}
