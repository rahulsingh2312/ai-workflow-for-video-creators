import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? ".impeccable/review";
mkdirSync(OUT, { recursive: true });

const targets = (process.env.ONLY ?? "").length
  ? JSON.parse(process.env.ONLY)
  : [
      { name: "home", path: "/en" },
      { name: "workflow", path: "/en/workflow" },
      { name: "agents", path: "/en/agents" },
      { name: "security", path: "/en/security" },
      { name: "workspace", path: "/en/workspace" },
      { name: "home-zh", path: "/zh" },
      { name: "workspace-zh", path: "/zh/workspace" },
    ];

const viewports = [
  { key: "desktop", width: 1440, height: 900 },
  { key: "mobile", width: 390, height: 844 },
];

const browser = await chromium.launch();
const errors = [];

for (const vp of viewports) {
  for (const theme of ["dark", "light"]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    await ctx.addInitScript((t) => {
      try {
        localStorage.setItem("tl-theme", t);
      } catch {}
    }, theme);

    const page = await ctx.newPage();
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`[console] ${m.text()}`);
    });
    page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
    page.on("requestfailed", (r) => errors.push(`[404] ${r.url()} ${r.failure()?.errorText}`));

    for (const t of targets) {
      // Only the dark rendition gets the full page sweep; light is spot-checked
      // on the pages where the palette actually changes character.
      if (theme === "light" && !["home", "workspace", "workflow"].includes(t.name)) continue;

      await page.goto(`${BASE}${t.path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(theme === "dark" && t.name.startsWith("home") ? 7000 : 900);

      const suffix = theme === "light" ? "-light" : "";
      await page.screenshot({
        path: `${OUT}/${t.name}-${vp.key}${suffix}.png`,
        fullPage: false,
      });
      await page.screenshot({
        path: `${OUT}/${t.name}-${vp.key}${suffix}-full.png`,
        fullPage: true,
      });
    }
    await ctx.close();
  }
}

await browser.close();

if (errors.length) {
  console.log("PAGE PROBLEMS:");
  for (const e of [...new Set(errors)]) console.log("  " + e);
} else {
  console.log("No console errors, page errors, or failed requests.");
}
