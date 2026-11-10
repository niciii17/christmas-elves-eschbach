import { z } from "zod";
const text = (max: number) =>
  z.string().trim().max(max, `Bitte höchstens ${max} Zeichen eingeben.`);
export const nameSchema = text(60).min(1, "Bitte einen Namen eingeben.");
export const groupSchema = z.object({
  name: text(100).min(1, "Bitte einen Gruppennamen eingeben."),
  person: nameSchema,
  description: text(2000),
  budget: text(30).refine(
    (v) => !v || /^\d{1,6}([,.]\d{1,2})?$/.test(v),
    "Bitte einen gültigen Eurobetrag eingeben.",
  ),
  date: text(10).refine(
    (v) =>
      !v ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        !Number.isNaN(Date.parse(`${v}T12:00:00Z`)) &&
        new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v),
    "Bitte ein gültiges Datum eingeben.",
  ),
});
export const wishSchema = z.object({
  title: text(150).min(1, "Bitte einen Wunsch eingeben."),
  description: text(2000),
  url: text(2048).refine((v) => {
    if (!v) return true;
    try {
      return ["http:", "https:"].includes(new URL(v).protocol);
    } catch {
      return false;
    }
  }, "Bitte einen vollständigen HTTP- oder HTTPS-Link eingeben."),
});
export const nameKey = (name: string) =>
  name.normalize("NFKC").toLocaleLowerCase("de-DE");
export const fields = (data: FormData) => Object.fromEntries(data.entries());
