import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";

// Render the actual landing-page illustration, without accessing a running app or its data.
const source = await readFile(
  new URL("../src/app/page.tsx", import.meta.url),
  "utf8",
);
const illustration = source
  .match(/<div className="hero-art"[\s\S]*?<\/section>/)?.[0]
  .replace(/<\/section>$/, "")
  .replaceAll("className=", "class=")
  .replace(/<div([^>]*?)\s*\/>/g, "<div$1></div>");
if (!illustration || /[{}]/.test(illustration))
  throw new Error(
    "The landing-page illustration has changed; update the asset renderer.",
  );
const css = (
  await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8")
).replace(/@import\s+"tailwindcss";/, "");
const browser = await chromium.launch();
let gift;
try {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 600 },
    deviceScaleFactor: 3,
  });
  await page.setContent(
    `<html lang="de"><head><meta charset="utf-8"><style>${css}\nbody{background:transparent}.hero-art{width:450px;height:400px}</style></head><body>${illustration}</body></html>`,
  );
  await page.evaluate(() => document.fonts.ready);
  const halo = await page.locator(".gift-halo").boundingBox();
  if (!halo) throw new Error("Gift illustration was not rendered.");
  gift = await page.screenshot({
    omitBackground: true,
    clip: {
      x: halo.x - 22,
      y: halo.y - 22,
      width: halo.width + 44,
      height: halo.height + 44,
    },
  });
} finally {
  await browser.close();
}

const root = new URL("../", import.meta.url);
await mkdir(new URL("public/", root), { recursive: true });
await writeFile(new URL("public/gift.png", root), gift);

const canvas =
  Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
<rect width="1200" height="630" fill="#faf8f2"/>
<path d="M76 68H1124M76 562H1124" stroke="#e4e6db"/>
<text x="80" y="132" fill="#244a3b" font-family="Georgia,serif" font-size="52">Familienwichteln</text>
<text x="80" y="270" fill="#244a3b" font-family="Georgia,serif" font-size="49">«Neue Runde.</text>
<text x="80" y="338" fill="#244a3b" font-family="Georgia,serif" font-size="49">Neue Chance auf</text>
<text x="80" y="406" fill="#ae554a" font-family="Georgia,serif" font-style="italic" font-size="49">etwas Brauchbares.»</text>
<path d="M80 424H513" stroke="#d4b58a" stroke-width="2"/>
</svg>`);
const giftForPreview = await sharp(gift).resize(410, 410).png().toBuffer();
await sharp(canvas)
  .composite([{ input: giftForPreview, left: 730, top: 118 }])
  .png()
  .toFile(new URL("public/social-preview.png", root).pathname);
await sharp(gift)
  .resize(512, 512)
  .png()
  .toFile(new URL("src/app/icon.png", root).pathname);
await sharp(gift)
  .resize(180, 180)
  .flatten({ background: "#faf8f2" })
  .png()
  .toFile(new URL("src/app/apple-icon.png", root).pathname);

// ICO supports embedded PNGs; provide both common tab-icon resolutions.
const icons = await Promise.all(
  [32, 48].map((size) => sharp(gift).resize(size, size).png().toBuffer()),
);
const header = Buffer.alloc(6 + icons.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icons.length, 4);
let offset = header.length;
for (let index = 0; index < icons.length; index++) {
  const entry = 6 + index * 16;
  header[entry] = header[entry + 1] = [32, 48][index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(icons[index].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += icons[index].length;
}
await writeFile(
  new URL("src/app/favicon.ico", root),
  Buffer.concat([header, ...icons]),
);
console.log(
  "Created gift illustration, social preview, favicon and Apple icon.",
);
