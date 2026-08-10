import { chromium } from "playwright";
const B = process.env.BASE ?? "http://localhost:3000";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await c.newPage();
const log = [];
p.on("pageerror", (e) => log.push("PAGEERROR " + e.message));
p.on("console", (m) => m.type() === "error" && log.push("CONSOLE " + m.text()));
const step = async (n, f) => { try { await f(); log.push("OK   " + n); } catch (e) { log.push("FAIL " + n + " :: " + String(e).split("\n")[0].slice(0,120)); } };
const header = () => p.locator("header");

await step("landing shows Sign in in the header", async () => {
  await p.goto(`${B}/en`, { waitUntil: "networkidle" });
  await header().getByRole("link", { name: "Sign in" }).waitFor({ timeout: 6000 });
});
await step("sign in", async () => {
  await header().getByRole("link", { name: "Sign in" }).click();
  await p.waitForURL("**/login", { timeout: 6000 });
  await p.fill("#email", "zhang@example.com");
  await p.fill("#password", "throughline");
  await p.getByRole("button", { name: "Sign in" }).click();
  await p.waitForURL("**/workspace", { timeout: 8000 });
});
await step("header shows the signed-in name and Sign out", async () => {
  await header().getByText("Zhang Wei").waitFor({ timeout: 6000 });
  await header().getByRole("button", { name: "Sign out" }).waitFor({ timeout: 6000 });
});
await step("header Sign out persists across marketing pages", async () => {
  await p.goto(`${B}/en/workflow`, { waitUntil: "networkidle" });
  await header().getByRole("button", { name: "Sign out" }).waitFor({ timeout: 6000 });
});
await step("workspace bar Sign out still works too", async () => {
  await p.goto(`${B}/en/workspace`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  const inBar = p.locator("main button", { hasText: "Sign out" }).first();
  if (!(await inBar.count())) throw new Error("no Sign out inside the workspace");
});
await step("sign out from the header", async () => {
  await p.goto(`${B}/en/workflow`, { waitUntil: "networkidle" });
  await header().getByRole("button", { name: "Sign out" }).click();
  await p.waitForURL("**/login", { timeout: 8000 });
});
await step("session is actually gone", async () => {
  const d = await p.evaluate(() => fetch("/api/session").then(r => r.json()));
  if (d.session !== null) throw new Error("session survived sign out: " + JSON.stringify(d.session));
});
await step("workspace now redirects to login", async () => {
  await p.goto(`${B}/en/workspace`, { waitUntil: "networkidle" });
  if (!p.url().includes("/login")) throw new Error("still reachable at " + p.url());
});
await p.goto(`${B}/en`, { waitUntil: "networkidle" });
await p.waitForTimeout(800);
await p.screenshot({ path: ".impeccable/review/header-signedout.png", clip: { x: 0, y: 0, width: 1280, height: 90 } });
console.log(log.join("\n"));
await b.close();
