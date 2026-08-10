# Short-Form Video AI Agent Platform

**MVP Product Specification for Development**

> Source: `Short-Form Video AI Agent Platform - MVP Product Specification.pdf` (10 pages), converted to Markdown verbatim.

---

## 1. Product Goal

Build one web workspace that turns a topic into a fact-checked, versioned script, hands the approved script to media production, prepares a manual publishing package, runs a grounded AI persona inside Enterprise WeChat, identifies sales leads, and uses performance data to improve the next topic.

This MVP implements workflow modules 1, 2, 3, the AI persona and lead-identification parts of module 7, and module 8. Video editing and publishing remain human-operated handoffs.

---

## 2. Fixed MVP Scope

### In scope

- Topic discovery and recommendation.
- Script generation, rewriting, and editor feedback.
- Fact checking, risk flags, human review, and immutable script locking.
- Media production handoff through files, comments, and statuses.
- Per-platform titles, captions, tags, cover copy, and a manual publish checklist.
- Enterprise WeChat AI persona using approved client knowledge.
- Lead detection, alerting, assignment, and human takeover.
- Performance-data import, weekly analysis, and feedback to topic selection.
- Shared workflow states, permissions, version history, audit logs, and source tracking.

### Out of scope

- One-click or automatic publishing to any platform, including YouTube.
- Simulated clicking, browser RPA, private platform APIs, or other unofficial publishing methods.
- Automatic friend adding, uncontrolled bulk direct messages, or uncontrolled group messaging.
- A video recording, rough-cut, or fine-editing engine.
- Automatic use of unapproved client or customer data for model training.
- Autonomous replies to high-risk, low-confidence, legal, financial, complaint, crisis, or partnership messages.

---

## 3. Users and Permissions

- **Contributor:** creates topics, drafts, and content tasks.
- **Reviewer:** resolves fact and risk flags, approves topics, and locks scripts.
- **Producer:** receives the locked script and uploads production files.
- **Publishing operator:** receives the publish package, publishes manually, and records the live URL.
- **Support or sales user:** takes over conversations, reviews leads, and records follow-up status.
- **Admin:** manages users, workspaces, sources, model settings, integrations, risk rules, and data retention.

One person may hold several roles. Every record must include a workspace ID so different clients or personal brands remain isolated.

---

## 4. End-to-End Workflow

1. The **Topic Agent** collects approved internal and external inputs and creates source-linked topic candidates.
2. A human accepts, edits, or rejects a candidate. The decision becomes feedback for future ranking.
3. The **Script Agent** creates a draft using the selected topic, approved sources, and the client style profile.
4. The **Fact Check Agent** extracts claims, compares them with approved sources, and creates risk flags.
5. A reviewer resolves every required flag and locks one script version.
6. The producer downloads the locked script, completes production outside the system, and uploads or links the final video.
7. The **Publish Package Agent** creates platform-specific copy and a checklist. The operator publishes manually and records the account, time, and live URL.
8. The **Enterprise WeChat AI persona** answers approved questions, routes risky messages to a human, and creates leads when commercial intent is detected.
9. The **Analytics Agent** imports results, creates a report, and sends approved recommendations back to the Topic Agent.

### Required content states

```
NEW → TOPIC_REVIEW → TOPIC_SELECTED → SCRIPT_DRAFT → FACT_REVIEW →
SCRIPT_LOCKED → PRODUCTION → VIDEO_READY → PUBLISH_PACKAGE_READY →
PUBLISHED_MANUALLY → ANALYZED
```

If a locked script changes, the system must create a new script version. Any publish package tied to the older version becomes invalid and must be regenerated.

---

## 5. Main Product Screens

- **Dashboard:** work waiting for review, recent leads, failed jobs, and weekly performance.
- **Topic Inbox:** ranked topic candidates with sources, scores, risks, and approve or reject controls.
- **Content Task:** script versions, claim map, risk flags, comments, approvals, files, and current state.
- **Knowledge Base:** client documents, access level, source status, version, and ingestion status.
- **Publish Package:** final video reference, titles, captions, tags, cover brief, checklist, and live URL form.
- **Conversations:** AI answers, internal source citations, confidence, takeover status, and assigned human.
- **Leads:** intent, score, source message, owner, status, and follow-up history.
- **Analytics:** imported metrics, comparisons, report history, and approved recommendations.
- **Admin:** users, roles, sources, schedules, models, prompts, thresholds, integrations, and retention rules.

