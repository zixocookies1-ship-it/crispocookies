export async function register() {
  if (process.env.NEXTAUTH_URL) {
    const url = process.env.NEXTAUTH_URL;
    const isLocalhost =
      url.includes("localhost") || url.includes("127.0.0.1");
    if (isLocalhost) {
      console.error(
        `[crispo-env] instrumentation: deleting NEXTAUTH_URL="${url}" ` +
          "(localhost in production causes login failures)"
      );
      delete process.env.NEXTAUTH_URL;
    }
  }
  if (process.env.AUTH_URL) {
    const url = process.env.AUTH_URL;
    const isLocalhost =
      url.includes("localhost") || url.includes("127.0.0.1");
    if (isLocalhost) {
      delete process.env.AUTH_URL;
    }
  }
}
