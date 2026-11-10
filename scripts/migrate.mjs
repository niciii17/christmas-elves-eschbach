import { createClient } from "@libsql/client";
import { databaseConfig } from "../src/lib/database-config.mjs";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
async function migrate() {
  const db = createClient(databaseConfig());
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
      const tx = await db.transaction("write");
      try {
        // Check history while holding the write lock, including during concurrent builds.
        const previous = await tx.execute({
          sql: "SELECT checksum FROM _app_migrations WHERE name = ?",
          args: [name],
        });
        if (previous.rows.length) {
          if (previous.rows[0].checksum !== checksum)
            throw new Error(`Bereits angewandte Migration verändert: ${name}`);
          await tx.commit();
          continue;
        }
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
}

// Another deployment may briefly hold the database writer lock. Retry only lock conflicts.
for (let attempt = 0; ; attempt++) {
  try {
    await migrate();
    break;
  } catch (error) {
    const code = String(error.code || "");
    if (
      (!code.startsWith("SQLITE_BUSY") && !code.startsWith("SQLITE_LOCKED")) ||
      attempt >= 7
    )
      throw error;
    await delay(Math.min(100 * 2 ** attempt, 1000));
  }
}
