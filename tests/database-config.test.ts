import { expect, it } from "vitest";
import { databaseConfig } from "../src/lib/database-config.mjs";

it("uses local SQLite in development", () => {
  expect(databaseConfig({})).toEqual({
    url: "file:./dev.db",
    authToken: undefined,
  });
  expect(databaseConfig({ DATABASE_URL: "file:/tmp/test.db" }).url).toBe(
    "file:/tmp/test.db",
  );
});
it("accepts Vercel's native Turso integration and overrides an old local URL", () => {
  expect(
    databaseConfig({
      VERCEL: "1",
      DATABASE_URL: "file:./dev.db",
      TURSO_DATABASE_URL: "libsql://example.turso.io",
      TURSO_AUTH_TOKEN: "test-token",
    }),
  ).toEqual({ url: "libsql://example.turso.io", authToken: "test-token" });
});
it("keeps manually configured remote DATABASE_URL working", () => {
  expect(
    databaseConfig({
      VERCEL: "1",
      DATABASE_URL: "libsql://example.turso.io",
      TURSO_AUTH_TOKEN: "test-token",
    }).url,
  ).toBe("libsql://example.turso.io");
});
it("fails clearly on Vercel rather than silently opening a temporary SQLite file", () => {
  expect(() => databaseConfig({ VERCEL: "1" })).toThrow(
    "TURSO_DATABASE_URL fehlt",
  );
  expect(() =>
    databaseConfig({ VERCEL: "1", DATABASE_URL: "file:./dev.db" }),
  ).toThrow("externe Turso-Datenbank");
  expect(() =>
    databaseConfig({
      VERCEL: "1",
      TURSO_DATABASE_URL: "libsql://example.turso.io",
    }),
  ).toThrow("TURSO_AUTH_TOKEN fehlt");
});
