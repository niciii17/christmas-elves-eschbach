import { it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { createClient } from "@libsql/client";

it("initializes a native-integration database and safely skips repeated migrations", async () => {
  const directory = await mkdtemp(join(tmpdir(), "wichtel-migrations-"));
  const url = `file:${directory}/native.db`;
  const client = createClient({ url });
  try {
    const env = {
      ...process.env,
      VERCEL: "",
      TURSO_DATABASE_URL: url,
      DATABASE_URL: "file:/does-not-exist/unused.db",
      TURSO_AUTH_TOKEN: "",
    };
    const run = () =>
      promisify(execFile)(process.execPath, ["scripts/migrate.mjs"], { env });
    await run();
    await Promise.all([run(), run()]);
    const history = await client.execute(
      "SELECT COUNT(*) AS count FROM _app_migrations",
    );
    expect(Number(history.rows[0].count)).toBe(1);
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table'",
    );
    expect(tables.rows.map((row) => row.name)).toEqual(
      expect.arrayContaining([
        "Group",
        "Member",
        "Wish",
        "Assignment",
        "AccessToken",
        "Exclusion",
      ]),
    );
  } finally {
    client.close();
    await rm(directory, { recursive: true, force: true });
  }
});
