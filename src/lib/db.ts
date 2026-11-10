import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
const globalDb = globalThis as unknown as { db?: PrismaClient };
export const db =
  globalDb.db ??
  new PrismaClient({
    adapter: new PrismaLibSql({
      url: process.env.DATABASE_URL || "file:./dev.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    }),
  });
if (process.env.NODE_ENV !== "production") globalDb.db = db;
