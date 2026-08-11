import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });

async function measure(url, sel, label) {
  await p.goto(url, { waitUntil: 'networkidle' });
  const out = await p.evaluate(({sel}) => {
    const res = [];
    for (const el of document.querySelectorAll(sel)) {
      const cs = getComputedStyle(el);
      // measure ch via canvas
      const c = document.createElement('canvas').getContext('2d');
      c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const ch = c.measureText('0').width;
      const box = el.getBoundingClientRect().width;
      // actual rendered line rects for the text
      const r = document.createRange();
      r.selectNodeContents(el);
      const rects = [...r.getClientRects()].filter(x => x.width > 1);
      // group into lines by top
      const lines = {};
      for (const x of rects) {
        const k = Math.round(x.top);
        lines[k] = lines[k] ? { l: Math.min(lines[k].l, x.left), r: Math.max(lines[k].r, x.right) } : { l: x.left, r: x.right };
      }
      const lw = Object.values(lines).map(v => v.r - v.l);
      const text = el.textContent.trim();
      res.push({
        text: text.slice(0, 45),
        chars: text.length,
        fontSize: cs.fontSize,
        boxPx: +box.toFixed(1),
        chPx: +ch.toFixed(2),
        boxCh: +(box / ch).toFixed(1),
        lines: lw.length,
        maxLinePx: +Math.max(...lw).toFixed(1),
        maxLineCh: +(Math.max(...lw) / ch).toFixed(1),
        // actual characters on longest line approx: chars / lines
        avgCharsPerLine: Math.round(text.length / lw.length),
      });
    }
    return res;
  }, {sel});
  console.log('=== ' + label);
  console.table(out);
}

await measure('http://localhost:4300/en/workflow', 'dl dd', 'workflow dd');
await measure('http://localhost:4300/en/workflow', 'p.lede.measure', 'workflow lede (.measure reference)');
await measure('http://localhost:4300/en', 'table td', 'home table td');
await measure('http://localhost:4300/en', '.measure', 'home .measure');
await b.close();
