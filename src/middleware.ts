import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    console.error(
      "[crispo-auth] middleware: NEXTAUTH_SECRET is not set in this " +
        "environment. Admin routes are locked down until it is configured " +
        "in Vercel (Development, Preview, and Production)."
    );
  }

  const token = secret ? await getToken({ req: request, secret }) : null;

  if (pathname === "/admin/login") {
    if (token) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};