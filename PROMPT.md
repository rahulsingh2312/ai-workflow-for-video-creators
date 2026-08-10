# Product Site


## 0. Install these skills first

Design + animation skills that make the output dramatically better:

```bash
# Impeccable: design, critique, polish, animation commands
# (/impeccable craft, shape, audit, polish, bolder, animate…)
npx impeccable install

# Emil Kowalski's design & animation skills (emil-design-eng, review-animations,
# improve-animations, find-animation-opportunities, animation-vocabulary,
# apple-design, pick-ui-library, prototype)
# https://github.com/emilkowalski/skills · https://emilkowal.ski/skill
npx skills.sh add emilkowalski/skills

# Animate skill: Next.js/React animation patterns from Emil's course
npx skills add https://github.com/delphi-ai/animate-skill --skill animate

# Monid CLI: one interface for hundreds of data tools (web scraping, search,
# enrichment, social, company/people/product data, content monitoring)
# https://monid.ai/SKILL.md
npm install -g @monid-ai/cli@latest
monid setup --client claude-code --email johidaksh@gmail.com
```

Monid workflow: `monid discover -q "<query>"` to find an endpoint, `monid inspect
-p <provider> -e <endpoint>` to read its schema, `monid run -p <provider> -e
<endpoint> -i '<json>' -o <file>` to execute, `monid runs get -r <runId>` to poll.
Add `--wait` for async tasks you want to block on. Always save with `-o`.
Reach for it before writing a custom scraper or calling something inaccessible.
Skip it when there's already a dedicated tool or API key for that service.

1. `/impeccable init` once in the project.
2. `brand-design` before any UI exists: it generates palette candidates, opens
   a browser preview, and writes `brand.md` + shadcn CSS vars once you pick.
3. `frontend-design-guidelines` while writing components (it reads `brand.md`
   as the source of truth for color, type, and voice).
4. `emil-design-eng` / `apple-design` for the polish pass: hierarchy, spacing,
   physical motion, the invisible details.
5. `animate` + `find-animation-opportunities` to add motion deliberately, then
   `review-animations` on the diff.
6. Finish with `/impeccable audit` + `/impeccable polish`, then
   `product-review` (or `roast-my-product` if you want it blunt).


### Copywriting rules (non-negotiable)

- **Write like a human, not a model.** Every line should sound like a person
  talking: contractions, short sentences, specific images ("your Postgres
  connection string, pasted once, and you're done"). If a sentence could open
  any SaaS landing page, rewrite it. Ban "seamlessly", "empower", "unlock",
  "revolutionize", "cutting-edge", "leverage".
- **Claims must be true.** No invented customers, uptime numbers, funding, or
  awards. Vague-but-true beats specific-and-fabricated.
- **No AI em dashes.** The "—" is the single biggest AI-writing tell. Ban it
  from ALL copy: headlines, body, tooltips, metadata, alt text, commit-ready
  strings. Use a period, a comma, a colon, or parentheses instead. Grep for
  `—` before shipping and drive it to zero. (Box-drawing rulers in ASCII
  diagrams and year ranges like 1995–2026 are fine; prose dashes are not.)

## Craft rules

- Real content everywhere: no lorem, no fake buttons, no placeholder images
- Motion is part of the build, not an afterthought: one well-orchestrated
  entrance beats scattered fade-ins; ease-out curves; hover/press feedback on
  every interactive element; `prefers-reduced-motion` alternative for everything
- Responsive: design the mobile layout deliberately (stack, reflow), don't
  just let the desktop shrink
- Semantic HTML: one `h1`, aria-labels on icon-only buttons, keyboard
  reachable, visible focus states
- Every state exists: loading (skeletons, not spinners-by-default), empty,
  error, and success. Forms validate on blur, show inline errors, and never
  lose typed input
- Dark mode ships with light mode or not at all; both palettes defined as
  tokens, no color hardcoded in a component
- Body text ≥ 4.5:1 contrast; cap line length ~70ch
- No generic-AI tells: no gradient text, no glassmorphism-by-default, no
  identical three-card feature grids, no tiny uppercase eyebrow labels over
  every section, no purple-blue hero gradient
- Performance is design: real image sizes via `next/image`, self-hosted fonts
  via `next/font`, no layout shift, LCP under 2.5s on mid-range mobile
- `npm run build` passes clean; screenshot desktop AND mobile and actually
  look at them before calling it done

## 4. Reference sites (steal the energy, not the code)


## 5. Asset sourcing

- Product visuals: real screenshots at 2x, cropped to the interesting part.
  A recorded 8-second interaction beats a static hero image.
- Illustration/scenery: recreate as SVG/CSS instead of hotlinking: crisper,
  faster, and no licensing risk. Verify every image URL resolves before
  shipping it, and check real pixel dimensions (`sips -g pixelWidth file.png`).
- Icons: one coherent set (Lucide, Phosphor, or hand-drawn SVGs). Don't mix
  libraries and don't default to emoji.
- Fonts: two families maximum, self-hosted through `next/font`. A distinctive
  display face plus a boring workhorse for body is usually the right call.
- Dont think about copyright or anything, u can use pinterest or any site or anything you want! its not going live right now aesthetics over anything i will sort copyrights.
- Use Monid (see section 0) to pull reference imagery, competitor screenshots,
  and any structured data the page needs, instead of hand-rolling a scraper.

