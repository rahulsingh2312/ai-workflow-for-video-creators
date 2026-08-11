import { chromium } from "playwright";
const B = process.env.BASE ?? "http://localhost:4300";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
const p = await c.newPage();
await p.goto(`${B}/en`, { waitUntil: "networkidle" });
await p.waitForTimeout(600);
const out = await p.evaluate(() => {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:-9999px;top:0;font-size:100px;white-space:pre;";
  document.body.appendChild(probe);
  const measure = (family, text) => {
    probe.style.fontFamily = family;
    probe.style.fontWeight = "500";
    const widths = [];
    for (const ch of text) { probe.textContent = ch; widths.push(+probe.getBoundingClientRect().width.toFixed(1)); }
    probe.textContent = text;
    const whole = +probe.getBoundingClientRect().width.toFixed(1);
    return { widths, whole, sum: +widths.reduce((a,b)=>a+b,0).toFixed(1) };
  };
  const word = "Throughline";
  const res = {
    siteStack: measure(getComputedStyle(document.body).fontFamily, word),
    geistOnly: measure("Geist", word),
    notoOnly: measure("notoSC", word),
    sansSerif: measure("sans-serif", word),
    chars: [...word],
  };
  // Per-pair advance in the real stack, to find where the gap is.
  probe.style.fontFamily = getComputedStyle(document.body).fontFamily;
  const pairs = [];
  for (let i = 0; i < word.length - 1; i++) {
    probe.textContent = word[i]; const a = probe.getBoundingClientRect().width;
    probe.textContent = word[i] + word[i+1]; const ab = probe.getBoundingClientRect().width;
    probe.textContent = word[i+1]; const bw = probe.getBoundingClientRect().width;
    pairs.push({ pair: word[i]+word[i+1], kern: +(ab - a - bw).toFixed(2) });
  }
  res.pairs = pairs;
  probe.remove();
  return res;
});
console.log(JSON.stringify(out, null, 1));
await b.close();