---

## 6. Shared Data Model

- **ContentTask:** workspace, owner, topic, target platforms, current state, and active versions.
- **Source:** URL or file reference, publisher, date, trust level, permissions, and last check.
- **ScriptVersion:** content, author, model and prompt version, source map, status, and parent version.
- **RiskFlag:** claim, category, severity, reason, source evidence, resolution, reviewer, and timestamp.
- **MediaAsset:** file reference, type, version, uploader, and production status.
- **PublishPackage:** script version, platform, generated copy, checklist, status, and live URL.
- **KnowledgeDocument:** client, access level, document version, ingestion status, and retention rule.
- **Conversation:** channel, participant, message, AI answer, sources, confidence, and takeover state.
- **Lead:** contact reference, source message, intent, score, owner, status, and follow-up history.
- **MetricSnapshot:** platform, account, content, collection method, date range, and raw metrics.

All core records need ID, workspace ID, created time, updated time, creator, status, and version or revision fields.

### Common agent output contract

- `task_id` and `workspace_id`.
- `status`: `completed`, `needs_review`, `failed`, or `blocked`.
- output payload.
- `source_refs` used for the result.
- confidence score or confidence band.
- `risk_flags`.
- `human_action_required`.
- `model_version` and `prompt_version`.
- `created_at` and processing log reference.

---

## 7. Agent Modules

### 7.1 Topic Agent

- **Purpose:** Create a short ranked list of usable topics with evidence.
- **Trigger:** Configurable schedule, with weekday 09:00 in the client timezone as the default, plus manual run.
- **Inputs:** Internal topic library, historical content, approved news and business sources, approved community sources, client keywords, banned topics, and past performance.
- **Agent work:** Collect, normalize, deduplicate, summarize the core facts, score relevance and fit, attach source links, and add risk flags.
- **Output:** Topic title, angle, reason to publish now, fact summary, score with reason, source references, and risk flags.
- **Human action:** Accept, edit, reject, or request more research. Store the action and reason as ranking feedback.

### 7.2 Script Agent

- **Purpose:** Turn an approved topic into an editable spoken-video script.
- **Inputs:** Selected topic, approved sources, content brief, client style profile, approved examples, target platform, and target length.
- **Default format:** A 3–5 minute script, roughly 1,200–1,400 Chinese characters, with workspace-level configuration.
- **Agent work:** Write in a conversational voice, follow the approved structure, keep a claim-to-source map, and support full or selected-section rewrites.
- **Default structure:** Question opening, clear analogy, three-part body, and interactive ending.
- **Output:** Script draft, source map, word or character count, style checks, and unresolved questions.
- **Human action:** Edit directly, comment, accept a rewrite, or return the draft for another pass. Every saved change creates a new version.

### 7.3 Fact Check and Script Lock

- **Purpose:** Stop unsupported or risky claims from entering production.
- **Inputs:** Script version, claim-to-source map, approved source list, client risk policy, and language rules.
- **Agent work:** Extract factual claims and flag conflicts, missing evidence, old information, absolute wording, sensitive language, and policy risks.
- **Default sensitive categories:** Company names, partners, listed companies, mergers and acquisitions, regulation, money, forecasts, and performance claims.
- **Risk levels:** `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL`. HIGH and CRITICAL always require a human decision.
- **Human action:** Approve the claim, dismiss the flag with a reason, revise the script, or add an approved source.
- **Lock rule:** A locked version is immutable. Any later change creates a child version and records who changed what and why.
- **Output:** Locked script version, resolved flag list, reviewer identity, approval time, and audit log.

### 7.4 Media Production Handoff

- **Purpose:** Move the approved script to the human video team without building an editing engine.
- **System work:** Export the locked script and asset brief, accept file uploads or storage links, collect comments, and track production status.
- **Human action:** Record and edit the video in existing tools, then upload or link the final video.
- **Output:** Final video reference tied to one locked script version.

### 7.5 Manual Publish Package

- **Purpose:** Prepare everything the operator needs to publish manually.
- **Inputs:** Final video reference, locked script, chosen platforms, account profile, and configurable platform rules.
- **Agent work:** Generate title options, caption, tags or hashtags, cover copy, cover brief, and a publish checklist for each platform.
- **Human action:** Copy or download the package, publish in the official platform app or website, and record the account, publish time, and live URL.
- **Hard rule:** The product has no publish, distribute, schedule-to-platform, or simulated-click button.
- **Invalidation rule:** A new locked script or final video version invalidates the current package.

