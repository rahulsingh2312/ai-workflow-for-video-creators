import { all, id, now, one, run } from "@/lib/server/db";

/**
 * The model gateway. Section 9 asks for one place that handles provider
 * switching, cost limits, model versions, prompts, and structured output, so
 * that swapping a model does not mean rewriting the workflow.
 *
 * Two providers ship:
 *   - `anthropic`, used when ANTHROPIC_API_KEY is set.
 *   - `local`, a deterministic rule-based provider used otherwise.
 *
 * The local provider is not a stub that returns lorem: it applies the same
 * rules the spec describes (absolute wording, source conflicts, sensitive
 * categories, intent classes) so the workflow is genuinely exercised with no
 * key present. Section 8 explicitly allows separate classifiers or rules where
 * they are cheaper to test than a full model call.
 */

export type Provider = "anthropic" | "local";

export function provider(): Provider {
  return process.env.ANTHROPIC_API_KEY ? "anthropic" : "local";
}

export function modelVersion(): string {
  return provider() === "anthropic"
    ? (process.env.TL_MODEL ?? "claude-sonnet-5")
    : "local/rules-1";
}

export type Completion = { text: string; model: string; inputTokens: number; outputTokens: number };

export async function complete(opts: {
  system: string;
  prompt: string;
  maxTokens?: number;
  /** Returned verbatim when no provider key is configured. */
  fallback: string;
}): Promise<Completion> {
  if (provider() === "local") {
    return { text: opts.fallback, model: modelVersion(), inputTokens: 0, outputTokens: 0 };
  }
  const model = modelVersion();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 2000,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    }),
  });
  if (!res.ok) {
    // A failed integration keeps the task visible with a clear error rather
    // than silently substituting something invented.
    throw new Error(`model gateway ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    content: { type: string; text?: string }[];
    usage?: { input_tokens: number; output_tokens: number };
  };
  return {
    text: data.content.map((c) => c.text ?? "").join(""),
    model,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}

/* ── Retrieval ───────────────────────────────────────────────────────────────
   Access is checked at answer time, not at index time. A restricted or expired
   document is unreachable from the moment it changes, whatever the index says.
   -------------------------------------------------------------------------- */

export type Passage = { chunkId: string; documentId: string; name: string; text: string; score: number };

/**
 * Chinese does not put spaces between words, so splitting on whitespace turns a
 * whole question into one token that matches nothing. Latin runs are kept as
 * words; CJK runs are cut into overlapping character pairs, which is the usual
 * way to index Chinese without shipping a segmenter.
 */
export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const run of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
    if (/[㐀-鿿]/.test(run)) {
      if (run.length === 1) out.push(run);
      for (let i = 0; i < run.length - 1; i++) out.push(run.slice(i, i + 2));
    } else if (run.length > 2) {
      out.push(run);
    }
  }
  return [...new Set(out)];
}

export function retrieve(workspaceId: string, query: string, limit = 3): Passage[] {
  const chunks = all<{ id: string; document_id: string; text: string; name_en: string; status: string; access_en: string }>(
    `SELECT k.id, k.document_id, k.text, d.name_en, d.status, d.access_en
       FROM knowledge_chunk k
       JOIN knowledge_document d ON d.id = k.document_id
      WHERE k.workspace_id = ? AND d.status = 'indexed'`,
    workspaceId,
  );
  const terms = tokenize(query);
  if (terms.length === 0) return [];
  return chunks
    .map((c) => {
      const text = c.text.toLowerCase();
      const score = terms.reduce((n, t) => n + (text.includes(t) ? 1 : 0), 0) / terms.length;
      return { chunkId: c.id, documentId: c.document_id, name: c.name_en, text: c.text, score };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* ── The common output contract ─────────────────────────────────────────────
   Section 6. Every agent returns this shape, every time, including failure.
   -------------------------------------------------------------------------- */

export type AgentStatus = "completed" | "needs_review" | "failed" | "blocked";

export type AgentResult<T = unknown> = {
  task_id: string | null;
  workspace_id: string;
  status: AgentStatus;
  payload: T;
  source_refs: string[];
  confidence: number | null;
  confidence_band: "low" | "medium" | "high" | null;
  risk_flags: { level: string; note: string }[];
  human_action_required: boolean;
  model_version: string;
  prompt_version: string;
  created_at: string;
  log_ref: string;
};

export function band(confidence: number | null): "low" | "medium" | "high" | null {
  if (confidence == null) return null;
  return confidence >= 0.85 ? "high" : confidence >= 0.6 ? "medium" : "low";
}

/**
 * Wraps an agent so its result is always contract-shaped, always persisted,
 * and idempotent: the same key returns the stored run instead of doing the
 * work twice. Section 12 asks for retry-safe jobs with no duplicates.
 */
export async function runAgent<T>(
  opts: {
    workspaceId: string;
    taskId?: string | null;
    agent: string;
    promptVersion: string;
    idempotencyKey?: string;
  },
  work: () => Promise<Omit<AgentResult<T>, keyof AgentResult<T>> | {
    status: AgentStatus;
    payload: T;
    source_refs?: string[];
    confidence?: number | null;
    risk_flags?: { level: string; note: string }[];
    human_action_required?: boolean;
  }>,
): Promise<AgentResult<T>> {
  if (opts.idempotencyKey) {
    const prior = one<{ id: string }>("SELECT id FROM agent_run WHERE idempotency_key = ?", opts.idempotencyKey);
    if (prior) return readRun<T>(prior.id)!;
  }

  const runId = id("ar");
  const logRef = `log/${opts.agent}/${runId}`;
  const created = now();
  const model = modelVersion();

  let result: AgentResult<T>;
  try {
    const out = (await work()) as {
      status: AgentStatus;
      payload: T;
      source_refs?: string[];
      confidence?: number | null;
      risk_flags?: { level: string; note: string }[];
      human_action_required?: boolean;
    };
    result = {
      task_id: opts.taskId ?? null,
      workspace_id: opts.workspaceId,
      status: out.status,
      payload: out.payload,
      source_refs: out.source_refs ?? [],
      confidence: out.confidence ?? null,
      confidence_band: band(out.confidence ?? null),
      risk_flags: out.risk_flags ?? [],
      human_action_required: out.human_action_required ?? out.status === "needs_review",
      model_version: model,
      prompt_version: opts.promptVersion,
      created_at: created,
      log_ref: logRef,
    };
  } catch (err) {
    result = {
      task_id: opts.taskId ?? null,
      workspace_id: opts.workspaceId,
      status: "failed",
      payload: { error: String(err instanceof Error ? err.message : err) } as T,
      source_refs: [],
      confidence: null,
      confidence_band: null,
      risk_flags: [],
      human_action_required: true,
      model_version: model,
      prompt_version: opts.promptVersion,
      created_at: created,
      log_ref: logRef,
    };
  }

  run(
    `INSERT INTO agent_run
     (id,workspace_id,task_id,agent,status,payload,source_refs,confidence,confidence_band,risk_flags,
      human_action_required,model_version,prompt_version,log_ref,error,idempotency_key,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    runId,
    opts.workspaceId,
    opts.taskId ?? null,
    opts.agent,
    result.status,
    JSON.stringify(result.payload),
    JSON.stringify(result.source_refs),
    result.confidence,
    result.confidence_band,
    JSON.stringify(result.risk_flags),
    result.human_action_required ? 1 : 0,
    result.model_version,
    result.prompt_version,
    result.log_ref,
    result.status === "failed" ? JSON.stringify(result.payload) : null,
    opts.idempotencyKey ?? null,
    created,
  );

  return result;
}

export function readRun<T>(runId: string): AgentResult<T> | null {
  const r = one<Record<string, string | number | null>>("SELECT * FROM agent_run WHERE id = ?", runId);
  if (!r) return null;
  return {
    task_id: (r.task_id as string) ?? null,
    workspace_id: r.workspace_id as string,
    status: r.status as AgentStatus,
    payload: JSON.parse(r.payload as string) as T,
    source_refs: JSON.parse(r.source_refs as string),
    confidence: (r.confidence as number) ?? null,
    confidence_band: (r.confidence_band as "low" | "medium" | "high") ?? null,
    risk_flags: JSON.parse(r.risk_flags as string),
    human_action_required: Boolean(r.human_action_required),
    model_version: r.model_version as string,
    prompt_version: r.prompt_version as string,
    created_at: r.created_at as string,
    log_ref: r.log_ref as string,
  };
}
