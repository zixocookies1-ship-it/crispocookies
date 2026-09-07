import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, unknown> = {};

  try {
    result.step = "connecting";
    await connectDB();
    result.step = "connected";

    const email = "crispocookies@gmail.com";
    const password = "Crispo@2026";

    result.step = "querying";
    const admin = await Admin.findOne({ email, isActive: true }).lean<{
      password: string;
      _id: { toString(): string };
      email: string;
      name: string;
      role: string;
    }>();
    result.adminFound = !!admin;

    if (!admin) {
      result.step = "no-admin";
      result.status = "FAIL";
      return NextResponse.json(result, { status: 500 });
    }

    result.step = "comparing";
    result.hashPrefix = admin.password.substring(0, 10);
    result.hashLength = admin.password.length;
    const pwMatch = await bcrypt.compare(password, admin.password);
    result.passwordMatch = pwMatch;
    result.step = "done";

    if (!pwMatch) {
      result.status = "FAIL";
      return NextResponse.json(result, { status: 500 });
    }

    result.status = "OK";
    result.user = { id: admin._id.toString(), email: admin.email, name: admin.name, role: admin.role };
    return NextResponse.json(result);
  } catch (err: unknown) {
    result.status = "ERROR";
    result.error = err instanceof Error ? err.message : String(err);
    result.stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json(result, { status: 500 });
  }
}
