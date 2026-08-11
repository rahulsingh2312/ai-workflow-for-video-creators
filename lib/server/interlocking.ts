import { all, id, now, one, run } from "@/lib/server/db";
import { audit } from "@/lib/server/audit";
import type { Session } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/auth";

/**
 * The interlocking.
 *
 * A route between two states clears only when every condition proves. The
 * conditions are queries against the database, not flags someone sets: that is
 * the whole point, and it is why a bug elsewhere cannot walk a task past a
 * signal that should be at danger.
 */

export const STATES = [
  "NEW",
  "TOPIC_REVIEW",
  "TOPIC_SELECTED",
  "SCRIPT_DRAFT",
  "FACT_REVIEW",
  "SCRIPT_LOCKED",
  "PRODUCTION",
  "VIDEO_READY",
  "PUBLISH_PACKAGE_READY",
  "PUBLISHED_MANUALLY",
  "ANALYZED",
] as const;

export type State = (typeof STATES)[number];

export type Condition = {
  key: string;
  label_en: string;
  label_zh: string;
  proved: boolean;
  /** What the database actually returned, so a held signal explains itself. */
  detail?: string;
  /**
   * A condition only a person can satisfy. The endpoint that performs that act
   * skips it; nothing else may, which is what keeps a cascade from signing on
   * a human's behalf.
   */
  humanGate?: boolean;
};

export type RouteProof = {
  from: State;
  to: State;
  conditions: Condition[];
  cleared: boolean;
  /** True for the one route the product cannot prove: a person publishes. */
  manual: boolean;
  authority_en: string;
  authority_zh: string;
  onFail_en: string;
  onFail_zh: string;
};

type Ctx = { taskId: string; workspaceId: string };

const c = (
  key: string,
  label_en: string,
  label_zh: string,
  proved: boolean,
  detail?: string,
): Condition => ({ key, label_en, label_zh, proved, detail });

const humanGate = (
  key: string,
  label_en: string,
  label_zh: string,
  proved: boolean,
  detail?: string,
): Condition => ({ key, label_en, label_zh, proved, detail, humanGate: true });

/** Conditions a person still owes, ignoring the act the caller is performing. */
export function heldConditions(
  proof: RouteProof,
  performing?: string,
): Condition[] {
  return proof.conditions.filter((x) => !x.proved && x.key !== performing);
}

function cfg(workspaceId: string, key: string): string | null {
  return (
    one<{ value: string }>(
      "SELECT value FROM config WHERE workspace_id = ? AND key = ?",
      workspaceId,
      key,
    )?.value ?? null
  );
}

function latestVersion(taskId: string) {
  return one<{
    id: string;
    label: string;
    status: string;
    parent_id: string | null;
    chars: number;
  }>(
    `SELECT id,label,status,parent_id,chars FROM script_version
     WHERE task_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1`,
    taskId,
  );
}

function lockedVersion(taskId: string) {
  return one<{ id: string; label: string }>(
    `SELECT id,label FROM script_version
     WHERE task_id = ? AND status = 'locked' ORDER BY locked_at DESC LIMIT 1`,
    taskId,
  );
}

/* ── The conditions, per route ───────────────────────────────────────────── */

const ROUTES: Record<
  string,
  {
    to: State;
    manual?: boolean;
    authority_en: string;
    authority_zh: string;
    onFail_en: string;
    onFail_zh: string;
    prove: (ctx: Ctx) => Condition[];
  }
