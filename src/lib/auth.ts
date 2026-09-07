import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

/**
 * Production guard for a misconfigured `NEXTAUTH_URL`.
 *
 * NextAuth 4 reads `NEXTAUTH_URL` BEFORE the request origin whenever it is
 * set (`utils/detect-origin.js`). A value like `http://localhost:3000` in a
 * production runtime therefore makes NextAuth build every auth URL
 * (providers, CSRF callback-url cookie, signin/callback redirects, error
 * page) against localhost. Real requests from the deployed host then break
 * auth and surface the NextAuth "Server error - There is a problem with the
 * server configuration..." page (error=Configuration).
 *
 * On Vercel the correct behavior is to let NextAuth derive the origin from
 * the actual request headers (`x-forwarded-host`), which happens as soon as
 * `NEXTAUTH_URL` is not set. This guard removes only a bad localhost value so
 * host detection can work, and loudly logs the need to clean up the Vercel
 * environment. A correctly set, real production URL is left untouched.
 *
 * Runs once per serverless instance at import time.
 */
export function sanitizeAuthEnv(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const configured = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL;

  if (!configured) {
    return;
  }

  const isLocalhost =
    configured.includes("localhost") || configured.includes("127.0.0.1");

  if (!isLocalhost) {
    return;
  }

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

if (
  process.env.NODE_ENV === "production" &&
  (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)
) {
  console.error(
    "[crispo-auth] ADMIN_EMAIL or ADMIN_PASSWORD is not set in this " +
      "environment. Add both in Vercel (Development, Preview, and Production)."
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
        if (typeof (rawHeaders as { get?: unknown } | undefined)?.get === "function") {
          forwarded =
            (rawHeaders as Headers).get("x-forwarded-for") ?? undefined;
        } else if (rawHeaders) {
          const fwd = (rawHeaders as Record<string, string | string[] | undefined>)[
            "x-forwarded-for"
          ];
          forwarded = typeof fwd === "string" ? fwd : undefined;
        }
        const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

        if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
          console.error(
            "[crispo-auth] ADMIN_EMAIL/ADMIN_PASSWORD missing at login " +
              "attempt (ip=" + ip + "). Login is disabled until these are set."
          );
          return null;
        }

        const expectedEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
        const ok =
          email !== "" &&
          email === expectedEmail &&
          password === process.env.ADMIN_PASSWORD;

        if (ok) {
          console.info(
            "[crispo-auth] admin login SUCCESS for " + email + " (ip=" + ip + ")"
          );
          return { id: "1", email: expectedEmail, name: "Admin" };
        }

        console.warn(
          "[crispo-auth] admin login FAILED for " + email + " (ip=" + ip + ")"
        );
        return null;
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};