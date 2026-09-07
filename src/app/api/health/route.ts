import { NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    mongodbUriSet: !!process.env.MONGODB_URI,
    mongodbUriPrefix: process.env.MONGODB_URI
      ? process.env.MONGODB_URI.substring(0, 20) + "..."
      : "NOT SET",
    nextauthSecretSet: !!process.env.NEXTAUTH_SECRET,
    nextauthUrl: process.env.NEXTAUTH_URL ?? "NOT SET",
    adminEmailSet: !!process.env.ADMIN_EMAIL,
  };

  if (!process.env.MONGODB_URI) {
    result.status = "FAIL";
    result.error = "MONGODB_URI is not set";
    return NextResponse.json(result, { status: 500 });
  }

  let conn: typeof mongoose | null = null;
  try {
    conn = await mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 8000,
    });
    result.mongodbConnected = true;

    const db = conn.connection.db;
    if (db) {
      const collections = await db.listCollections().toArray();
      result.collections = collections.map((c) => c.name);

      const adminsCollection = db.collection("admins");
      const adminCount = await adminsCollection.countDocuments();
      result.adminCount = adminCount;

      if (adminCount > 0) {
        const admin = await adminsCollection.findOne(
          {},
          { projection: { email: 1, name: 1, role: 1, isActive: 1, password: 1 } }
        );
        result.sampleAdmin = admin
          ? { email: admin.email, name: admin.name, role: admin.role, isActive: admin.isActive }
          : null;

        if (admin && admin.password) {
          result.passwordHashLength = admin.password.length;
          result.passwordHashPrefix = admin.password.substring(0, 10);
          try {
            const pwMatch = await bcrypt.compare("Crispo@2026", admin.password);
            result.passwordCheck = pwMatch ? "MATCH" : "NO_MATCH";
          } catch (bcryptErr: unknown) {
            result.passwordCheck = "ERROR";
            result.bcryptError = bcryptErr instanceof Error ? bcryptErr.message : String(bcryptErr);
          }
        }
      }
    }

    result.status = "OK";

    try {
      const AdminModel = mongoose.models.Admin;
      if (AdminModel) {
        const mAdmin = await AdminModel.findOne({ email: "crispocookies@gmail.com", isActive: true }).lean();
        result.mongooseAdminFound = !!mAdmin;
        if (mAdmin) {
          result.mongooseAdminEmail = mAdmin.email;
          const pwMatch = await bcrypt.compare("Crispo@2026", mAdmin.password);
          result.mongoosePasswordCheck = pwMatch ? "MATCH" : "NO_MATCH";
        }
      } else {
        result.mongooseAdminFound = false;
        result.mongooseAdminNote = "Admin model not registered";
      }
    } catch (mErr: unknown) {
      result.mongooseAdminError = mErr instanceof Error ? mErr.message : String(mErr);
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    result.mongodbConnected = false;
    result.status = "FAIL";
    const msg = err instanceof Error ? err.message : String(err);
    result.error = msg;
    return NextResponse.json(result, { status: 500 });
  } finally {
    if (conn) {
      await conn.disconnect();
    }
  }
}
