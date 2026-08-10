import { chromium } from "playwright";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await c.newPage();
const log = [];
p.on("console", (m) => m.type() === "error" && log.push("CONSOLE " + m.text()));
p.on("pageerror", (e) => log.push("PAGEERROR " + e.message));

await p.goto("http://localhost:3000/en/workspace", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);

const step = async (name, fn) => {
  try { await fn(); log.push("OK   " + name); }
  catch (e) { log.push("FAIL " + name + " :: " + String(e).split("\n")[0].slice(0, 160)); }
};

// 1. dashboard Open -> topic inbox
await step("dashboard Open -> topics", async () => {
  await p.getByRole("button", { name: "Open", exact: true }).first().click({ timeout: 4000 });
  await p.getByRole("heading", { name: "Ranked candidates" }).waitFor({ timeout: 4000 });
});
// 2. accept a candidate
await step("accept candidate", async () => {
  await p.getByRole("button", { name: "Accept", exact: true }).first().click({ timeout: 4000 });
  await p.waitForTimeout(400);
});
// 3. resolve blocking flags
await step("resolve CRITICAL", async () => {
  await p.getByRole("button", { name: "Revise the script" }).first().click({ timeout: 4000 });
});
await step("resolve HIGH", async () => {
  await p.getByRole("button", { name: "Add an approved source" }).first().click({ timeout: 4000 });
});
// 4. lock
await step("lock version", async () => {
  await p.getByRole("button", { name: /Lock this version/ }).click({ timeout: 4000 });
  await p.getByText("Locked and immutable").waitFor({ timeout: 4000 });
});
// 5. video
await step("mark video uploaded", async () => {
  await p.getByRole("button", { name: /Producer uploaded/ }).click({ timeout: 4000 });
});
// 6. package
await step("open publish package", async () => {
  await p.getByRole("button", { name: "Publish package" }).click({ timeout: 4000 });
});
await step("generate package", async () => {
  await p.getByRole("button", { name: /Generate the package/ }).click({ timeout: 4000 });
  await p.getByText("Title options").first().waitFor({ timeout: 4000 });
});
// 7. record url
await step("record live url", async () => {
  await p.locator("#live-url").fill("https://channels.weixin.qq.com/x/abc123");
  await p.getByRole("button", { name: /Save the record/ }).click({ timeout: 4000 });
  await p.getByText("Publication recorded").waitFor({ timeout: 4000 });
});
// 8. invalidation
await step("change locked script invalidates package", async () => {
  await p.getByRole("button", { name: "Content task" }).click({ timeout: 4000 });
  await p.getByRole("button", { name: /Change the locked script/ }).click({ timeout: 4000 });
  await p.getByRole("button", { name: "Publish package" }).click({ timeout: 4000 });
  await p.getByText(/Invalid: the script changed/).waitFor({ timeout: 4000 });
});
// 9. dead buttons audit
const dead = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll("button").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    if (!el.onclick && !el.getAttribute("type")?.includes("submit")) {
      // React attaches via delegation, so probe the fiber for an onClick prop
      const k = Object.keys(el).find((x) => x.startsWith("__reactProps$"));
      if (k && !el[k].onClick && el[k].type !== "submit") out.push(el.textContent.trim().slice(0, 40));
    }
  });
  return out;
});
log.push("DEAD BUTTONS: " + (dead.length ? JSON.stringify(dead) : "none"));

console.log(log.join("\n"));
await b.close();
