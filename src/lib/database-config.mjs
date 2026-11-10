/**
 * Shared by the app, Prisma configuration and migration runner. Never expose to clients.
 * @param {Record<string, string | undefined>} [env]
 */
export function databaseConfig(env = process.env) {
  // Prefer the URL injected by the native Vercel/Turso integration.
  const url = env.TURSO_DATABASE_URL?.trim() || env.DATABASE_URL?.trim();
  const authToken = env.TURSO_AUTH_TOKEN?.trim() || undefined;
  if (env.VERCEL === "1") {
    if (!url)
      throw new Error(
        "Turso ist nicht konfiguriert: TURSO_DATABASE_URL fehlt. Datenbank in Vercel mit dem Projekt und der Deployment-Umgebung verbinden.",
      );
    if (!/^(libsql|https):\/\//.test(url))
      throw new Error(
        "Auf Vercel ist eine externe Turso-Datenbank erforderlich. TURSO_DATABASE_URL muss eine libsql://- oder https://-Adresse sein.",
      );
    if (!authToken)
      throw new Error("Turso ist nicht konfiguriert: TURSO_AUTH_TOKEN fehlt.");
  }
  return { url: url || "file:./dev.db", authToken };
}
