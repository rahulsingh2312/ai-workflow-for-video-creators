import { chromium } from "playwright";
const B = process.env.BASE ?? "http://localhost:4300";
const b = await chromium.launch();
for (const vp of [{k:"desktop",w:1440,h:900},{k:"mobile",w:390,h:844}]) {
  for (const scheme of ["dark","light"]) {
    const c = await b.newContext({ viewport:{width:vp.w,height:vp.h}, deviceScaleFactor:2, colorScheme:scheme, isMobile: vp.k==="mobile", hasTouch: vp.k==="mobile" });
    const p = await c.newPage();
    await p.goto(`${B}/en/login`, { waitUntil:"networkidle" });
    await p.fill("#email","admin@example.com"); await p.fill("#password","throughline");
    await p.getByRole("button",{name:/sign in/i}).click();
    await p.waitForURL("**/workspace",{timeout:15000}); await p.waitForTimeout(2200);
    await p.screenshot({ path:`.impeccable/pass2/app-${vp.k}-${scheme}.png` });
    if (vp.k==="desktop") {
      const t = p.locator("nav[aria-label] button",{hasText:"Topics"}).first();
      if (await t.count()) { await t.click(); await p.waitForTimeout(1600);
        await p.screenshot({ path:`.impeccable/pass2/app-topics-${scheme}.png` }); }
    }
    await c.close();
  }
}
await b.close(); console.log("ok");
