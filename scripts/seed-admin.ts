/**
 * ONE-TIME SEED SCRIPT: Creates the admin user in MongoDB with a bcrypt-hashed
 * password. Reads credentials from .env.local (MONGODB_URI, ADMIN_EMAIL,
 * ADMIN_PASSWORD).
 *
 * Usage:  npx tsx scripts/seed-admin.ts
 *
 * - Safe to run multiple times (skips if admin already exists).
 * - Never overwrites an existing password.
 * - Never prints passwords, hashes, or secrets.
 */

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("ERROR: .env.local not found at", envPath);
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvLocal();

  const MONGODB_URI = process.env.MONGODB_URI;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!MONGODB_URI) {
    console.error("ERROR: MONGODB_URI is not set in .env.local");
    process.exit(1);
  }
  if (!ADMIN_EMAIL) {
    console.error("ERROR: ADMIN_EMAIL is not set in .env.local");
    process.exit(1);
  }
  if (!ADMIN_PASSWORD) {
    console.error("ERROR: ADMIN_PASSWORD is not set in .env.local");
    process.exit(1);
  }

  const normalizedEmail = ADMIN_EMAIL.trim().toLowerCase();

  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  const AdminSchema = new mongoose.Schema(
    {
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      password: { type: String, required: true },
      name: { type: String, default: "Admin", trim: true },
      role: { type: String, enum: ["admin", "superadmin"], default: "admin" },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
    },
    { timestamps: false }
  );

  const Admin = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);

  const existing = await Admin.findOne({ email: normalizedEmail }).lean();
  if (existing) {
    console.log(`Admin account already exists for ${normalizedEmail}.`);
    console.log("Skipping. To reset the password, delete the document in MongoDB first.");
    await mongoose.disconnect();
    return;
  }

  console.log("Hashing password...");
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

  await Admin.create({
    email: normalizedEmail,
    password: hashedPassword,
    name: "Admin",
    role: "superadmin",
    isActive: true,
  });

  console.log(`Admin account created for ${normalizedEmail}.`);
  console.log("You can now log in at /admin/login with these credentials.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
