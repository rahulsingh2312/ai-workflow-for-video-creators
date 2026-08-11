import { chromium } from "playwright";
const B = process.env.BASE ?? "http://localhost:4300";
const b = await chromium.launch();
const c = await b.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true });
const p = await c.newPage();
await p.goto(`${B}/en/login`, { waitUntil:"networkidle" });
await p.fill("#email","admin@example.com"); await p.fill("#password","throughline");
await p.getByRole("button",{name:/sign in/i}).click();
await p.waitForURL("**/workspace",{timeout:15000});
await p.locator('button[aria-label="Open menu"]').click().catch(()=>{});
await p.waitForTimeout(400);
await p.locator("nav[aria-label] button",{hasText:/^Topics/}).first().click();
await p.waitForTimeout(1500);
console.log(JSON.stringify(await p.evaluate(() => {
  const list = document.querySelector(".list");
  const row = document.querySelector(".list-row");
  if (!list || !row) return { err: "missing", hasList: !!list, hasRow: !!row };
  const cs = getComputedStyle(list);
  const rs = getComputedStyle(row);
  return {
    listW: Math.round(list.getBoundingClientRect().width),
    containerType: cs.containerType,
    colsVar: cs.getPropertyValue("--cols").trim(),
    colsXsVar: cs.getPropertyValue("--cols-xs").trim(),
    computedTemplate: rs.gridTemplateColumns,
    cells: [...row.children].map(ch => ({
      col: ch.getAttribute("data-col"),
      display: getComputedStyle(ch).display,
      w: Math.round(ch.getBoundingClientRect().width),
    })),
  };
})));
await b.close();
