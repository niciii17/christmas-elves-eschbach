import { defineConfig } from "prisma/config";
import { databaseConfig } from "./src/lib/database-config.mjs";
try {
  process.loadEnvFile(".env");
} catch {
  /* Vercel provides environment variables directly. */
}
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: databaseConfig().url },
});
