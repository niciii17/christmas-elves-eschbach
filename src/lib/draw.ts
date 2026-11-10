import { randomInt } from "node:crypto";

function shuffled<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Randomized augmenting paths find a complete matching, including with exclusions. */
export function draw(
  ids: string[],
  exclusions: { firstId: string; secondId: string }[],
): Map<string, string> {
  if (ids.length < 2 || new Set(ids).size !== ids.length)
    throw new Error("Mindestens zwei verschiedene Personen sind nötig.");
  const blocked = new Set(
    exclusions.flatMap(({ firstId, secondId }) => [
      `${firstId}:${secondId}`,
      `${secondId}:${firstId}`,
    ]),
  );
  const candidates = new Map(
    ids.map((id) => [
      id,
      shuffled(
        ids.filter((other) => other !== id && !blocked.has(`${id}:${other}`)),
      ),
    ]),
  );
  const owners = new Map<string, string>();
  function match(giver: string, seen: Set<string>): boolean {
    for (const recipient of candidates.get(giver) ?? []) {
      if (seen.has(recipient)) continue;
      seen.add(recipient);
      const previous = owners.get(recipient);
      if (!previous || match(previous, seen)) {
        owners.set(recipient, giver);
        return true;
      }
    }
    return false;
  }
  for (const giver of shuffled(ids)) {
    if (!match(giver, new Set()))
      throw new Error(
        "Mit diesen Ausschlüssen ist keine Auslosung möglich. Bitte entferne mindestens einen Ausschluss.",
      );
  }
  return new Map([...owners].map(([recipient, giver]) => [giver, recipient]));
}
