"use client";

import { SessionProvider } from "next-auth/react";
import AdminLayoutInner from "./AdminLayoutInner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider basePath="/api/auth">
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </SessionProvider>
  );
}
