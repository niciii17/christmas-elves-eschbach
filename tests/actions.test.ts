import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const { jar, requestCookies } = await vi.hoisted(async () => {
  const { AsyncLocalStorage } = await import("node:async_hooks");
  return {
    jar: new Map<string, string>(),
    requestCookies: new AsyncLocalStorage<Map<string, string>>(),
  };
});
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) =>
      (requestCookies.getStore() ?? jar).has(key)
        ? { value: (requestCookies.getStore() ?? jar).get(key) }
        : undefined,
    set: (key: string, value: string) =>
      (requestCookies.getStore() ?? jar).set(key, value),
  }),
}));
const directory = mkdtempSync(join(tmpdir(), "wichtel-test-"));
process.env.DATABASE_URL = `file:${directory}/test.db`;
const actions = await import("../src/lib/actions");
const { db } = await import("../src/lib/db");
const { hash, authenticate } = await import("../src/lib/access");
const data = (values: Record<string, string>) => {
  const f = new FormData();
  for (const [key, value] of Object.entries(values)) f.set(key, value);
  return f;
};
let groupId: string, annaId: string, benId: string, invite: string;
let annaSession: string, benSession: string, benLink: string;
beforeAll(() => {
  execFileSync(process.execPath, ["scripts/migrate.mjs"], { env: process.env });
});
afterAll(async () => {
  await db.$disconnect();
  rmSync(directory, { recursive: true, force: true });
});
it("erstellt, tritt bei, speichert Wünsche und schützt fremde Daten", async () => {
  const created = await actions.createGroup(
    {},
    data({
      name: "Testfamilie",
      person: "Anna",
      description: "",
      budget: "25",
      date: "",
    }),
  );
  expect(created.error).toBeUndefined();
  expect(created.link).toContain("/zugang#");
  groupId = created.redirect!.split("/").pop()!;
  annaSession = jar.get(`wichtel_${groupId}`)!;
  annaId = (await db.member.findFirstOrThrow({ where: { groupId } })).id;
  const invitation = await actions.groupAction(groupId, "invite", {}, data({}));
  invite = invitation.link!.split("/").pop()!;
  expect(
    (await db.group.findUniqueOrThrow({ where: { id: groupId } })).inviteHash,
  ).toBe(hash(invite));
  jar.clear();
  const joined = await actions.joinGroup(invite, {}, data({ person: "Ben" }));
  expect(joined.error).toBeUndefined();
  benLink = joined.link!;
  benSession = jar.get(`wichtel_${groupId}`)!;
  benId = (
    await db.member.findFirstOrThrow({ where: { groupId, name: "Ben" } })
  ).id;
  expect(
    (await actions.groupAction(groupId, "draw", {}, data({}))).error,
  ).toContain("Organisator");
  await actions.groupAction(
    groupId,
    "wish-save",
    {},
    data({ title: "Ein Buch", description: "Roman", url: "" }),
  );
  const wish = await db.wish.findFirstOrThrow({ where: { memberId: benId } });
  jar.set(`wichtel_${groupId}`, annaSession);
  expect(
    (
      await actions.groupAction(
        groupId,
        "wish-save",
        {},
        data({ id: wish.id, title: "Manipuliert", description: "", url: "" }),
      )
    ).error,
  ).toBeTruthy();
  expect(
    (
      await actions.groupAction(
        groupId,
        "wish-delete",
        {},
        data({ id: wish.id }),
      )
    ).error,
  ).toBeTruthy();
  expect(
    (await db.wish.findUniqueOrThrow({ where: { id: wish.id } })).title,
  ).toBe("Ein Buch");
  const other = await actions.createGroup(
    {},
    data({
      name: "Andere Runde",
      person: "Anna",
      description: "",
      budget: "",
      date: "",
    }),
  );
  const otherId = other.redirect!.split("/").pop()!;
  await expect(authenticate(db, otherId, benSession)).rejects.toThrow();
});
it("ersetzt Geheimlinks und Sitzungen und ermöglicht Rückkehr", async () => {
  jar.set(`wichtel_${groupId}`, annaSession);
  const replacement = await actions.groupAction(
    groupId,
    "replace-access",
    {},
    data({ id: benId }),
  );
  expect(replacement.link).toBeTruthy();
  await expect(authenticate(db, groupId, benSession)).rejects.toThrow();
  expect(
    (await actions.redeemAccess(benLink.split("#")[1])).error,
  ).toBeTruthy();
  const redeemed = await actions.redeemAccess(replacement.link!.split("#")[1]);
  expect(redeemed.redirect).toBe(`/gruppe/${groupId}`);
  benSession = jar.get(`wichtel_${groupId}`)!;
  expect((await authenticate(db, groupId, benSession)).id).toBe(benId);
});
it("lässt bei unmöglichen Ausschlüssen keine Teilauslosung zurück", async () => {
  jar.set(`wichtel_${groupId}`, annaSession);
  expect(
    (
      await actions.groupAction(
        groupId,
        "exclude",
        {},
        data({ firstId: annaId, secondId: benId }),
      )
    ).error,
  ).toBeUndefined();
  expect(
    (await actions.groupAction(groupId, "draw", {}, data({}))).error,
  ).toContain("keine Auslosung");
  expect(await db.assignment.count()).toBe(0);
  const pair = await db.exclusion.findFirstOrThrow({ where: { groupId } });
  await actions.groupAction(groupId, "unexclude", {}, data({ id: pair.id }));
});
it("verhindert doppelte Ziehung und sperrt Beitritte nach Auslosung", async () => {
  jar.set(`wichtel_${groupId}`, annaSession);
  const results = await Promise.all([
    actions.groupAction(groupId, "draw", {}, data({})),
    actions.groupAction(groupId, "draw", {}, data({})),
  ]);
  expect(results.filter((r) => !r.error)).toHaveLength(1);
  expect(await db.assignment.count()).toBe(2);
  jar.clear();
  expect(
    (await actions.joinGroup(invite, {}, data({ person: "Clara" }))).error,
  ).toBeTruthy();
  jar.set(`wichtel_${groupId}`, annaSession);
  expect(
    (await actions.groupAction(groupId, "reset", {}, data({}))).error,
  ).toBeTruthy();
  await actions.groupAction(groupId, "reset", {}, data({ confirm: "yes" }));
  expect(await db.assignment.count()).toBe(0);
  expect(await db.wish.count({ where: { memberId: benId } })).toBe(1);
});
it("serialisiert gleichzeitigen Beitritt und Auslosung konsistent", async () => {
  jar.set(`wichtel_${groupId}`, annaSession);
  // Guest join uses no cookie in a separate mocked request context by joining a fresh group.
  const results = await Promise.all([
    actions.groupAction(groupId, "draw", {}, data({})),
    actions.groupAction(groupId, "remove-member", {}, data({ id: benId })),
  ]);
  const group = await db.group.findUniqueOrThrow({
    where: { id: groupId },
    include: { members: true },
  });
  const count = await db.assignment.count({ where: { giver: { groupId } } });
  expect(results.some((r) => !r.error)).toBe(true);
  expect(count).toBe(group.drawn ? group.members.length : 0);
});