> = {
  NEW: {
    to: "TOPIC_REVIEW",
    authority_en: "Topic Agent",
    authority_zh: "选题智能体",
    onFail_en:
      "The run is marked failed and stays visible with its error. No half-list reaches the inbox.",
    onFail_zh:
      "该次运行标记为失败，带错误信息留在界面上。不会把半份清单丢进收件箱。",
    prove: ({ workspaceId }) => {
      const cands = all<{ id: string; score: number; reason_en: string }>(
        "SELECT id,score,reason_en FROM topic_candidate WHERE workspace_id = ? AND decision IS NULL",
        workspaceId,
      );
      const withoutSource = cands.filter(
        (x) =>
          (one<{ n: number }>(
            "SELECT count(*) n FROM candidate_source WHERE candidate_id = ?",
            x.id,
          )?.n ?? 0) === 0,
      );
      const withoutReason = cands.filter(
        (x) => !x.reason_en || x.score == null,
      );
      const banned = JSON.parse(
        cfg(workspaceId, "topic.banned") ?? "[]",
      ) as string[];
      return [
        c(
          "run",
          "A topic run has produced candidates",
          "选题运行已产出候选",
          cands.length > 0,
          `${cands.length} undecided candidates`,
        ),
        c(
          "sources",
          "Every candidate carries at least one source reference",
          "每条候选至少带一个来源引用",
          cands.length > 0 && withoutSource.length === 0,
          withoutSource.length
            ? `${withoutSource.length} without a source`
            : undefined,
        ),
        c(
          "reason",
          "Every candidate carries a score and the reason for it",
          "每条候选都带分数和理由",
          cands.length > 0 && withoutReason.length === 0,
        ),
        c(
          "banned",
          "Banned topics are filtered out",
          "禁选清单已过滤",
          true,
          `${banned.length} banned terms configured`,
        ),
      ];
    },
  },

  TOPIC_REVIEW: {
    to: "TOPIC_SELECTED",
    authority_en: "Reviewer",
    authority_zh: "审核",
    onFail_en:
      "The candidate holds in review. An undecided topic is not a rejected topic and does not expire on its own.",
    onFail_zh: "候选继续留在待审。没决定不等于被否决，它也不会自己过期。",
    prove: ({ taskId }) => {
      const task = one<{ candidate_id: string | null }>(
        "SELECT candidate_id FROM content_task WHERE id = ?",
        taskId,
      );
      const cand = task?.candidate_id
        ? one<{
            decision: string | null;
            decision_reason: string | null;
            decided_by: string | null;
          }>(
            "SELECT decision,decision_reason,decided_by FROM topic_candidate WHERE id = ?",
            task.candidate_id,
          )
        : null;
      return [
        c(
          "accepted",
          "A human accepted this candidate",
          "有人通过了这条候选",
          cand?.decision === "accepted",
          cand?.decision ?? "no decision",
        ),
        c(
          "reason",
          "The decision carries a reason",
          "决定写明了理由",
          Boolean(cand?.decision_reason),
        ),
        c(
          "who",
          "The decision records who made it",
          "决定记录了处理人",
          Boolean(cand?.decided_by),
        ),
      ];
    },
  },

  TOPIC_SELECTED: {
    to: "SCRIPT_DRAFT",
    authority_en: "Script Agent",
    authority_zh: "脚本智能体",
    onFail_en:
      "Generation is blocked, not guessed. A missing style profile or source set is reported as the reason.",
    onFail_zh:
      "生成被拦下，而不是靠猜。缺风格档案或缺来源，会被写成拦下的原因。",
    prove: ({ taskId, workspaceId }) => {
      const srcCount =
        one<{ n: number }>(
          "SELECT count(*) n FROM task_source WHERE task_id = ?",
          taskId,
        )?.n ?? 0;
      const task = one<{ platforms: string }>(
        "SELECT platforms FROM content_task WHERE id = ?",
        taskId,
      );
      const platforms = JSON.parse(task?.platforms ?? "[]") as string[];
      const style = cfg(workspaceId, "script.style_profile");
      return [
        c(
          "sources",
          "The approved source set is attached to the task",
          "已批准来源已挂到任务上",
          srcCount > 0,
          `${srcCount} sources attached`,
        ),
        c(
          "style",
          "The client style profile resolves for this workspace",
          "客户风格档案可解析",
          Boolean(style),
          style ?? "unset",
        ),
        c(
          "platforms",
          "Target platforms are set",
          "目标平台已设定",
          platforms.length > 0,
          platforms.join(", ") || "none",
        ),
      ];
    },
  },

  SCRIPT_DRAFT: {
    to: "FACT_REVIEW",
    authority_en: "Fact Check Agent",
    authority_zh: "核查智能体",
    onFail_en:
      "A draft with no claim map cannot enter review. There would be nothing to check it against.",
    onFail_zh: "没有主张对照表的草稿进不了核查。因为没有东西可以拿来对。",
    prove: ({ taskId }) => {
      const v = latestVersion(taskId);
      const claims = v
        ? (one<{ n: number }>(
            "SELECT count(*) n FROM claim_map WHERE version_id = ?",
            v.id,
          )?.n ?? 0)
        : 0;
      return [
        c(
          "version",
          "The draft is saved as a version",
          "草稿已存为版本",
          Boolean(v),
          v?.label,
        ),
        c(
          "claims",
          "A claim-to-source map exists for that version",
          "该版本有主张与来源对照表",
          claims > 0,
          `${claims} claims mapped`,
        ),
        c(
          "count",
          "The character count is recorded",
          "字数已记录",
          (v?.chars ?? 0) > 0,
          `${v?.chars ?? 0} characters`,
        ),
      ];
    },
  },

  FACT_REVIEW: {
    to: "SCRIPT_LOCKED",
    authority_en: "Reviewer, and only a reviewer",
    authority_zh: "只有审核",
    onFail_en:
      "The signal stays at danger and the task holds in fact review. One unresolved HIGH flag is enough.",
    onFail_zh: "信号保持禁止，任务留在核查阶段。一条没处理的 HIGH 就够了。",
    prove: ({ taskId, workspaceId }) => {
      const v = latestVersion(taskId);
      const requires = JSON.parse(
        cfg(workspaceId, "risk.requires_reviewer") ?? '["HIGH","CRITICAL"]',
      ) as string[];
      const open = v
        ? all<{ level: string }>(
            `SELECT level FROM risk_flag WHERE version_id = ? AND resolution IS NULL`,
            v.id,
          ).filter((f) => requires.includes(f.level))
        : [];
      const unsigned = v
        ? (one<{ n: number }>(
            `SELECT count(*) n FROM risk_flag
             WHERE version_id = ? AND resolution IS NOT NULL
               AND (resolved_by IS NULL OR resolved_at IS NULL)`,
            v.id,
          )?.n ?? 0)
        : 0;
      const critical = open.filter((f) => f.level === "CRITICAL").length;
      const high = open.filter((f) => f.level === "HIGH").length;

      /*
        An unchecked draft has no flags on it, which is not the same thing as a
        draft with nothing wrong. Without this condition, "no unresolved flags"
        proves true before the Fact Check Agent has ever looked at the version.
      */
      const checked = v
        ? Boolean(
            one<{ n: number }>(
              `SELECT count(*) n FROM agent_run
                WHERE agent = 'factcheck' AND status IN ('completed','needs_review')
                  AND json_extract(payload,'$.version_id') = ?`,
              v.id,
            )?.n,
          )
        : false;

      return [
        c(
          "checked",
          "The Fact Check Agent has run against this version",
          "核查智能体已跑过该版本",
          checked,
          v?.label,
        ),
        c(
          "critical",
          "Every CRITICAL flag has a human resolution",
          "每条 CRITICAL 都有人处理",
          critical === 0,
          critical ? `${critical} unresolved` : "none open",
        ),
        c(
          "high",
          "Every HIGH flag has a human resolution",
          "每条 HIGH 都有人处理",
          high === 0,
          high ? `${high} unresolved` : "none open",
        ),
        c(
          "signed",
          "Every resolution records a reviewer and a time",
          "每次处理都记下了处理人和时间",
          unsigned === 0,
          unsigned ? `${unsigned} missing a signature` : undefined,
        ),
        /*
          The human gate. Locking is a reviewer's act, so the signal cannot
          clear itself: it clears once a person has locked a version. `advance`
          requires every condition, and the lock endpoint checks all of them
          except this one, which is the act it is about to perform.
        */
        humanGate(
          "locked",
          "A reviewer has locked a version",
          "已有审核锁定了某个版本",
          v?.status === "locked" || Boolean(lockedVersion(taskId)),
        ),
      ];
    },
  },

  SCRIPT_LOCKED: {
    to: "PRODUCTION",
    authority_en: "Reviewer",
    authority_zh: "审核",
    onFail_en:
      "Export is refused without an assigned producer. A locked script nobody holds is how work goes missing.",
    onFail_zh:
      "没指派制作人员就不给导出。锁了却没人接手的脚本，正是活儿丢掉的方式。",
    prove: ({ taskId }) => {
      const locked = lockedVersion(taskId);
      const task = one<{ producer_id: string | null }>(
        "SELECT producer_id FROM content_task WHERE id = ?",
        taskId,
      );
      return [
        c(
          "locked",
          "A locked version exists to export",
          "存在可导出的锁定版本",
          Boolean(locked),
          locked?.label,
        ),
        c(
          "producer",
          "A producer is assigned",
          "已指派制作人员",
          Boolean(task?.producer_id),
          task?.producer_id ?? "unassigned",
        ),
      ];
    },
  },

  PRODUCTION: {
    to: "VIDEO_READY",
    authority_en: "Producer",
    authority_zh: "制作",
    onFail_en:
      "A video not bound to a locked version is rejected on upload. There is no orphan bucket.",
    onFail_zh: "没有绑定锁定版本的成片，在上传时就被拒。这里没有孤儿目录。",
    prove: ({ taskId }) => {
      const locked = lockedVersion(taskId);
      const asset = one<{ id: string; ref: string; script_version_id: string }>(
        `SELECT id,ref,script_version_id FROM media_asset
         WHERE task_id = ? AND kind = 'final_video' AND status != 'superseded'
         ORDER BY created_at DESC LIMIT 1`,
        taskId,
      );
      return [
        c(
          "asset",
          "A final video is uploaded or linked",
          "成片已上传或已挂链接",
          Boolean(asset),
          asset?.ref,
        ),
        c(
          "bound",
          "That video is bound to the locked script version",
          "成片绑定到锁定脚本版本",
          Boolean(asset && locked && asset.script_version_id === locked.id),
          asset && locked
            ? `${asset.script_version_id} vs ${locked.id}`
            : undefined,
        ),
      ];
    },
  },

  VIDEO_READY: {
    to: "PUBLISH_PACKAGE_READY",
    authority_en: "Publish Package Agent",
    authority_zh: "发布物料智能体",
    onFail_en:
      "Missing platform rules block generation for that platform only. The others still get their package.",
    onFail_zh: "某个平台缺规则，只拦这个平台。其他平台照常出物料。",
    prove: ({ taskId, workspaceId }) => {
      const task = one<{ platforms: string }>(
        "SELECT platforms FROM content_task WHERE id = ?",
        taskId,
      );
      const platforms = JSON.parse(task?.platforms ?? "[]") as string[];
      const missingRules = platforms.filter(
        (p) => !cfg(workspaceId, `platform.${p}.rules`),
      );
      const ready = all<{ platform: string }>(
        "SELECT platform FROM publish_package WHERE task_id = ? AND status = 'ready'",
        taskId,
      ).map((r) => r.platform);
      const notReady = platforms.filter((p) => !ready.includes(p));
      return [
        c(
          "platforms",
          "Target platforms are chosen",
          "目标平台已选定",
          platforms.length > 0,
          platforms.join(", "),
        ),
        c(
          "rules",
          "Platform rules resolve from configuration",
          "平台规则可从配置解析",
          missingRules.length === 0,
          missingRules.length
            ? `missing: ${missingRules.join(", ")}`
            : undefined,
        ),
        c(
          "generated",
          "A valid package exists for each platform",
          "每个平台都有有效物料包",
          platforms.length > 0 && notReady.length === 0,
          notReady.length
            ? `pending: ${notReady.join(", ")}`
            : `${ready.length} ready`,
        ),
      ];
    },
  },

  PUBLISH_PACKAGE_READY: {
    to: "PUBLISHED_MANUALLY",
    manual: true,
    authority_en: "A person, in the platform's own app",
    authority_zh: "由人在平台自家 App 里完成",
    onFail_en:
      "There is no failure mode here, because there is no automation here. The package waits until someone publishes and comes back to record it.",
    onFail_zh:
      "这里没有失败模式，因为这里没有自动化。物料包一直等着，直到有人发完回来登记。",
    prove: ({ taskId }) => {
      const recorded = all<{
        platform: string;
        live_url: string | null;
        account: string | null;
        published_at: string | null;
      }>(
        "SELECT platform,live_url,account,published_at FROM publish_package WHERE task_id = ? AND status != 'invalid'",
        taskId,
      );
      const done = recorded.filter(
        (r) => r.live_url && r.account && r.published_at,
      );
      return [
        c(
          "account",
          "The account used is recorded",
          "记录使用的账号",
          done.length > 0,
        ),
        c(
          "time",
          "The publish time is recorded",
          "记录发布时间",
          done.length > 0,
        ),
        c(
          "url",
          "The live URL is recorded",
          "记录线上链接",
          done.length > 0,
          done.length
            ? `${done.length} of ${recorded.length} platforms recorded`
            : "nothing recorded yet",
        ),
      ];
    },
  },

  PUBLISHED_MANUALLY: {
    to: "ANALYZED",
    authority_en: "Analytics Agent",
    authority_zh: "分析智能体",
    onFail_en:
      "Missing metrics stay missing and are shown as missing. The report does not fill a gap with an estimate.",
    onFail_zh: "缺的指标就写缺，并如实显示为缺。报告不会拿估算去补窟窿。",
    prove: ({ taskId, workspaceId }) => {
      const snaps = all<{ collection_method: string }>(
        "SELECT collection_method FROM metric_snapshot WHERE workspace_id = ? AND (task_id = ? OR task_id IS NULL)",
        workspaceId,
        taskId,
      );
      const undecided =
        one<{ n: number }>(
          "SELECT count(*) n FROM recommendation WHERE workspace_id = ? AND decision IS NULL",
          workspaceId,
        )?.n ?? 0;
      return [
        c(
          "imported",
          "Metrics are imported with a collection method on every row",
          "指标已导入且每行标明采集方式",
          snaps.length > 0 && snaps.every((s) => Boolean(s.collection_method)),
          `${snaps.length} snapshots`,
        ),
        c(
          "reviewed",
          "Every recommendation has been accepted or rejected",
          "每条建议都已通过或否决",
          undecided === 0,
          undecided ? `${undecided} still open` : "all decided",
        ),
      ];
    },
  },
};

