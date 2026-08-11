import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('http://localhost:4300/en/login', { waitUntil: 'networkidle' });
console.log('url', p.url());
// try login
const inputs = await p.$$('input');
console.log('inputs', inputs.length);
for (const i of inputs) console.log(await i.getAttribute('name'), await i.getAttribute('type'), await i.getAttribute('placeholder'), await i.inputValue());
await b.close();
