import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";

export function sanitizeAuthEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const configured = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL;
  if (!configured) return;

  const isLocalhost =
    configured.includes("localhost") || configured.includes("127.0.0.1");

  if (!isLocalhost) return;

  console.error(
    "[crispo-auth] NEXTAUTH_URL is set to a localhost URL in a production " +
      `build ("${configured}"), which makes admin login fail. Removing it from ` +
      "the runtime so NextAuth can detect the real request host. Please also " +
      "delete NEXTAUTH_URL from the Vercel environment (or set it to your real " +
      "production domain) for Development, Preview, and Production."
  );
  delete process.env.NEXTAUTH_URL;
  delete process.env.AUTH_URL;
}

sanitizeAuthEnv();

if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET) {
  console.error(
    "[crispo-auth] NEXTAUTH_SECRET is not set in this environment. Admin " +
      "login will fail until it is added in Vercel (Development, Preview, and " +
      "Production)."
  );
}

if (process.env.NODE_ENV === "production" && !process.env.MONGODB_URI) {
  console.error(
    "[crispo-auth] MONGODB_URI is not set in this environment. Admin " +
      "login will fail until it is added in Vercel (Development, Preview, and " +
      "Production)."
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = credentials?.email?.trim().toLowerCase() ?? "";
        const password = credentials?.password ?? "";

        const rawHeaders = req?.headers;
        let forwarded: string | undefined;
        if (
          typeof (rawHeaders as { get?: unknown } | undefined)?.get ===
          "function"
        ) {
          forwarded =
            (rawHeaders as Headers).get("x-forwarded-for") ?? undefined;
        } else if (rawHeaders) {
          const fwd = (
            rawHeaders as Record<string, string | string[] | undefined>
          )["x-forwarded-for"];
          forwarded = typeof fwd === "string" ? fwd : undefined;
        }
        const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

        if (!email) {
          console.warn(
            "[crispo-auth] login attempt with empty email (ip=" + ip + ")"
          );
          return null;
        }

        if (!password) {
          console.warn(
            "[crispo-auth] login attempt with empty password for " +
              email +
              " (ip=" +
              ip +
              ")"
          );
          return null;
        }

        try {
          console.info(
            "[crispo-auth] authorize started for " +
              email +
              " (ip=" +
              ip +
              ")"
          );

          await connectDB();
          console.info("[crispo-auth] MongoDB connected");

          const admin = await Admin.findOne({
            email,
            isActive: true,
          }).lean<{ password: string; _id: { toString(): string }; email: string; name: string; role: string }>();
          if (!admin) {
            console.warn(
              "[crispo-auth] no active admin found for " +
                email +
                " (ip=" +
                ip +
                ")"
            );
            return null;
          }
          console.info("[crispo-auth] admin found, id=" + admin._id);

          const passwordValid = await bcrypt.compare(password, admin.password);
          if (!passwordValid) {
            console.warn(
              "[crispo-auth] password verification FAILED for " +
                email +
                " (ip=" +
                ip +
                ")"
            );
            return null;
          }

          console.info(
            "[crispo-auth] admin login SUCCESS for " +
              email +
              " role=" +
              admin.role +
              " (ip=" +
              ip +
              ")"
          );

          return {
            id: admin._id.toString(),
            email: admin.email,
            name: admin.name,
            role: admin.role,
          };
        } catch (err) {
          console.error(
            "[crispo-auth] authorize error for " +
              email +
              " (ip=" +
              ip +
              "):",
            err
          );
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 86400,
  },
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "admin";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
