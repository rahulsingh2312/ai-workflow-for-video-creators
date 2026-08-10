import { chromium } from "playwright";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto("http://localhost:3000/en", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
await p.locator("h1 + p").first().screenshot({ path: ".impeccable/review/crop-body.png" });
await b.close();
