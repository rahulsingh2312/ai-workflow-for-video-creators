/*
  Drives one content task the whole way down the line through the real API,
  stopping at each state to photograph the screen a person would actually be
  looking at. The workspace is nearly all empty states until a task is in
  flight, so this is the only way to review the functional UI.

  Usage:  BASE=http://localhost:4300 SCHEME=dark node scripts/_drive.mjs
*/
import { chromium } from "playwright";

const B = process.env.BASE ?? "http://localhost:4300";
const SCHEME = process.env.SCHEME ?? "dark";
const OUT = process.env.OUT ?? ".impeccable/flow";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
  colorScheme: SCHEME,
});
const page = await ctx.newPage();
const errs = new Set();
page.on("pageerror", (e) => errs.add("PAGEERROR " + e.message.slice(0, 150)));
page.on("console", (m) => m.type() === "error" && errs.add("CONSOLE " + m.text().slice(0, 150)));

/* Sign in through the UI so the session cookie lands in this context. */
await page.goto(`${B}/en/login`, { waitUntil: "networkidle" });
await page.fill("#email", "admin@example.com");
await page.fill("#password", "throughline");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL("**/workspace", { timeout: 15000 });
await page.waitForTimeout(1500);

/* Every call runs inside the page, so it carries the session cookie. */
const api = (path, init) =>
  page.evaluate(
    async ([p, i]) => {
      const r = await fetch(p, i ? { ...i, headers: { "content-type": "application/json" } } : undefined);
      const text = await r.text();
      let body;
      try { body = JSON.parse(text); } catch { body = text.slice(0, 300); }
      return { status: r.status, body };
    },
    [path, init],
  );

const post = (path, data) => api(path, { method: "POST", body: JSON.stringify(data ?? {}) });

const trail = [];
async function shot(name, screen) {
  if (screen) {
    const btn = page.locator("nav[aria-label] button", { hasText: new RegExp(`^${screen}`) }).first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(1400);
    }
  }
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1600);
  if (screen) {
    const btn = page.locator("nav[aria-label] button", { hasText: new RegExp(`^${screen}`) }).first();
    if (await btn.count()) { await btn.click(); await page.waitForTimeout(1400); }
  }
  await page.screenshot({ path: `${OUT}/${SCHEME}-${name}.png`, fullPage: true });
  trail.push(name);
}

/* ── 1. Accept a topic ─────────────────────────────────────────────────── */
const topics = await api("/api/topics");
const cands = topics.body?.candidates ?? topics.body?.topics ?? [];
console.log("candidates:", cands.length, Object.keys(topics.body ?? {}));
if (!cands.length) { console.log("NO CANDIDATES", JSON.stringify(topics.body).slice(0, 400)); }

await shot("01-topics", "Topics");

const first = cands[0];
if (first) {
  const r = await post(`/api/topics/${first.id}/decide`, {
    decision: "accepted",
    reason: "Primary source is fresh and the annex has not been covered anywhere else.",
  });
  console.log("accept:", r.status, JSON.stringify(r.body).slice(0, 200));
}

/* Find the task that acceptance created. */
const tasks = await api("/api/tasks");
const taskList = tasks.body?.tasks ?? [];
const task = taskList[0];
console.log("tasks:", taskList.length, task?.id, task?.state);
await shot("02-task-selected", "Script");

if (task) {
  /* ── 2. Draft ────────────────────────────────────────────────────────── */
  const g = await post(`/api/tasks/${task.id}/script`);
  console.log("script:", g.status, JSON.stringify(g.body).slice(0, 160));
  await shot("03-script-draft", "Script");

  /* ── 3. Fact check: this is the screen the product is really about ───── */
  const f = await post(`/api/tasks/${task.id}/factcheck`);
  console.log("factcheck:", f.status, JSON.stringify(f.body).slice(0, 160));
  await shot("04-fact-review", "Script");

  /* ── 4. Resolve every open flag ──────────────────────────────────────── */
  const detail = await api(`/api/tasks/${task.id}`);
  const flags = detail.body?.detail?.flags ?? detail.body?.flags ?? [];
  console.log("flags:", flags.length);
  for (const fl of flags) {
    if (fl.status === "resolved") continue;
    const r = await post(`/api/flags/${fl.id}`, {
      resolution: "sourced",
      reason: "Attached the approved filing this claim comes from.",
    });
    if (r.status >= 400) console.log("flag fail:", fl.id, r.status, JSON.stringify(r.body).slice(0, 140));
  }
  await shot("05-flags-resolved", "Script");

  /* ── 5. Lock ─────────────────────────────────────────────────────────── */
  const l = await post(`/api/tasks/${task.id}/lock`);
  console.log("lock:", l.status, JSON.stringify(l.body).slice(0, 200));
  await shot("06-locked", "Script");

  /* The interlocking will not leave SCRIPT_LOCKED until someone owns the
     filming, so assign before trying to hand a video over. */
  const as = await post(`/api/tasks/${task.id}/assign`, { producer_id: "u_lin" });
  console.log("assign:", as.status, JSON.stringify(as.body).slice(0, 120));

  /* ── 6. Video in, package out ────────────────────────────────────────── */
  const m = await post(`/api/tasks/${task.id}/media`, {
    ref: "s3://studio/final/q3-disclosure-cut-04.mov",
    label: "Final cut 04",
  });
  console.log("media:", m.status, JSON.stringify(m.body).slice(0, 160));
  await shot("07-video-ready", "Script");

  const pk = await post(`/api/tasks/${task.id}/packages`);
  console.log("packages:", pk.status, JSON.stringify(pk.body).slice(0, 160));
  await shot("08-publish-package", "Publish");
}

/* ── 7. The other working surfaces, with whatever the seed gives them ──── */
for (const [name, screen] of [
  ["09-messages", "Messages"],
  ["10-leads", "Leads"],
  ["11-results", "Results"],
  ["12-knowledge", "Knowledge"],
  ["13-settings", "Settings"],
  ["14-activity", "Activity"],
  ["15-home", "Home"],
]) {
  await shot(name, screen);
}

console.log("\ncaptured:", trail.join(", "));
console.log(errs.size ? "\nERRORS:\n" + [...errs].join("\n") : "\nno console errors");
await browser.close();
