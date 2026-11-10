import { createClient } from "@libsql/client";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL fehlt. Bitte .env anlegen.");
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
try {
  await db.execute("PRAGMA foreign_keys = ON");
  await db.execute(
    "CREATE TABLE IF NOT EXISTS _app_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  );
  for (const name of (
    await readdir(new URL("../prisma/migrations/", import.meta.url))
  )
    .filter((n) => /^\d/.test(n))
    .sort()) {
    const sql = await readFile(
      new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url),
      "utf8",
    );
    const checksum = createHash("sha256").update(sql).digest("hex");
    const previous = await db.execute({
      sql: "SELECT checksum FROM _app_migrations WHERE name = ?",
      args: [name],
    });
    if (previous.rows.length) {
      if (previous.rows[0].checksum !== checksum)
        throw new Error(`Bereits angewandte Migration verändert: ${name}`);
      continue;
    }
    const tx = await db.transaction("write");
    try {
      // Prisma's generated SQLite DDL contains no semicolons inside string literals.
      const statements = sql
        .replace(/^--.*$/gm, "")
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const statement of statements) await tx.execute(statement);
      await tx.execute({
        sql: "INSERT INTO _app_migrations (name, checksum) VALUES (?, ?)",
        args: [name, checksum],
      });
      await tx.commit();
      console.log(`Migration angewendet: ${name}`);
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
  }
} finally {
  db.close();
}
