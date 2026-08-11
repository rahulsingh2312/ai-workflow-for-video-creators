import { chromium } from "playwright";
const B = process.env.BASE ?? "http://localhost:3000";
const targets = process.argv.slice(2);
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await c.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
p.on("console", (m) => m.type() === "error" && errs.push("CONSOLE " + m.text().slice(0,200)));
p.on("response", (r) => r.status() >= 400 && errs.push(`HTTP ${r.status()} ${r.url().slice(0,120)}`));
for (const t of targets) {
  const [route, name, full] = t.split("|");
  await p.goto(`${B}${route}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `.impeccable/new/${name}.png`, fullPage: full === "full" });
}
console.log(errs.length ? [...new Set(errs)].slice(0, 12).join("\n") : "clean");
await b.close();
