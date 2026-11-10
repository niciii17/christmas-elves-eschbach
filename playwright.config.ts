import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command:
      "node --env-file=.env scripts/migrate.mjs && npm run dev -- --hostname 127.0.0.1 --port 3100",
    env: { DATABASE_URL: "file:./e2e.db", NEXT_DIST_DIR: ".next-e2e" },
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
