/*
  The schema, as a bundled string.

  It used to be read from schema.sql at runtime, which works on a real server
  and fails in a serverless bundle where lib/ was never shipped. Kept in sync
  with schema.sql by scripts/sync-schema.mjs.
*/

export const SCHEMA = String.raw`-- The shared data model from the specification, section 6.
-- Every core record carries id, workspace_id, created_at, updated_at, created_by,
-- status, and a version or revision field. That is a rule, not a convention:
-- the isolation and audit guarantees depend on it.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspace (
  id            TEXT PRIMARY KEY,
  name_en       TEXT NOT NULL,
  name_zh       TEXT NOT NULL,
  timezone      TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  created_by    TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  revision      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS app_user (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL
);

-- One person may hold several roles. The audit log records which one they used.
CREATE TABLE IF NOT EXISTS membership (
  user_id      TEXT NOT NULL REFERENCES app_user(id),
  workspace_id TEXT NOT NULL REFERENCES workspace(id),
  role         TEXT NOT NULL CHECK (role IN
                 ('contributor','reviewer','producer','publisher','support','admin')),
  PRIMARY KEY (user_id, workspace_id, role)
);

-- Workspace-scoped configuration. Section 11.
CREATE TABLE IF NOT EXISTS config (
  workspace_id TEXT NOT NULL REFERENCES workspace(id),
  key          TEXT NOT NULL,
  value        TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  updated_by   TEXT,
  PRIMARY KEY (workspace_id, key)
);

CREATE TABLE IF NOT EXISTS source (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL REFERENCES workspace(id),
  label_en      TEXT NOT NULL,
  label_zh      TEXT NOT NULL,
  url           TEXT,
  file_ref      TEXT,
  publisher     TEXT,
  published_at  TEXT,
  trust         TEXT NOT NULL CHECK (trust IN ('high','medium','low')),
  permissions   TEXT NOT NULL DEFAULT 'approved',
  last_check    TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  created_by    TEXT,
  status        TEXT NOT NULL DEFAULT 'approved',
  revision      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS topic_candidate (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL REFERENCES workspace(id),
  run_id          TEXT NOT NULL,
  title_en        TEXT NOT NULL,
  title_zh        TEXT NOT NULL,
  angle_en        TEXT NOT NULL,
  angle_zh        TEXT NOT NULL,
  why_en          TEXT NOT NULL,
  why_zh          TEXT NOT NULL,
  fact_summary_en TEXT,
  fact_summary_zh TEXT,
  score           INTEGER NOT NULL,
  reason_en       TEXT NOT NULL,
  reason_zh       TEXT NOT NULL,
  decision        TEXT CHECK (decision IN ('accepted','rejected','more_research')),
  decision_reason TEXT,
  decided_by      TEXT REFERENCES app_user(id),
  decided_at      TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  created_by      TEXT,
  status          TEXT NOT NULL DEFAULT 'open',
  revision        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS candidate_source (
  candidate_id TEXT NOT NULL REFERENCES topic_candidate(id),
  source_id    TEXT NOT NULL REFERENCES source(id),
  PRIMARY KEY (candidate_id, source_id)
);

CREATE TABLE IF NOT EXISTS candidate_risk (
  id           TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES topic_candidate(id),
  level        TEXT NOT NULL CHECK (level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  note_en      TEXT NOT NULL,
  note_zh      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_task (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL REFERENCES workspace(id),
  candidate_id  TEXT REFERENCES topic_candidate(id),
  title_en      TEXT NOT NULL,
  title_zh      TEXT NOT NULL,
  platforms     TEXT NOT NULL DEFAULT '[]',
  state         TEXT NOT NULL,
  owner_id      TEXT REFERENCES app_user(id),
  producer_id   TEXT REFERENCES app_user(id),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  created_by    TEXT,
  status        TEXT NOT NULL DEFAULT 'open',
  revision      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS task_source (
  task_id   TEXT NOT NULL REFERENCES content_task(id),
  source_id TEXT NOT NULL REFERENCES source(id),
  PRIMARY KEY (task_id, source_id)
);

-- A locked version is immutable. The application layer refuses to update one,
-- and this trigger refuses too, so a bug in the app cannot quietly rewrite
-- evidence that a person already signed for.
CREATE TABLE IF NOT EXISTS script_version (
  id             TEXT PRIMARY KEY,
  workspace_id   TEXT NOT NULL REFERENCES workspace(id),
  task_id        TEXT NOT NULL REFERENCES content_task(id),
  parent_id      TEXT REFERENCES script_version(id),
  label          TEXT NOT NULL,
  body           TEXT NOT NULL,
  chars          INTEGER NOT NULL,
  author_id      TEXT REFERENCES app_user(id),
  author_label   TEXT NOT NULL,
  note_en        TEXT NOT NULL DEFAULT '',
  note_zh        TEXT NOT NULL DEFAULT '',
  model_version  TEXT,
  prompt_version TEXT,
  locked_by      TEXT REFERENCES app_user(id),
  locked_at      TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  created_by     TEXT,
  status         TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','in_review','locked','superseded')),
  revision       INTEGER NOT NULL DEFAULT 1
);

CREATE TRIGGER IF NOT EXISTS script_version_immutable
BEFORE UPDATE OF body, chars, parent_id ON script_version
WHEN OLD.status = 'locked'
BEGIN
  SELECT RAISE(ABORT, 'locked script version is immutable: create a child version');
END;

CREATE TABLE IF NOT EXISTS claim_map (
  id         TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES script_version(id),
  claim      TEXT NOT NULL,
  source_id  TEXT REFERENCES source(id),
  offset_start INTEGER,
  offset_end   INTEGER
);

CREATE TABLE IF NOT EXISTS risk_flag (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL REFERENCES workspace(id),
  version_id        TEXT NOT NULL REFERENCES script_version(id),
  level             TEXT NOT NULL CHECK (level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  category_en       TEXT NOT NULL,
  category_zh       TEXT NOT NULL,
  claim_en          TEXT NOT NULL,
  claim_zh          TEXT NOT NULL,
  reason_en         TEXT NOT NULL,
  reason_zh         TEXT NOT NULL,
  evidence_en       TEXT NOT NULL,
  evidence_zh       TEXT NOT NULL,
  source_id         TEXT REFERENCES source(id),
  resolution        TEXT CHECK (resolution IN ('approved','dismissed','revised','sourced')),
  resolution_reason TEXT,
  resolved_by       TEXT REFERENCES app_user(id),
  resolved_at       TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  created_by        TEXT,
  status            TEXT NOT NULL DEFAULT 'open',
  revision          INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS media_asset (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL REFERENCES workspace(id),
  task_id           TEXT NOT NULL REFERENCES content_task(id),
  script_version_id TEXT NOT NULL REFERENCES script_version(id),
  kind              TEXT NOT NULL,
  ref               TEXT NOT NULL,
  label             TEXT NOT NULL,
  uploader_id       TEXT REFERENCES app_user(id),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  created_by        TEXT,
  status            TEXT NOT NULL DEFAULT 'delivered',
  revision          INTEGER NOT NULL DEFAULT 1
);

-- A package is bound to the exact pair it was built from. When either changes,
-- status goes to 'invalid' and it has to be regenerated.
CREATE TABLE IF NOT EXISTS publish_package (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL REFERENCES workspace(id),
  task_id           TEXT NOT NULL REFERENCES content_task(id),
  script_version_id TEXT NOT NULL REFERENCES script_version(id),
  media_asset_id    TEXT NOT NULL REFERENCES media_asset(id),
  platform          TEXT NOT NULL,
  payload           TEXT NOT NULL,
  account           TEXT,
  published_at      TEXT,
  live_url          TEXT,
  recorded_by       TEXT REFERENCES app_user(id),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  created_by        TEXT,
  status            TEXT NOT NULL DEFAULT 'ready'
                      CHECK (status IN ('ready','invalid','published')),
  revision          INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS knowledge_document (
  id             TEXT PRIMARY KEY,
  workspace_id   TEXT NOT NULL REFERENCES workspace(id),
  name_en        TEXT NOT NULL,
  name_zh        TEXT NOT NULL,
  type_en        TEXT NOT NULL,
  type_zh        TEXT NOT NULL,
  doc_version    TEXT NOT NULL,
  access_en      TEXT NOT NULL,
  access_zh      TEXT NOT NULL,
  retention_rule TEXT NOT NULL DEFAULT 'default',
  expires_at     TEXT,
  ingest_stage   TEXT NOT NULL DEFAULT 'uploaded',
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  created_by     TEXT,
  status         TEXT NOT NULL DEFAULT 'review'
                   CHECK (status IN ('review','indexed','restricted','expired')),
  revision       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS knowledge_chunk (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id),
  document_id  TEXT NOT NULL REFERENCES knowledge_document(id),
  ordinal      INTEGER NOT NULL,
  text         TEXT NOT NULL,
  embedding    TEXT
);

CREATE TABLE IF NOT EXISTS conversation (
  id             TEXT PRIMARY KEY,
  workspace_id   TEXT NOT NULL REFERENCES workspace(id),
  channel        TEXT NOT NULL DEFAULT 'wecom',
  participant    TEXT NOT NULL,
  message        TEXT NOT NULL,
  ai_answer      TEXT,
  sources        TEXT NOT NULL DEFAULT '[]',
  confidence     REAL,
  mode           TEXT CHECK (mode IN ('AUTO','DRAFT','HANDOFF','REFUSE')),
  trigger_reason TEXT,
  takeover_state TEXT NOT NULL DEFAULT 'none'
                   CHECK (takeover_state IN ('none','requested','taken')),
  owner_id       TEXT REFERENCES app_user(id),
  external_id    TEXT UNIQUE,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  created_by     TEXT,
  status         TEXT NOT NULL DEFAULT 'open',
  revision       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS lead (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL REFERENCES workspace(id),
  conversation_id TEXT REFERENCES conversation(id),
  contact         TEXT NOT NULL,
  contact_ref     TEXT,
  intent          TEXT NOT NULL,
  score           INTEGER NOT NULL,
  owner_id        TEXT REFERENCES app_user(id),
  notified_at     TEXT,
  outcome         TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  created_by      TEXT,
  status          TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','accepted','rejected','following','closed')),
  revision        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS lead_followup (
  id         TEXT PRIMARY KEY,
  lead_id    TEXT NOT NULL REFERENCES lead(id),
  note       TEXT NOT NULL,
  actor_id   TEXT REFERENCES app_user(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS metric_snapshot (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL REFERENCES workspace(id),
  task_id           TEXT REFERENCES content_task(id),
  platform          TEXT NOT NULL,
  account           TEXT NOT NULL,
  collection_method TEXT NOT NULL CHECK (collection_method IN ('api','csv','manual')),
  period_start      TEXT NOT NULL,
  period_end        TEXT NOT NULL,
  metrics           TEXT NOT NULL,
  missing_fields    TEXT NOT NULL DEFAULT '[]',
  import_key        TEXT UNIQUE,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  created_by        TEXT,
  status            TEXT NOT NULL DEFAULT 'imported',
  revision          INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS recommendation (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id),
  text_en      TEXT NOT NULL,
  text_zh      TEXT NOT NULL,
  evidence_en  TEXT NOT NULL,
  evidence_zh  TEXT NOT NULL,
  effect       TEXT NOT NULL,
  decision     TEXT CHECK (decision IN ('approved','rejected')),
  decided_by   TEXT REFERENCES app_user(id),
  decided_at   TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  created_by   TEXT,
  status       TEXT NOT NULL DEFAULT 'open',
  revision     INTEGER NOT NULL DEFAULT 1
);

-- Section 12: an audit event for generation, edit, review, lock, handoff,
-- publish record, AI reply, takeover, and lead status change.
CREATE TABLE IF NOT EXISTS audit_event (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id),
  actor_id     TEXT,
  actor_role   TEXT,
  action       TEXT NOT NULL,
  entity       TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  before       TEXT,
  after        TEXT,
  reason       TEXT,
  created_at   TEXT NOT NULL
);

-- Every agent run, with the common output contract stored verbatim.
CREATE TABLE IF NOT EXISTS agent_run (
  id                    TEXT PRIMARY KEY,
  workspace_id          TEXT NOT NULL REFERENCES workspace(id),
  task_id               TEXT,
  agent                 TEXT NOT NULL,
  status                TEXT NOT NULL
                          CHECK (status IN ('completed','needs_review','failed','blocked')),
  payload               TEXT NOT NULL DEFAULT '{}',
  source_refs           TEXT NOT NULL DEFAULT '[]',
  confidence            REAL,
  confidence_band       TEXT,
  risk_flags            TEXT NOT NULL DEFAULT '[]',
  human_action_required INTEGER NOT NULL DEFAULT 0,
  model_version         TEXT NOT NULL,
  prompt_version        TEXT NOT NULL,
  log_ref               TEXT NOT NULL,
  error                 TEXT,
  idempotency_key       TEXT UNIQUE,
  created_at            TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_ws        ON content_task(workspace_id, state);
CREATE INDEX IF NOT EXISTS idx_version_task   ON script_version(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_flag_version   ON risk_flag(version_id, level, resolution);
CREATE INDEX IF NOT EXISTS idx_pkg_task       ON publish_package(task_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_ws       ON audit_event(workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conv_ws        ON conversation(workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lead_ws        ON lead(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_metric_ws      ON metric_snapshot(workspace_id, period_end);
CREATE INDEX IF NOT EXISTS idx_run_ws         ON agent_run(workspace_id, created_at);
`;
