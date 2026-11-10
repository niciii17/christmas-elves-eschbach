import { test, expect } from "@playwright/test";

test("shared previews use the gift and generic metadata, with working icons", async ({
  request,
  page,
}) => {
  const response = await request.get("/", {
    headers: { "User-Agent": "facebookexternalhit/1.1" },
  });
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('property="og:title" content="Familienwichteln"');
  expect(html).toContain(
    'property="og:description" content="«Neue Runde. Neue Chance auf etwas Brauchbares.»"',
  );
  expect(html).toContain(
    'property="og:image" content="http://127.0.0.1:3100/social-preview.png"',
  );
  expect(html).toContain('name="twitter:card" content="summary_large_image"');
  expect(html).toContain(
    'name="twitter:image" content="http://127.0.0.1:3100/social-preview.png"',
  );
  const image = await request.get("/social-preview.png");
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toContain("image/png");
  const png = await image.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
  const favicon = await request.get("/favicon.ico");
  expect(favicon.ok()).toBe(true);
  expect((await favicon.body()).readUInt16LE(2)).toBe(1);
  await page.goto("/neu");
  for (const selector of ['link[rel="icon"]', 'link[rel="apple-touch-icon"]']) {
    const links = await page
      .locator(selector)
      .evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLLinkElement).href),
      );
    expect(links.length).toBeGreaterThan(0);
    for (const url of links) expect((await request.get(url)).ok()).toBe(true);
  }
});
