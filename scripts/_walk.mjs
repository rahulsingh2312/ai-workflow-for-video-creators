import { chromium } from "playwright";
const B = process.env.BASE ?? "http://localhost:4300";
const scheme = process.env.SCHEME ?? "dark";
const b = await chromium.launch();
const c = await b.newContext({ viewport:{width:1440,height:1000}, deviceScaleFactor:2, colorScheme:scheme });
const p = await c.newPage();
const errs = new Set();
p.on("pageerror", e => errs.add("PAGEERROR " + e.message.slice(0,140)));
p.on("console", m => m.type()==="error" && errs.add("CONSOLE " + m.text().slice(0,140)));
p.on("response", r => r.status()>=400 && errs.add(`HTTP ${r.status()} ${r.url().slice(0,90)}`));

await p.goto(`${B}/en/login`, { waitUntil:"networkidle" });
await p.fill("#email","admin@example.com"); await p.fill("#password","throughline");
await p.getByRole("button",{name:/sign in/i}).click();
await p.waitForURL("**/workspace",{timeout:15000}); await p.waitForTimeout(2000);

const SCREENS = ["Home","Topics","Script","Publish","Messages","Leads","Results","Knowledge","Settings","Activity"];
for (const name of SCREENS) {
  const btn = p.locator("nav[aria-label] button", { hasText: new RegExp(`^${name}`) }).first();
  if (!(await btn.count())) { console.log("MISSING NAV:", name); continue; }
  await btn.click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path:`.impeccable/app/${scheme}-${name.toLowerCase()}.png`, fullPage:true });
}
console.log(errs.size ? [...errs].join("\n") : "no console/network errors");
await b.close();
