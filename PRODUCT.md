# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: Next.js (App Router) + TypeScript + Tailwind, self-hosted fonts via
`next/font`, images via `next/image`, Motion for animation. Not a free choice:
PROMPT.md's craft rules name `next/image`, `next/font`, and `npm run build`
directly, so the framework was specified by the brief rather than picked.

## Users

Two audiences share one site.

**The buyer / evaluator.** A content operations lead, agency owner, or
personal-brand operator in China who ships short-form video about business,
finance, tech, or policy topics. Their situation: a single unsupported claim in
a 3-minute video is a legal, regulatory, or reputational problem, and their
client conversations already live in Enterprise WeChat. They are evaluating
whether one workspace can replace a chain of docs, group chats, and spreadsheets
without handing publishing rights to a robot.

**The team the product serves,** whose names appear throughout the interface:

- Contributor: creates topics, drafts, and content tasks.
- Reviewer: resolves fact and risk flags, approves topics, locks scripts.
- Producer: receives the locked script, uploads production files.
- Publishing operator: gets the publish package, publishes by hand, records the
  live URL.
- Support or sales user: takes over conversations, reviews leads, records
  follow-up.
- Admin: users, workspaces, sources, models, integrations, risk rules,
  retention.

One person often holds several roles. Every record carries a workspace ID so
clients and personal brands stay isolated.

## Product Purpose

One web workspace that moves a topic to a fact-checked, versioned, locked script,
hands that script to a human video team, prepares a manual publishing package,
runs a grounded AI persona inside Enterprise WeChat, surfaces sales leads, and
feeds performance data back into the next topic.

Success for the MVP: a user carries one content task from topic candidate to a
recorded manual publication without losing a single source reference or version,
and every locked script stays immutable.

## Positioning

The mechanism a neighboring tool cannot honestly copy: this product refuses to
publish. There is no publish button, no scheduler, no simulated click, no
browser RPA, no private platform API. It also refuses to auto-add friends or
send uncontrolled bulk messages, and it refuses to answer legal, money, crisis,
complaint, or partnership messages on its own.

What it does instead is keep the receipts. Every claim maps to an approved
source. Every script version has a parent. A locked version is immutable, and
changing it creates a child version with an author and a reason. A publish
package is bound to the exact script and video versions it was built from, and
goes invalid the moment either one changes.

## Operating Context

- **Required content states,** shared by every screen:
  `NEW → TOPIC_REVIEW → TOPIC_SELECTED → SCRIPT_DRAFT → FACT_REVIEW →
  SCRIPT_LOCKED → PRODUCTION → VIDEO_READY → PUBLISH_PACKAGE_READY →
  PUBLISHED_MANUALLY → ANALYZED`
- **Script default:** 3 to 5 minutes, roughly 1,200 to 1,400 Chinese characters.
  Default structure: question opening, clear analogy, three-part body,
  interactive ending. Configurable per workspace.