it("serialisiert echten Gastbeitritt und Auslosung", async () => {
  const organizerCookies = new Map<string, string>();
  const created = await requestCookies.run(organizerCookies, () =>
    actions.createGroup(
      {},
      data({
        name: "Parallel",
        person: "Organisator",
        description: "",
        budget: "",
        date: "",
      }),
    ),
  );
  const id = created.redirect!.split("/").pop()!;
  const invited = await requestCookies.run(organizerCookies, () =>
    actions.groupAction(id, "invite", {}, data({})),
  );
  const code = invited.link!.split("/").pop()!;
  await requestCookies.run(new Map(), () =>
    actions.joinGroup(code, {}, data({ person: "Zweite Person" })),
  );
  await Promise.all([
    requestCookies.run(organizerCookies, () =>
      actions.groupAction(id, "draw", {}, data({})),
    ),
    requestCookies.run(new Map(), () =>
      actions.joinGroup(code, {}, data({ person: "Dritte Person" })),
    ),
  ]);
  const round = await db.group.findUniqueOrThrow({
    where: { id },
    include: { members: true },
  });
  const assignments = await db.assignment.findMany({
    where: { giver: { groupId: id } },
  });
  expect(assignments).toHaveLength(round.drawn ? round.members.length : 0);
  if (round.drawn)
    expect(new Set(assignments.map((a) => a.recipientId)).size).toBe(
      round.members.length,
    );
});

it("prüft Namensduplikate und löscht Mitgliederdaten vollständig", async () => {
  const ownerCookies = new Map<string, string>();
  const created = await requestCookies.run(ownerCookies, () =>
    actions.createGroup(
      {},
      data({
        name: "Löschen",
        person: "Anna",
        description: "",
        budget: "",
        date: "",
      }),
    ),
  );
  const id = created.redirect!.split("/").pop()!;
  const invited = await requestCookies.run(ownerCookies, () =>
    actions.groupAction(id, "invite", {}, data({})),
  );
  const code = invited.link!.split("/").pop()!;
  const duplicate = await requestCookies.run(new Map(), () =>
    actions.joinGroup(code, {}, data({ person: " ANNA " })),
  );
  expect(duplicate.error).toBeTruthy();
  const guestCookies = new Map<string, string>();
  await requestCookies.run(guestCookies, () =>
    actions.joinGroup(code, {}, data({ person: "Ben" })),
  );
  await requestCookies.run(guestCookies, () =>
    actions.groupAction(
      id,
      "wish-save",
      {},
      data({ title: "Geschenk", description: "", url: "" }),
    ),
  );
  const guest = await db.member.findFirstOrThrow({
    where: { groupId: id, name: "Ben" },
  });
  await requestCookies.run(ownerCookies, () =>
    actions.groupAction(id, "remove-member", {}, data({ id: guest.id })),
  );
  expect(await db.wish.count({ where: { memberId: guest.id } })).toBe(0);
  expect(await db.accessToken.count({ where: { memberId: guest.id } })).toBe(0);
});
