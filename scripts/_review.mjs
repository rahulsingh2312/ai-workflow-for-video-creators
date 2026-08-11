import { chromium } from "playwright";

const B = process.env.BASE ?? "http://localhost:4300";
const OUT = ".impeccable/new";

const problems = [];
const seen = new Set();
function watch(page, tag) {
  page.on("pageerror", (e) => note(`${tag} PAGEERROR ${e.message}`));
  page.on("console", (m) => m.type() === "error" && note(`${tag} CONSOLE ${m.text().slice(0, 160)}`));
  page.on("response", (r) => {
    if (r.status() >= 400) note(`${tag} HTTP ${r.status()} ${r.url().slice(0, 110)}`);
  });
}
function note(s) {
  if (seen.has(s)) return;
  seen.add(s);
  problems.push(s);
}

const browser = await chromium.launch();

const VIEWPORTS = [
  { key: "desktop", width: 1440, height: 900 },
  { key: "mobile", width: 390, height: 844 },
];

const ROUTES = [
  { path: "/en", name: "home", full: true },
  { path: "/en/workflow", name: "workflow", full: true },
  { path: "/en/agents", name: "agents", full: true },
  { path: "/en/security", name: "security", full: true },
  { path: "/zh", name: "home-zh", full: true },
];

for (const scheme of ["dark", "light"]) {
  for (const vp of VIEWPORTS) {
    // Only the full matrix on desktop-dark; mobile and light get the key pages.
    const routes =
      scheme === "dark" && vp.key === "desktop"
        ? ROUTES
        : ROUTES.filter((r) => ["home", "workflow", "home-zh"].includes(r.name));

    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      colorScheme: scheme,
      hasTouch: vp.key === "mobile",
      isMobile: vp.key === "mobile",
    });
    const page = await ctx.newPage();
    watch(page, `${scheme}/${vp.key}`);

    for (const r of routes) {
      await page.goto(`${B}${r.path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      await page.screenshot({
        path: `${OUT}/${r.name}-${vp.key}-${scheme}.png`,
        fullPage: Boolean(r.full) && vp.key === "desktop",
      });
    }

    // The app, behind auth.
    await page.goto(`${B}/en/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/login-${vp.key}-${scheme}.png` });

    await page.fill("#email", "admin@example.com");
    await page.fill("#password", "throughline");
    await page.getByRole("button", { name: /sign in/i }).click();
    try {
      await page.waitForURL("**/workspace", { timeout: 15000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${OUT}/app-${vp.key}-${scheme}.png` });

      if (vp.key === "desktop") {
        for (const [label, file] of [
          ["Content task", "app-task"],
          ["Topics", "app-topics"],
        ]) {
          const btn = page.locator("nav[aria-label] button", { hasText: label }).first();
          if (await btn.count()) {
            await btn.click();
            await page.waitForTimeout(1600);
            await page.screenshot({ path: `${OUT}/${file}-${scheme}.png` });
          }
        }
      }
    } catch (e) {
      note(`${scheme}/${vp.key} LOGIN ${String(e).slice(0, 120)}`);
    }

    await ctx.close();
  }
}

/* ── Contrast and measure audit on the live DOM ───────────────────────────── */
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: "dark",
});
const page = await ctx.newPage();
const audit = [];
for (const path of ["/en", "/en/workflow", "/en/agents", "/en/security"]) {
  await page.goto(`${B}${path}`, { waitUntil: "networkidle" });
  const res = await page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const parse = (s) => (s.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
    const groundOf = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        const a = (bg.match(/[\d.]+/g) ?? [])[3];
        if (bg && bg !== "rgba(0, 0, 0, 0)" && a !== "0") return parse(bg);
        n = n.parentElement;
      }
      return parse(getComputedStyle(document.body).backgroundColor);
    };
    const bad = [];
    const wide = [];
    for (const el of document.querySelectorAll("p,li,dd,dt,span,a,h1,h2,h3,h4,button,td,th")) {
      const text = (el.textContent ?? "").trim();
      if (!text || el.children.length > 0) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const size = parseFloat(cs.fontSize);
      const weight = Number(cs.fontWeight) || 400;
      const fg = parse(cs.color);
      const bg = groundOf(el);
      if (fg.length < 3 || bg.length < 3) continue;
      const l1 = lum(fg), l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const floor = large ? 3 : 4.5;
      if (ratio < floor) {
        bad.push({ ratio: +ratio.toFixed(2), size, color: cs.color, text: text.slice(0, 48) });
      }
      // measure: characters per line for real body copy
      if (size >= 13 && text.length > 90) {
        const w = el.getBoundingClientRect().width;
        const ch = w / (size * 0.5);
        if (ch > 82) wide.push({ ch: Math.round(ch), text: text.slice(0, 40) });
      }
    }
    const overflow = document.documentElement.scrollWidth > window.innerWidth + 1;
    return { bad: bad.slice(0, 8), wide: wide.slice(0, 4), overflow };
  });
  if (res.bad.length || res.wide.length || res.overflow) audit.push({ path, ...res });
}
await ctx.close();
await browser.close();

console.log("=== ERRORS ===");
console.log(problems.length ? problems.join("\n") : "none");
console.log("=== AUDIT ===");
console.log(audit.length ? JSON.stringify(audit, null, 1) : "clean");