- **Risk levels:** `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. HIGH and CRITICAL always
  require a human decision before lock.
- **Default sensitive categories:** company names, partners, listed companies,
  mergers and acquisitions, regulation, money, forecasts, performance claims.
- **AI persona response modes:** `AUTO`, `DRAFT`, `HANDOFF`, `REFUSE`.
  Enterprise WeChat official APIs and approved event callbacks only.
- **Analytics intake:** official APIs where available, CSV or spreadsheet
  export, or manual entry. Collection method is always shown. Missing metrics
  stay missing.
- **Agent output contract,** identical across all eight agents: `task_id`,
  `workspace_id`, `status` (`completed` / `needs_review` / `failed` /
  `blocked`), payload, `source_refs`, confidence, `risk_flags`,
  `human_action_required`, `model_version`, `prompt_version`, `created_at`,
  processing log reference.
- Publishing, recording, and fine editing all happen outside the system, in the
  tools the team already uses.

## Capabilities and Constraints

**In scope for the MVP:** topic discovery and ranking; script generation,
rewriting, and editor feedback; fact checking, risk flags, human review, and
immutable locking; media production handoff through files, comments, and
statuses; per-platform titles, captions, tags, cover copy, and a manual publish
checklist; the Enterprise WeChat AI persona over approved client knowledge; lead
detection, alerting, assignment, and human takeover; performance import, weekly
analysis, and feedback into topic selection; shared workflow states,
permissions, version history, audit logs, and source tracking.

**Explicitly out of scope, and treated as a product stance rather than a gap:**
one-click or automatic publishing to any platform including YouTube; simulated
clicking, browser RPA, or private platform APIs; automatic friend adding or
uncontrolled bulk messaging; any recording, rough-cut, or fine-editing engine;
automatic training on unapproved client data; autonomous replies to high-risk,
low-confidence, legal, financial, complaint, crisis, or partnership messages.

**Model approach:** an existing pretrained LLM behind a model gateway. RAG for
client facts with source references kept at answer time. Prompt and example
conditioning for voice. Optional fine-tuning only after a separate data review
and client approval. Separate classifiers or rules for risk, moderation, lead
intent, and confidence where they are cheaper to test than a full LLM call.
Training a foundation model from scratch is out of scope.

**Undecided, and never to be invented by the site:** product name (must stay
swappable from one config file), company name, pricing, availability date,
customer names, case studies, funding, uptime, accuracy percentages, team size,
and any performance benchmark.

## Brand Commitments

- **The name is configurable.** The user has not chosen one. It lives in a
  single config module with an English and a Chinese form, and every surface
  reads from there. Current working default: `Throughline` / `主线`.
- **Bilingual by construction.** English and 中文 with a header toggle, both
  treated as first-class. Not machine-translated English: the Chinese copy is
  written as Chinese.
- **Copy rules, non-negotiable** (from PROMPT.md): sounds like a person talking;
  contractions and short sentences; no "seamlessly", "empower", "unlock",
  "revolutionize", "cutting-edge", "leverage"; zero em dashes anywhere in prose,
  including metadata and alt text; no invented customers, uptime, funding, or
  awards. Vague-but-true beats specific-and-fabricated.

## Evidence on Hand

- `SPEC.md` (20KB, verbatim conversion of the source PDF) and
  `Short-Form Video AI Agent Platform - MVP Product Specification.pdf`
  (10 pages). This is the entire factual basis for the site.
- **What does not exist and must not be implied:** no running deployment, no
  customers, no logos, no testimonials, no screenshots of a live system, no
  metrics, no press, no pricing page.
- Product interface shown on the site is built as real DOM, recreated from the
  spec's screen list and data model. It is honest illustration of a specified
  product, not a photograph of a shipped one, and copy must never call it a
  screenshot of production.

## Product Principles

1. **Provenance beats speed.** Anything the system asserts carries a link back
   to an approved source, a version, and a person who signed off.
2. **The human is the gate, not the rubber stamp.** HIGH and CRITICAL flags,
   crisis messages, and high-value leads stop the machine and wait.
3. **Refusal is a feature.** The missing publish button, the refused message,
   the un-invented metric: these are the product, and the site should say so
   plainly instead of apologizing for them.
4. **Nothing is invented.** The Analytics Agent shows its collection method and
   leaves missing fields missing. The marketing site holds itself to the same
   standard.
5. **Every client is an island.** Workspace ID on every record, a separate
   retrieval namespace per client and personal brand, restricted and expired
   documents unreachable by any agent.

## Accessibility & Inclusion

- Body text at 4.5:1 or better in both themes; line length capped around 70ch
  for Latin text.
- Keyboard reachable throughout, visible focus states, one `h1` per page,
  aria-labels on icon-only controls.
- A `prefers-reduced-motion` alternative for every animation, not just a global
  kill switch.
- CJK typography treated properly: no synthesized italics, looser line-height
  for Chinese body text, and layouts that survive the width change when the
  language toggles.