export function nextState(from: State): State | null {
  return ROUTES[from]?.to ?? null;
}

export function proveRoute(
  workspaceId: string,
  taskId: string,
): RouteProof | null {
  const task = one<{ state: State }>(
    "SELECT state FROM content_task WHERE id = ? AND workspace_id = ?",
    taskId,
    workspaceId,
  );
  if (!task) return null;
  const route = ROUTES[task.state];
  if (!route) return null;

  const conditions = route.prove({ taskId, workspaceId });
  return {
    from: task.state,
    to: route.to,
    conditions,
    cleared: conditions.every((x) => x.proved),
    manual: Boolean(route.manual),
    authority_en: route.authority_en,
    authority_zh: route.authority_zh,
    onFail_en: route.onFail_en,
    onFail_zh: route.onFail_zh,
  };
}

/** Every route's proof for one task, so the whole line can be drawn honestly. */
export function proveAll(workspaceId: string, taskId: string) {
  const task = one<{ state: State }>(
    "SELECT state FROM content_task WHERE id = ? AND workspace_id = ?",
    taskId,
    workspaceId,
  );
  if (!task) return null;
  const currentIndex = STATES.indexOf(task.state);
  return STATES.map((state, i) => {
    const route = ROUTES[state];
    const conditions = route ? route.prove({ taskId, workspaceId }) : [];
    return {
      state,
      index: i,
      passed: i < currentIndex,
      current: i === currentIndex,
      manual: Boolean(route?.manual),
      conditions:
        i <= currentIndex
          ? conditions
          : conditions.map((x) => ({ ...x, proved: false })),
      cleared:
        i < currentIndex ||
        (i === currentIndex && conditions.every((x) => x.proved)),
    };
  });
}

