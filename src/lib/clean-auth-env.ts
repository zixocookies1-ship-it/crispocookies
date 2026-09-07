if (process.env.NODE_ENV === "production") {
  const configured = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL;
  if (configured) {
    const isLocalhost =
      configured.includes("localhost") || configured.includes("127.0.0.1");
    if (isLocalhost) {
      console.error(
        `[crispo-env] NEXTAUTH_URL is "${configured}" in production. ` +
          "Deleting from runtime so NextAuth uses the real request host."
      );
      delete process.env.NEXTAUTH_URL;
      delete process.env.AUTH_URL;
    }
  }
}
