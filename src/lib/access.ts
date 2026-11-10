import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
export const secret = () => randomBytes(32).toString("base64url");
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const cookieName = (groupId: string) => `wichtel_${groupId}`;
export async function sessionValue(groupId: string) {
  return (await cookies()).get(cookieName(groupId))?.value;
}
export async function setSession(groupId: string, value: string) {
  (await cookies()).set(cookieName(groupId), value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
export async function authenticate(
  client: Prisma.TransactionClient,
  groupId: string,
  value?: string,
) {
  if (!value)
    throw new Error(
      "Bitte öffne deinen persönlichen Link, um zur Runde zurückzukehren.",
    );
  const token = await client.accessToken.findUnique({
    where: { hash: hash(value) },
    include: { member: true },
  });
  if (
    !token ||
    token.kind !== "SESSION" ||
    !token.expiresAt ||
    token.expiresAt <= new Date() ||
    token.member.groupId !== groupId
  )
    throw new Error(
      "Dein Zugang ist abgelaufen oder wurde ersetzt. Bitte verwende deinen aktuellen persönlichen Link.",
    );
  return token.member;
}
export async function currentMember(groupId: string) {
  try {
    return await authenticate(db, groupId, await sessionValue(groupId));
  } catch {
    return null;
  }
}
export async function issueSession(
  tx: Prisma.TransactionClient,
  memberId: string,
) {
  const value = secret();
  await tx.accessToken.create({
    data: {
      memberId,
      hash: hash(value),
      kind: "SESSION",
      expiresAt: new Date(Date.now() + 365 * 86400000),
    },
  });
  return value;
}
export async function issueRecovery(
  tx: Prisma.TransactionClient,
  memberId: string,
  revokeAll = false,
) {
  await tx.accessToken.deleteMany({
    where: { memberId, ...(revokeAll ? {} : { kind: "RECOVERY" }) },
  });
  const value = secret();
  await tx.accessToken.create({
    data: { memberId, hash: hash(value), kind: "RECOVERY" },
  });
  return `/zugang#${value}`;
}
