import "server-only";
import { databaseConfig } from "./database-config.mjs";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
const globalDb = globalThis as unknown as { db?: PrismaClient };
export const db =
  globalDb.db ??
  new PrismaClient({
    adapter: new PrismaLibSql(databaseConfig()),
  });
if (process.env.NODE_ENV !== "production") globalDb.db = db;
