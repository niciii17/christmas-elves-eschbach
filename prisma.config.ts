import { defineConfig } from "prisma/config";
try {
  process.loadEnvFile(".env");
} catch {
  /* Vercel provides environment variables directly. */
}
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: process.env.DATABASE_URL || "file:./dev.db" },
});
