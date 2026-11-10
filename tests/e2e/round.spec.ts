import { test, expect, type Locator } from "@playwright/test";
async function readLink(container: Locator) {
  await container.getByText("Link anzeigen", { exact: true }).click();
  const input = container.getByRole("textbox", { name: "Link", exact: true });
  await input.focus();
  return input.inputValue();
}
test("Familie erstellt eine Runde, tritt bei, wichtelt und kehrt per Link zurück", async ({
  browser,
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Familienwichteln", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole("link", { name: "Runde erstellen" }).click();
  await page.getByLabel("Gruppenname").fill(`Familie ${Date.now()}`);
  await page.getByLabel("Dein Name", { exact: true }).fill("Anna");
  await page.getByLabel("Termin · optional").fill("2026-12-24");
  await page.getByRole("button", { name: "Erstellen", exact: true }).click();
  await expect(
    page.getByText("Runde erstellt.", { exact: false }),
  ).toBeVisible();
  const annaLink = await readLink(page.locator(".share-box"));
  await page.getByRole("link", { name: /Link gesichert/ }).click();
  await expect(page).toHaveURL(/\/gruppe\//);
  const groupUrl = page.url();
  await page.screenshot({
    path: "test-results/round-open.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Einladungslink", exact: true })
    .click();
  const invite = await readLink(page.locator(".admin .share-box"));
  const benContext = await browser.newContext();
  const ben = await benContext.newPage();
  await ben.goto(invite);
  await ben.getByLabel("Dein Name", { exact: true }).fill("Ben");
  await ben.getByRole("button", { name: "Ich bin dabei" }).click();
  const benLink = await readLink(ben.locator(".share-box"));
  await ben.getByRole("link", { name: /Link gesichert/ }).click();
  await ben.getByText("＋ Wunsch hinzufügen", { exact: true }).click();
  await ben
    .getByLabel("Dein Wunsch", { exact: true })
    .fill("Ein besonderes Buch");
  await ben
    .getByLabel("Beschreibung · optional")
    .fill(
      "Ein spannender Roman für gemütliche Winterabende. Gerne auch gebraucht.",
    );
  await ben.getByLabel("Link · optional").fill("https://example.org/buch");
  await ben
    .getByRole("button", { name: "Wunsch hinzufügen", exact: true })
    .click();
  await expect(
    ben.getByRole("heading", { name: "Ein besonderes Buch" }),
  ).toBeVisible();
  const addWish = ben.locator(".add-wish");
  await addWish
    .getByLabel("Dein Wunsch", { exact: true })
    .fill("Ein gemeinsamer Ausflug mit der Familie");
  await addWish
    .getByRole("button", { name: "Wunsch hinzufügen", exact: true })
    .click();
  await expect(
    ben.getByRole("heading", {
      name: "Ein gemeinsamer Ausflug mit der Familie",
    }),
  ).toBeVisible();
  await page.reload();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Auslosen", exact: true }).click();
  await expect(page.getByText("● Ausgelost", { exact: true })).toBeVisible();
  await page.getByText("Wichtelkind aufdecken", { exact: false }).click();
  await expect(page.locator(".recipient-name")).toHaveText("Ben");
  await expect(
    page.getByRole("heading", { name: "Ein besonderes Buch" }),
  ).toBeVisible();
  await ben.reload();
  await expect(
    ben.getByRole("button", { name: "Auslosen", exact: true }),
  ).toHaveCount(0);
  const recoveryContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const recovery = await recoveryContext.newPage();
  await recovery.goto(benLink);
  await expect(recovery).toHaveURL(groupUrl);
  await expect(
    recovery.getByRole("heading", { name: "Ein besonderes Buch" }),
  ).toBeVisible();
  await expect(recovery.locator("body")).toHaveJSProperty("scrollWidth", 390);
  const bookCard = recovery.locator(".own-wish").filter({
    has: recovery.getByRole("heading", {
      name: "Ein besonderes Buch",
      exact: true,
    }),
  });
  await bookCard.getByText("Bearbeiten", { exact: true }).click();
  await bookCard
    .getByLabel("Dein Wunsch", { exact: true })
    .fill("Ein neues Lieblingsbuch");
  await bookCard
    .getByRole("button", { name: "Speichern", exact: true })
    .click();
  await expect(
    recovery.getByRole("heading", { name: "Ein neues Lieblingsbuch" }),
  ).toBeVisible();
  await page.reload();
  await page.getByText("Wichtelkind aufdecken", { exact: false }).click();
  await expect(
    page.getByRole("heading", { name: "Ein neues Lieblingsbuch" }),
  ).toBeVisible();
  await recovery.goto("/");
  await recovery.getByRole("link", { name: /Zur Runde/ }).click();
  await expect(recovery).toHaveURL(groupUrl);
  await recovery.screenshot({
    path: "test-results/mobile.png",
    fullPage: true,
  });
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  await page.goto(annaLink);
  await expect(page).toHaveURL(groupUrl);
  await page.getByText("Teilnehmer & Zugänge", { exact: true }).click();
  const management = page.locator(".member-management");
  await management
    .getByRole("button", { name: "Ersatzlink erstellen" })
    .click();
  const replacement = await readLink(management.locator(".share-box"));
  await recovery.goto(benLink);
  await expect(
    recovery.getByText(
      "Dieser persönliche Link ist ungültig oder wurde ersetzt.",
      { exact: true },
    ),
  ).toBeVisible();
  await recovery.goto(groupUrl);
  await expect(
    recovery.getByRole("heading", { name: "Dein Zugang fehlt." }),
  ).toBeVisible();
  await recovery.goto(replacement);
  await expect(recovery).toHaveURL(groupUrl);
  await benContext.close();
  await recoveryContext.close();
});
