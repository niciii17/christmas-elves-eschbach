"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "./db";
import {
  authenticate,
  hash,
  issueRecovery,
  issueSession,
  secret,
  sessionValue,
  setSession,
} from "./access";
import {
  fields,
  groupSchema,
  nameKey,
  nameSchema,
  wishSchema,
} from "./validation";
import { draw } from "./draw";
import { ZodError } from "zod";
export type ActionState = {
  error?: string;
  message?: string;
  link?: string;
  redirect?: string;
};
function failure(error: unknown): ActionState {
  if (error instanceof ZodError) return { error: error.issues[0].message };
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return { error: "Dieser Name oder diese Paarung ist bereits vorhanden." };
    return {
      error:
        "Die Änderung konnte nicht gespeichert werden. Bitte versuche es erneut.",
    };
  }
  // Only intentional domain errors reach the browser; never database diagnostics.
  if (error instanceof UserError) return { error: error.message };
  return { error: "Das hat leider nicht geklappt. Bitte versuche es erneut." };
}
class UserError extends Error {}
async function requireMember(
  tx: Prisma.TransactionClient,
  groupId: string,
  value?: string,
) {
  try {
    return await authenticate(tx, groupId, value);
  } catch {
    throw new UserError(
      "Dein Zugang ist ungültig. Bitte öffne deinen persönlichen Link.",
    );
  }
}
export async function createGroup(
  _: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const input = groupSchema.parse(fields(data));
    const invite = secret();
    const result = await db.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          name: input.name,
          budget: input.budget,
          date: input.date,
          description: input.description,
          inviteHash: hash(invite),
        },
      });
      const member = await tx.member.create({
        data: {
          groupId: group.id,
          name: input.person,
          nameKey: nameKey(input.person),
          organizer: true,
        },
      });
      return {
        groupId: group.id,
        session: await issueSession(tx, member.id),
        link: await issueRecovery(tx, member.id),
      };
    });
    await setSession(result.groupId, result.session);
    return {
      link: result.link,
      message: "Runde erstellt. Sichere deinen Geheimlink.",
      redirect: `/gruppe/${result.groupId}`,
    };
  } catch (e) {
    return failure(e);
  }
}
export async function joinGroup(
  invite: string,
  _: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const name = nameSchema.parse(data.get("person"));
    const group = await db.group.findUnique({
      where: { inviteHash: hash(invite) },
    });
    if (!group) throw new UserError("Dieser Einladungslink ist ungültig.");
    const existingSession = await sessionValue(group.id);
    const result = await db.$transaction(async (tx) => {
      // First write acquires SQLite's write lock; all membership changes follow this protocol.
      const locked = await tx.group.update({
        where: { id: group.id },
        data: { revision: { increment: 1 } },
      });
      if (locked.drawn)
        throw new UserError("Diese Runde wurde bereits ausgelost.");
      if (existingSession) {
        const current = await tx.accessToken.findUnique({
          where: { hash: hash(existingSession) },
          include: { member: true },
        });
        if (
          current?.kind === "SESSION" &&
          current.expiresAt &&
          current.expiresAt > new Date() &&
          current.member.groupId === group.id
        )
          throw new UserError(
            "Du bist bereits dabei. Öffne deine Runde über die Startseite.",
          );
      }
      const member = await tx.member.create({
        data: { groupId: group.id, name, nameKey: nameKey(name) },
      });
      return {
        session: await issueSession(tx, member.id),
        link: await issueRecovery(tx, member.id),
      };
    });
    await setSession(group.id, result.session);
    return {
      link: result.link,
      message: "Du bist dabei. Sichere deinen Geheimlink.",
      redirect: `/gruppe/${group.id}`,
    };
  } catch (e) {
    return failure(e);
  }
}
export async function redeemAccess(token: string): Promise<ActionState> {
  try {
    if (!/^[\w-]{43}$/.test(token))
      throw new UserError("Dieser persönliche Link ist ungültig.");
    const result = await db.$transaction(async (tx) => {
      const access = await tx.accessToken.findUnique({
        where: { hash: hash(token) },
        include: { member: true },
      });
      if (!access || access.kind !== "RECOVERY")
        throw new UserError(
          "Dieser persönliche Link ist ungültig oder wurde ersetzt.",
        );
      await tx.group.update({
        where: { id: access.member.groupId },
        data: { revision: { increment: 1 } },
      });
      // Recheck after acquiring the group lock, so replacement cannot race redemption.
      if (!(await tx.accessToken.findUnique({ where: { id: access.id } })))
        throw new UserError("Dieser Link wurde ersetzt.");
      return {
        groupId: access.member.groupId,
        session: await issueSession(tx, access.memberId),
      };
    });
    await setSession(result.groupId, result.session);
    return { redirect: `/gruppe/${result.groupId}` };
  } catch (e) {
    return failure(e);
  }
}
export async function groupAction(
  groupId: string,
  operation: string,
  _: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const value = await sessionValue(groupId);
    const result: ActionState = await db.$transaction(
      async (tx) => {
        await tx.group.update({
          where: { id: groupId },
          data: { revision: { increment: 1 } },
        });
        const member = await requireMember(tx, groupId, value);
        const group = await tx.group.findUniqueOrThrow({
          where: { id: groupId },
          include: { members: true, exclusions: true },
        });
        const id = String(data.get("id") || "");
        if (operation === "wish-save") {
          const input = wishSchema.parse(fields(data));
          if (id) {
            const updated = await tx.wish.updateMany({
              where: { id, memberId: member.id },
              data: input,
            });
            if (!updated.count)
              throw new UserError(
                "Dieser Wunsch gehört nicht zu deinem Zugang.",
              );
          } else
            await tx.wish.create({ data: { ...input, memberId: member.id } });
          return { message: "Wunsch gespeichert." };
        }
        if (operation === "wish-delete") {
          const deleted = await tx.wish.deleteMany({
            where: { id, memberId: member.id },
          });
          if (!deleted.count)
            throw new UserError("Dieser Wunsch gehört nicht zu deinem Zugang.");
          return { message: "Wunsch entfernt." };
        }
        if (operation === "recovery")
          return {
            link: await issueRecovery(tx, member.id),
            message: "Der bisherige Geheimlink ist jetzt ungültig.",
          };
        if (!member.organizer)
          throw new UserError(
            "Nur der Organisator kann diese Aktion ausführen.",
          );
        if (operation === "replace-access") {
          const target = group.members.find((m) => m.id === id);
          if (!target || target.id === member.id)
            throw new UserError("Bitte eine andere Person auswählen.");
          return {
            link: await issueRecovery(tx, id, true),
            message: `Ersatzlink für ${target.name}. Alle bisherigen Zugänge dieser Person sind ungültig.`,
          };
        }
        if (operation === "invite") {
          const invite = secret();
          await tx.group.update({
            where: { id: groupId },
            data: { inviteHash: hash(invite) },
          });
          return {
            link: `/einladung/${invite}`,
            message: "Der vorherige Einladungslink ist jetzt ungültig.",
          };
        }
        if (operation === "reset") {
          if (data.get("confirm") !== "yes")
            throw new UserError("Bitte bestätige das Zurücksetzen.");
          await tx.assignment.deleteMany({ where: { giver: { groupId } } });
          await tx.group.update({
            where: { id: groupId },
            data: { drawn: false },
          });
          return {
            message: "Auslosung aufgehoben. Die Runde ist wieder offen.",
          };
        }
        if (group.drawn)
          throw new UserError("Bitte setze zuerst die Auslosung zurück.");
        if (operation === "draw") {
          let assignments: Map<string, string>;
          try {
            assignments = draw(
              group.members.map((m) => m.id),
              group.exclusions,
            );
          } catch (e) {
            throw new UserError((e as Error).message);
          }
          await tx.assignment.createMany({
            data: [...assignments].map(([giverId, recipientId]) => ({
              giverId,
              recipientId,
            })),
          });
          await tx.group.update({
            where: { id: groupId },
            data: { drawn: true },
          });
          return {
            message:
              "Die Wichtel sind ausgelost! Jede Person kann jetzt ihr Ergebnis öffnen.",
          };
        }
        if (operation === "remove-member") {
          if (id === member.id || !group.members.some((m) => m.id === id))
            throw new UserError("Diese Person kann nicht entfernt werden.");
          await tx.exclusion.deleteMany({
            where: { groupId, OR: [{ firstId: id }, { secondId: id }] },
          });
          await tx.member.delete({ where: { id } });
          return { message: "Person entfernt." };
        }
        if (operation === "exclude") {
          const pair = [
            String(data.get("firstId")),
            String(data.get("secondId")),
          ].sort();
          if (
            pair[0] === pair[1] ||
            !pair.every((p) => group.members.some((m) => m.id === p))
          )
            throw new UserError(
              "Bitte zwei verschiedene Personen aus dieser Runde auswählen.",
            );
          await tx.exclusion.create({
            data: { groupId, firstId: pair[0], secondId: pair[1] },
          });
          return { message: "Ausschluss gespeichert." };
        }
        if (operation === "unexclude") {
          await tx.exclusion.deleteMany({ where: { id, groupId } });
          return { message: "Ausschluss entfernt." };
        }
        throw new UserError("Unbekannte Aktion.");
      },
      { timeout: 15000 },
    );
    revalidatePath(`/gruppe/${groupId}`);
    return result;
  } catch (e) {
    return failure(e);
  }
}