### 7.6 Enterprise WeChat AI Persona

- **Purpose:** Answer approved questions in the client voice while protecting the person and the company.
- **Integration:** Use Enterprise WeChat official APIs and approved event callbacks only.
- **Inputs:** Incoming message, conversation context, approved knowledge index, persona style profile, reply policy, and risk rules.
- **Agent work:** Retrieve approved passages, draft an answer, store internal source citations, calculate confidence, and choose a response mode.
- **Response modes:** `AUTO` for low-risk grounded answers, `DRAFT` for human approval, `HANDOFF` for human takeover, and `REFUSE` when the request is disallowed.
- **Default takeover triggers:** Low confidence, missing source, complaint, negative publicity, legal or regulatory issue, money, personal data, partnership request, crisis, or user request for a person.
- **Output:** Answer or draft, source references, confidence, selected mode, risk flags, and takeover record.
- **Hard rule:** No automatic friend adding or uncontrolled mass messaging.

### 7.7 Lead Detection

- **Purpose:** Find commercial intent and move it to a human before the opportunity is lost.
- **Inputs:** Enterprise WeChat messages and other comments or messages available through official APIs or approved imports.
- **Agent work:** Classify intent, extract the reason for interest, score the lead, attach the source message, and check for duplicates.
- **Default intent examples:** Cooperation, purchase request, consultation, service request, speaking invitation, investment, or media request.
- **Output:** Lead record with channel, contact reference, source message, intent, score, status, owner, and notification record.
- **Human action:** Accept or reject the lead, assign an owner, record follow-up, and close with an outcome.
- **Takeover rule:** High-value intent pauses automatic conversation replies until a human decides what to send.

### 7.8 Analytics Agent

- **Purpose:** Show what worked and improve the next topic cycle.
- **Inputs:** Official analytics APIs where available, CSV or spreadsheet exports, manual entry when needed, content IDs, and recorded live URLs.
- **Core metrics:** Views, likes, shares, completion rate, like rate, share rate, follower adds, group joins, group exits, group activity, and leads.
- **Agent work:** Validate imported data, calculate derived rates, compare topics, show trends, and write evidence-linked recommendations.
- **Output:** Weekly and on-demand reports, metric snapshots, topic comparisons, anomalies, and next-topic recommendations.
- **Feedback rule:** Only approved recommendations change Topic Agent ranking or source weights.
- **Hard rule:** Do not invent missing metrics. Show the collection method and missing fields.

---

## 8. Client Data and Model Strategy

Use an existing pretrained LLM through a model gateway. Client data should improve answers through retrieval, style examples, and optional fine-tuning after a separate data review. Training a foundation model from scratch is outside this MVP.

### Data that can improve the system

- Approved Word documents, PDFs, articles, speeches, transcripts, research reports, FAQs, product documents, and historical scripts.
- Approved examples of the client's tone, structure, preferred phrases, and forbidden language.
- Editor changes, accepted drafts, rejected drafts, fact corrections, and lead outcomes.
- Historical topic and performance data.

### Default model approach

- **RAG** for client facts and private knowledge. The answer must retrieve approved passages at run time and keep source references.
- **Prompt and example conditioning** for voice, structure, and format.
- **Optional fine-tuning** only when the client has enough clean, approved examples and a clear quality target.
- **Separate classifiers or rules** for risk, moderation, lead intent, and confidence when they are cheaper or easier to test than a full LLM call.

### Knowledge ingestion

```
Upload → parse or OCR → add metadata and permissions → review → chunk → embed →
index → publish to the approved knowledge set
```

- Each document has client, owner, type, date, version, access level, approval status, and retention rule.
- Restricted or expired documents cannot be retrieved by an agent.
- New document versions do not silently overwrite old evidence used by past outputs.
- Each client and personal brand uses a separate retrieval namespace.

### Learning from feedback

- Store editor changes, approval decisions, fact corrections, answer outcomes, and lead outcomes as structured feedback.
- Use feedback to update prompts, examples, retrieval ranking, and test cases.
- Do not add private chats or rejected content to a training set automatically.
- Require client approval before any data is used for fine-tuning.
- Record the model, prompt, knowledge version, and source set used for every generated result.

