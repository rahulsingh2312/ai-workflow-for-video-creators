import { chromium } from "playwright";
const B = process.env.BASE ?? "http://localhost:3000";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await c.newPage();
const nav = (name) => p.locator("nav[aria-label] button", { hasText: name }).first();
const log = [];
p.on("pageerror", (e) => log.push("PAGEERROR " + e.message));
p.on("console", (m) => m.type() === "error" && log.push("CONSOLE " + m.text()));

const step = async (name, fn) => {
  try { await fn(); log.push("OK   " + name); }
  catch (e) { log.push("FAIL " + name + " :: " + String(e).split("\n")[0].slice(0, 140)); }
};

await step("login page loads", async () => {
  await p.goto(`${B}/en/workspace`, { waitUntil: "networkidle" });
  await p.waitForURL("**/login", { timeout: 5000 });
});
await step("pick reviewer account fills form", async () => {
  await p.getByText("zhang@example.com").click();
  await p.waitForFunction(() => document.querySelector("#email")?.value === "zhang@example.com", { timeout: 3000 });
});
await step("sign in as admin", async () => {
  await p.fill("#email", "admin@example.com");
  await p.fill("#password", "throughline");
  await p.getByRole("button", { name: "Sign in" }).click();
  await p.waitForURL("**/workspace", { timeout: 8000 });
  await p.waitForTimeout(1500);
});
await step("next-step bar tells you what to do", async () => {
  await p.getByText(/Accept a topic candidate|TOPIC|SCRIPT|FACT/).first().waitFor({ timeout: 5000 });
});
await step("open topic inbox", async () => {
  await nav("Topic inbox").click();
  await p.getByRole("heading", { name: "Topic inbox" }).waitFor({ timeout: 5000 });
});
await step("accept needs a reason first", async () => {
  const btn = p.getByRole("button", { name: "Accept", exact: true }).first();
  if (!(await btn.isDisabled())) throw new Error("Accept was enabled with no reason");
});
await step("accept a candidate", async () => {
  await p.locator("input[id^='r-']").first().fill("Fresh primary source and the annex is uncovered.");
  await p.getByRole("button", { name: "Accept", exact: true }).first().click();
  await p.waitForTimeout(1800);
});
await step("generate a draft", async () => {
  await p.getByRole("button", { name: "Generate a draft" }).click({ timeout: 20000 });
  await p.waitForTimeout(1800);
});
await step("run the fact check", async () => {
  await p.getByRole("button", { name: "Run the Fact Check Agent" }).click({ timeout: 20000 });
  await p.waitForTimeout(1800);
});
await step("lock is blocked while flags are open", async () => {
  const lock = p.getByRole("button", { name: /Lock this version/ });
  if (await lock.count() && !(await lock.isDisabled())) throw new Error("Lock was enabled with blocking flags open");
});
await step("resolve blocking flags", async () => {
  for (let i = 0; i < 8; i++) {
    const btn = p.getByRole("button", { name: "revised", exact: true }).first();
    if (!(await btn.count())) break;
    await btn.click();
    await p.waitForTimeout(1200);
  }
});
await step("lock the script", async () => {
  await p.getByRole("button", { name: /Lock this version/ }).click({ timeout: 20000 });
  await p.waitForTimeout(1800);
});
await step("deliver the video", async () => {
  await p.getByPlaceholder(/Storage link/).fill("s3://cuts/final.mp4");
  await p.getByRole("button", { name: "Deliver the final video" }).click();
  await p.waitForTimeout(1800);
});
await step("generate the package", async () => {
  await nav("Publish package").click();
  await p.waitForTimeout(1200);
  await p.getByRole("button", { name: "Generate the package" }).click({ timeout: 20000 });
  await p.waitForTimeout(1800);
});
await step("record the publication", async () => {
  await p.getByPlaceholder("Account used").first().fill("Jianwei main");
  await p.getByPlaceholder("https://").first().fill("https://channels.weixin.qq.com/x/abc");
  await p.getByRole("button", { name: "Save the record" }).first().click();
  await p.waitForTimeout(1800);
});
await step("persona answers and creates a lead", async () => {
  await nav("Conversations").click();
  await p.waitForTimeout(1200);
  await p.getByPlaceholder(/Try:/).fill("我们是一家基金，想聊聊长期合作");
  await p.getByRole("button", { name: "Send to the persona" }).click();
  await p.waitForTimeout(1800);
  await p.getByText("HANDOFF").first().waitFor({ timeout: 5000 });
});
await step("audit log has entries", async () => {
  await nav("Audit log").click();
  await p.waitForTimeout(1500);
  const rows = await p.locator("tbody tr").count();
  if (rows < 10) throw new Error(`only ${rows} audit rows`);
  log.push("     audit rows: " + rows);
});
await p.screenshot({ path: ".impeccable/review/app-audit.png" });
await nav("Overview").click();
await p.waitForTimeout(1500);
await p.screenshot({ path: ".impeccable/review/app-overview.png" });

console.log(log.join("\n"));
await b.close();
