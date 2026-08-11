import { chromium } from "playwright";
const B = process.env.BASE ?? "http://localhost:4300";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 4, colorScheme: "dark" });
const p = await c.newPage();
await p.goto(`${B}/en`, { waitUntil: "networkidle" });
await p.waitForTimeout(600);
await p.locator("header a").first().screenshot({ path: ".impeccable/new/crop-wordmark.png" });
await p.locator("h1").first().screenshot({ path: ".impeccable/new/crop-h1.png" });
// What font is each role actually resolving to, and is the italic a real cut?
const info = await p.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { sel, family: cs.fontFamily.split(",")[0], style: cs.fontStyle, weight: cs.fontWeight, size: cs.fontSize, tracking: cs.letterSpacing, synth: cs.fontSynthesis ?? cs.fontSynthesisStyle };
  };
  const loaded = [...document.fonts].map((f) => `${f.family} ${f.style} ${f.weight} ${f.status}`);
  return { roles: [pick("header a span span"), pick("h1"), pick("h1 em"), pick(".lede"), pick(".mono"), pick(".plate")].filter(Boolean), loaded };
});
console.log(JSON.stringify(info, null, 1));
await b.close();