---

## 9. Recommended System Architecture

```
Web app → Backend API → Workflow service → Agent module →
Model gateway and RAG service → Human approval → Versioned result
```

- **Web app** for the screens and approval actions.
- **Backend API** for authentication, permissions, workflow state, and client-facing endpoints.
- **Workflow service and job queue** for scheduled, retryable, long-running agent tasks.
- **Model gateway** for provider switching, cost limits, model versions, prompts, and structured outputs.
- **Knowledge service** with document parsing, embeddings, retrieval, access filters, and source citations.
- **Relational database** for workflow records, versions, leads, conversations, and metrics.
- **Object storage** for client files, scripts, exports, and media references.
- **Integration workers** for Enterprise WeChat, analytics imports, notifications, and optional CRM sync.
- **Monitoring** for failures, latency, token cost, model quality, retrieval quality, and human overrides.

Keep each agent behind a stable input and output interface so one model or tool can be replaced without rewriting the full workflow.

---

## 10. Integrations

### Required

- LLM and embedding provider through the model gateway.
- Database, object storage, and vector search.
- Enterprise WeChat official API for the AI persona, event intake, notifications, and handoff.

### Optional

- Approved internal topic library and external content-source connectors.
- CRM or sales system for lead sync.
- Email, Enterprise WeChat, DingTalk, or another approved notification channel.
- Official platform analytics APIs where access is available.
- CSV, spreadsheet, or manual import for analytics when an API is unavailable.

Publishing integrations are not required.

---

## 11. Admin Configuration

- Client workspace, personal brand, users, and roles.
- Topic schedule, timezone, sources, keywords, banned topics, and ranking weights.
- Script length, language, structure, persona style, examples, and forbidden phrases.
- Trusted source list, sensitive categories, risk levels, and required reviewers.
- Knowledge document access, approval status, version, and retention.
- AI persona response modes, confidence threshold, takeover rules, and sampling review rate.
- Lead intents, score threshold, notification destination, owner, and status list.
- Target platforms and manual publish-package templates.
- Analytics fields, import method, report frequency, and comparison rules.
- Model choice, prompt version, token and cost limits, retry policy, and fallback model.

---

## 12. Security, Audit, and Failure Rules

- Use role-based access and client-level data isolation.
- Encrypt data in transit and at rest.
- Store an audit event for generation, edit, review, lock, handoff, publish record, AI reply, takeover, and lead status change.
- Show who changed a record, when it changed, the previous version, and the reason when required.
- Keep client-configurable retention and deletion rules for documents, chats, contact data, and leads.
- Use retry-safe jobs and prevent duplicate topics, replies, leads, and metric imports.
- If an integration fails, keep the task visible with a clear error and a manual fallback.
- If a crisis or high-value lead is detected, pause the AI reply and notify the assigned human.
- Never expose API keys, private source text, or internal citations to unauthorized users.

---

## 13. Client Inputs Needed for Setup

- Approved scripts, articles, speeches, transcripts, research reports, FAQs, product documents, and historical Word or PDF files.
- A style guide or approved examples showing how the client should and should not sound.
- Trusted sources, blocked sources, sensitive topics, forbidden claims, and required disclaimers.
- Enterprise WeChat app access, callback setup, test account, and approved message scenarios.
- Historical performance exports and a mapping between content, platform account, and live URL.
- Sample leads, non-leads, complaints, crisis messages, and desired human handoff behavior.
- Target platforms and required fields for each manual publish package.
- User roles, data-access rules, retention rules, and deletion requirements.

---

## 14. MVP Completion Criteria

- A user can move one content task from topic candidate to a recorded manual publication without losing source or version history.
- Every topic candidate shows source references and a ranking reason.
- Every script version is traceable, and every locked version is immutable.
- Every required risk flag has a human resolution before lock.
- The manual publish package is tied to the exact script and video versions used.
- Client documents can be ingested, approved, retrieved, versioned, and removed from the active knowledge set.
- The Enterprise WeChat AI persona answers grounded low-risk questions and hands off risky or low-confidence questions.
- A detected lead can be reviewed, assigned, followed up, and closed.
- Analytics can be imported without publishing access, and approved recommendations return to topic selection.
- The system has no one-click or automatic distribution function.
