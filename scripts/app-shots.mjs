import { chromium } from "playwright";
const B = process.env.BASE ?? "http://localhost:3000";
const b = await chromium.launch();
for (const vp of [{k:"desktop",w:1440,h:1000},{k:"mobile",w:390,h:844}]) {
  const c = await b.newContext({ viewport:{width:vp.w,height:vp.h}, deviceScaleFactor:2 });
  const p = await c.newPage();
  await p.goto(`${B}/en/login`, { waitUntil:"networkidle" });
  await p.screenshot({ path:`.impeccable/review/login-${vp.k}.png` });
  await p.fill("#email","admin@example.com"); await p.fill("#password","throughline");
  await p.getByRole("button",{name:"Sign in"}).click();
  await p.waitForURL("**/workspace",{timeout:10000}); await p.waitForTimeout(2500);
  await p.screenshot({ path:`.impeccable/review/app-${vp.k}.png` });
  const nav = (n) => p.locator("nav[aria-label] button",{hasText:n}).first();
  await nav("Content task").click(); await p.waitForTimeout(2000);
  await p.screenshot({ path:`.impeccable/review/app-task-${vp.k}.png`, fullPage: vp.k==="desktop" });
  await c.close();
}
await b.close();
console.log("captured");
