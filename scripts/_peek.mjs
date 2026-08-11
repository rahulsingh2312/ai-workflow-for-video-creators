import { chromium } from "playwright";
const B = process.env.BASE ?? "http://localhost:4300";
const b = await chromium.launch();
const c = await b.newContext({ viewport:{width:1440,height:900} });
const p = await c.newPage();
await p.goto(`${B}/en/login`, { waitUntil:"networkidle" });
await p.fill("#email","admin@example.com"); await p.fill("#password","throughline");
await p.getByRole("button",{name:/sign in/i}).click();
await p.waitForURL("**/workspace",{timeout:15000});
const out = await p.evaluate(async () => {
  const tasks = await (await fetch("/api/tasks")).json();
  const id = tasks.tasks?.[0]?.id;
  const d = await (await fetch(`/api/tasks/${id}`)).json();
  return {
    sources: (d.sources ?? []).map(s => ({ id: s.id, name: s.name_en ?? s.name, trust: s.trust, kind: s.kind, url: s.url })),
    claimSample: (d.claims ?? []).slice(0,3),
    bodyHead: (d.versions?.at(-1)?.body ?? "").slice(0, 300),
    flagKeys: Object.keys(d.flags?.[0] ?? {}),
  };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
