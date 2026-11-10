import { describe, it, expect } from "vitest";
import { draw } from "../src/lib/draw";
import { wishSchema, groupSchema } from "../src/lib/validation";
describe("Auslosung", () => {
  it("ordnet zwei Personen gegenseitig zu", () => {
    expect([...draw(["a", "b"], [])]).toEqual(
      expect.arrayContaining([
        ["a", "b"],
        ["b", "a"],
      ]),
    );
  });
  it("erzeugt wiederholt vollständige gültige Zuordnungen mit Ausschlüssen", () => {
    const ids = ["a", "b", "c", "d", "e", "f"];
    for (let i = 0; i < 100; i++) {
      const result = draw(ids, [{ firstId: "a", secondId: "b" }]);
      expect(result.size).toBe(ids.length);
      expect(new Set(result.values()).size).toBe(ids.length);
      for (const [giver, recipient] of result) {
        expect(giver).not.toBe(recipient);
        expect([giver, recipient].sort().join("")).not.toBe("ab");
      }
    }
  });
  it("erkennt unmögliche Regeln und ungültige Teilnehmer", () => {
    expect(() => draw(["a", "b"], [{ firstId: "a", secondId: "b" }])).toThrow();
    expect(() => draw(["a"], [])).toThrow();
    expect(() => draw(["a", "a"], [])).toThrow();
  });
  it("findet ein Matching selbst bei nur einer möglichen Kombination", () => {
    const result = draw(
      ["a", "b", "c", "d"],
      [
        { firstId: "a", secondId: "b" },
        { firstId: "a", secondId: "c" },
        { firstId: "b", secondId: "d" },
      ],
    );
    expect(result.get("a")).toBe("d");
    expect(result.get("d")).toBe("a");
  });
});
it("erlaubt nur sichere Wunschlinks und gültige Gruppendaten", () => {
  expect(
    wishSchema.safeParse({
      title: "Buch",
      description: "",
      url: "javascript:alert(1)",
    }).success,
  ).toBe(false);
  expect(
    wishSchema.safeParse({
      title: "Buch",
      description: "",
      url: "https://example.org",
    }).success,
  ).toBe(true);
  expect(
    groupSchema.safeParse({
      name: "Familie",
      person: "Anna",
      description: "",
      budget: "abc",
      date: "",
    }).success,
  ).toBe(false);
});
