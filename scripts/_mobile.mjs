import { chromium } from "playwright";
const B = process.env.BASE ?? "http://localhost:4300";
const b = await chromium.launch();
const errs = new Set();
for (const [k, w, h] of [["mobile",390,844],["desktop",1440,900]]) {
  for (const scheme of ["dark","light"]) {
    const c = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:2, colorScheme:scheme, isMobile:k==="mobile", hasTouch:k==="mobile" });
    const p = await c.newPage();
    p.on("pageerror", e => errs.add("PAGEERROR " + e.message.slice(0,120)));
    p.on("console", m => m.type()==="error" && errs.add("CONSOLE " + m.text().slice(0,120)));
    await p.goto(`${B}/en/login`, { waitUntil:"networkidle" });
    await p.fill("#email","admin@example.com"); await p.fill("#password","throughline");
    await p.getByRole("button",{name:/sign in/i}).click();
    await p.waitForURL("**/workspace",{timeout:15000}); await p.waitForTimeout(2000);
    await p.screenshot({ path:`.impeccable/pass3/${k}-${scheme}-home.png` });
    // Topics: the list that used to collapse to zero
    if (k === "mobile") {
      await p.locator('button[aria-label="Open menu"]').click().catch(()=>{});
      await p.waitForTimeout(500);
      await p.screenshot({ path:`.impeccable/pass3/${k}-${scheme}-rail.png` });
    }
    const nav = p.locator("nav[aria-label] button",{hasText:/^Topics/}).first();
    if (await nav.count()) { await nav.click(); await p.waitForTimeout(1500); }
    await p.screenshot({ path:`.impeccable/pass3/${k}-${scheme}-topics.png`, fullPage:true });
    const over = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      titleW: [...document.querySelectorAll('[data-col="title"]')].map(e=>Math.round(e.getBoundingClientRect().width)).slice(0,3) }));
    console.log(k, scheme, JSON.stringify(over));
    await c.close();
  }
}
console.log(errs.size ? [...errs].join("\n") : "no errors");
await b.close();
