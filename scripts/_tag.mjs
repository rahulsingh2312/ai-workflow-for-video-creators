import { chromium } from "playwright";
const B = process.env.BASE ?? "http://localhost:4300";
const b = await chromium.launch();
const c = await b.newContext({ viewport:{width:1440,height:900}, colorScheme:"dark" });
const p = await c.newPage();
await p.goto(`${B}/en/login`, { waitUntil:"networkidle" });
await p.fill("#email","admin@example.com"); await p.fill("#password","throughline");
await p.getByRole("button",{name:/sign in/i}).click();
await p.waitForURL("**/workspace",{timeout:15000});
await p.locator("nav[aria-label] button",{hasText:"Topics"}).first().click();
await p.waitForTimeout(1500);
const out = await p.evaluate(() => {
  const row = document.querySelector(".list-row");
  if (!row) return { err: "no .list-row" };
  const cells = [...row.children].map((c, i) => {
    const r = c.getBoundingClientRect();
    return { i, cls: c.className.slice(0,60), x: Math.round(r.x), w: Math.round(r.width), scrollW: c.scrollWidth, overflow: getComputedStyle(c).overflow };
  });
  const tags = [...row.querySelectorAll('span[title]')].map((t) => {
    const cs = getComputedStyle(t);
    const inner = t.querySelector("span:last-child");
    const ics = inner ? getComputedStyle(inner) : null;
    return {
      title: t.getAttribute("title").slice(0,40),
      w: Math.round(t.getBoundingClientRect().width),
      scrollW: t.scrollWidth,
      maxW: cs.maxWidth, overflow: cs.overflow, flexShrink: cs.flexShrink, minW: cs.minWidth,
      innerOverflow: ics?.overflow, innerTextOverflow: ics?.textOverflow, innerMinW: ics?.minWidth,
      innerW: inner ? Math.round(inner.getBoundingClientRect().width) : null,
      innerScrollW: inner?.scrollWidth,
    };
  });
  const cols = getComputedStyle(row).gridTemplateColumns;
  return { cols, cells, tags };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