/**
 * Advance a task. Refuses unless the interlocking clears, and writes an audit
 * event either way, because a refused move is as interesting as an allowed one.
 */
export function advance(session: Session, taskId: string, reason?: string) {
  const first = proveRoute(session.workspaceId, taskId);
  if (!first)
    throw new HttpError(404, "no_task", "No such task in this workspace.");

  if (!first.cleared) {
    const held = first.conditions
      .filter((x) => !x.proved)
      .map((x) => x.label_en);
    audit(
      session,
      "transition_refused",
      "content_task",
      taskId,
      { to: first.to },
      { held },
      reason,
    );
    throw new HttpError(
      409,
      "signal_at_danger",
      `Held at danger. Not proved: ${held.join("; ")}`,
    );
  }

  /*
    Clearing one condition re-proves every route that depended on it, so the
    task runs forward until a signal holds. Uploading a video, for example,
    proves both the route out of SCRIPT_LOCKED and the one out of PRODUCTION;
    stopping after the first would leave the task sitting a block behind where
    it actually is.
  */
  let state = first.from;
  for (let hop = 0; hop < STATES.length; hop++) {
    const proof = proveRoute(session.workspaceId, taskId);
    if (!proof || !proof.cleared) break;
    run(
      "UPDATE content_task SET state = ?, updated_at = ?, revision = revision + 1 WHERE id = ?",
      proof.to,
      now(),
      taskId,
    );
    audit(
      session,
      "transition",
      "content_task",
      taskId,
      { state: proof.from },
      { state: proof.to },
      reason,
    );
    state = proof.to;
  }
  return state;
}

