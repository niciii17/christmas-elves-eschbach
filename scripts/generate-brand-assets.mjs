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
const slogan = source
  .match(/<FestiveQuote hero>([\s\S]*?)<\/FestiveQuote>/)?.[1]
  .replace(/\{\s*" "\s*\}/g, " ");
if (!slogan || /[{}]/.test(slogan))
  throw new Error(
    "The landing-page slogan has changed; update the asset renderer.",
  );
const css = (
  await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8")
).replace(/@import\s+"tailwindcss";/, "");
const browser = await chromium.launch();
let gift;
let socialPreview;
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
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(`<html lang="de"><head><meta charset="utf-8"><style>${css}
    body{margin:0;background:var(--cream)}
    .share-card{width:1200px;height:630px;position:relative;overflow:hidden;background:var(--cream)}
    .share-card::before,.share-card::after{content:"";position:absolute;left:76px;right:76px;height:1px;background:var(--line)}
    .share-card::before{top:52px}.share-card::after{bottom:52px}
    .share-title{position:absolute;left:80px;top:92px;font:600 14px Arial,sans-serif;color:var(--muted);letter-spacing:2px;text-transform:uppercase}
    .share-copy{position:absolute;left:80px;top:157px;width:620px}
    .share-copy .hero-quote{font-size:48px;line-height:1.15;max-width:540px;margin:0}
    .share-card .hero-art{position:absolute;left:710px;top:116px;width:450px;height:400px}
  </style></head><body><div class="share-card"><div class="share-title">Familienwichteln</div><div class="share-copy festive-quote"><p class="hero-quote">${slogan}</p></div>${illustration}</div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  socialPreview = await page
    .locator(".share-card")
    .screenshot({ scale: "css" });
} finally {
  await browser.close();
}

const root = new URL("../", import.meta.url);
await mkdir(new URL("public/", root), { recursive: true });
await writeFile(new URL("public/gift.png", root), gift);

await writeFile(new URL("public/social-preview.png", root), socialPreview);
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
