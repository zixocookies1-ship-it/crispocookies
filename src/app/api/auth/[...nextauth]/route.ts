export const dynamic = "force-dynamic";

import "@/lib/clean-auth-env";

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