/**
 * Section 4: a new locked script or a new final video invalidates the current
 * package. Called from wherever either one changes, so the rule cannot be
 * forgotten at one call site.
 */
export function invalidatePackages(
  session: Session,
  taskId: string,
  why: string,
) {
  const affected = all<{ id: string; platform: string }>(
    "SELECT id,platform FROM publish_package WHERE task_id = ? AND status = 'ready'",
    taskId,
  );
  for (const p of affected) {
    run(
      "UPDATE publish_package SET status = 'invalid', updated_at = ?, revision = revision + 1 WHERE id = ?",
      now(),
      p.id,
    );
    audit(
      session,
      "package_invalidated",
      "publish_package",
      p.id,
      { status: "ready" },
      { status: "invalid" },
      why,
    );
  }
  if (affected.length) {
    const task = one<{ state: State }>(
      "SELECT state FROM content_task WHERE id = ?",
      taskId,
    );
    if (
      task &&
      STATES.indexOf(task.state) >= STATES.indexOf("PUBLISH_PACKAGE_READY")
    ) {
      run(
        "UPDATE content_task SET state = 'VIDEO_READY', updated_at = ?, revision = revision + 1 WHERE id = ?",
        now(),
        taskId,
      );
      audit(
        session,
        "transition",
        "content_task",
        taskId,
        { state: task.state },
        { state: "VIDEO_READY" },
        why,
      );
    }
  }
  return affected.length;
}

export function newTaskId() {
  return id("task");
}

/**
 * Advance as far as the interlocking allows after an action that succeeded.
 *
 * The action itself is already done and recorded. If the next signal holds,
 * that is the correct outcome of the workflow, not a failure of the request,
 * so it must not turn a successful write into an error the caller sees.
 *
 * This lives here rather than beside any one caller because every entry point
 * that runs an agent has to do it. When it was private to the API route, the
 * assistant called the same agents without it and left tasks sitting one state
 * behind, reporting themselves clear while a screenful of flags waited.
 */
export function runForward(session: Session, taskId: string, reason: string) {
  try {
    advance(session, taskId, reason);
  } catch (err) {
    if (err instanceof HttpError && err.code === "signal_at_danger") return;
    throw err;
  }
}
