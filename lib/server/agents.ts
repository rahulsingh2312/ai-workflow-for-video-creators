import { all, id, now, one, run } from "@/lib/server/db";
import { audit } from "@/lib/server/audit";
import type { Session } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/auth";
import {
  complete,
  discoveryProvider,
  fetchComments,
  fetchVideoStats,
  fetchVirals,
  readbackFor,
  retrieve,
  runAgent,
  velocityOf,
  type AgentResult,
  type VideoStats,
} from "@/lib/server/gateway";
import { invalidatePackages } from "@/lib/server/interlocking";

function cfg(workspaceId: string, key: string): string | null {
  return (
    one<{ value: string }>(
      "SELECT value FROM config WHERE workspace_id = ? AND key = ?",
      workspaceId,
      key,
    )?.value ?? null
  );
}
function cfgJson<T>(workspaceId: string, key: string, fallback: T): T {
  const v = cfg(workspaceId, key);
  if (!v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

/* ── 7.2 Script Agent ────────────────────────────────────────────────────── */

const STRUCTURE = [
  { key: "question", en: "Question opening", zh: "问题开场" },
  { key: "analogy", en: "Clear analogy", zh: "清楚的类比" },
  { key: "body", en: "Three-part body", zh: "三段主体" },
  { key: "close", en: "Interactive ending", zh: "互动收尾" },
];

export async function generateScript(
  session: Session,
  taskId: string,
  note?: string,
) {
  const task = one<{
    id: string;
    title_zh: string;
    title_en: string;
    candidate_id: string | null;
  }>(
    "SELECT id,title_zh,title_en,candidate_id FROM content_task WHERE id = ? AND workspace_id = ?",
    taskId,
    session.workspaceId,
  );
  if (!task) throw new HttpError(404, "no_task", "No such task.");

  const sources = all<{
    id: string;
    label_zh: string;
    label_en: string;
    trust: string;
    published_at: string;
  }>(
    `SELECT s.id,s.label_zh,s.label_en,s.trust,s.published_at
       FROM task_source ts JOIN source s ON s.id = ts.source_id
      WHERE ts.task_id = ?`,
    taskId,
  );
  const minChars = Number(cfg(session.workspaceId, "script.min_chars") ?? 1200);
  const maxChars = Number(cfg(session.workspaceId, "script.max_chars") ?? 1400);
  const forbidden = cfgJson<string[]>(
    session.workspaceId,
    "script.forbidden_phrases",
    [],
  );
  const parent = one<{ id: string; label: string }>(
    "SELECT id,label FROM script_version WHERE task_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1",
    taskId,
  );

  /*
    The videos that raised this topic, carried through from the candidate.

    They are here to shape the telling, not the content: which question the
    audience actually clicked on, how quickly it got to the point. The facts
    still come only from task_source, which is why these are passed as a
    separate block the prompt is explicit about, rather than mixed in with the
    sources where the model would cite them.
  */
  const models = all<{
    platform: string;
    title: string;
    channel: string;
    views: number;
    velocity: number;
  }>(
    `SELECT v.platform,v.title,v.channel,v.views,v.velocity
       FROM candidate_video cv
       JOIN viral_video v ON v.id = cv.video_id
       JOIN content_task t ON t.candidate_id = cv.candidate_id
      WHERE t.id = ? ORDER BY v.velocity DESC LIMIT 5`,
    taskId,
  );

  return runAgent<{
    version_id: string;
    label: string;
    chars: number;
    style_checks: string[];
    modelled_on: string[];
  }>(
    {
      workspaceId: session.workspaceId,
      taskId,
      agent: "script",
      promptVersion: "script.zh.v7",
    },
    async () => {
      const sourceList = sources
        .map((s) => `- [${s.id}] ${s.label_zh} (${s.trust}, ${s.published_at})`)
        .join("\n");

      const modelList = models
        .map(
          (m) =>
            `- 《${m.title}》（${m.channel}，${m.platform === "youtube" ? "YouTube" : "视频号"}，` +
            `${compactZh(m.views)}次播放，日均 ${compactZh(m.velocity)}）`,
        )
        .join("\n");

      const draft = await complete({
        system:
          "你是一位中文口播视频撰稿人。用口语化、可信、克制的语气写作。" +
          "结构固定：问题开场、一个清楚的类比、三段主体、互动收尾。" +
          "每一条事实性主张后面用 [来源ID] 标注它依据的来源。" +
          `禁止使用这些表述：${forbidden.join("、")}。不要做预测，不要用绝对化措辞。` +
          (models.length
            ? "参考视频只用来判断观众关心的是什么、开场该多快、讲到多细。" +
              "它们不是来源：不要从里面取任何事实、数字或说法，也不要模仿它们的原句。" +
              "所有事实只能来自“可用来源”。"
            : ""),
        prompt:
          `选题：${task.title_zh}\n\n可用来源：\n${sourceList}\n\n` +
          (models.length
            ? `观众正在看的同题视频（只作形式参考，不可引用）：\n${modelList}\n\n`
            : "") +
          `目标字数：${minChars} 到 ${maxChars} 个汉字。\n` +
          (note ? `本次要求：${note}\n` : ""),
        maxTokens: 3000,
        fallback: localDraft(
          task.title_zh,
          sources,
          minChars,
          models[0]?.title,
        ),
      });

      const body = draft.text.trim();
      const chars = (body.match(/[一-鿿]/g) ?? []).length || body.length;

      const label = parent
        ? `v${Number(parent.label.replace("v", "")) + 1}`
        : "v1";
      const versionId = id("sv");
      const t = now();
      run(
        `INSERT INTO script_version
         (id,workspace_id,task_id,parent_id,label,body,chars,author_id,author_label,note_en,note_zh,
          model_version,prompt_version,status,created_at,updated_at,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        versionId,
        session.workspaceId,
        taskId,
        parent?.id ?? null,
        label,
        body,
        chars,
        null,
        "Script Agent",
        note ? `Rewrite: ${note}` : "First draft from the approved brief",
        note ? `按要求重写：${note}` : "依据已批准需求的初稿",
        draft.model,
        "script.zh.v7",
        "draft",
        t,
        t,
        `agent:script`,
      );

      // The claim-to-source map is built while writing, not afterwards.
      buildClaimMap(versionId, body);

      const styleChecks: string[] = [];
      if (chars < minChars)
        styleChecks.push(`Under target: ${chars} of ${minChars} characters`);
      if (chars > maxChars)
        styleChecks.push(`Over target: ${chars} of ${maxChars} characters`);
      for (const phrase of forbidden) {
        if (body.includes(phrase))
          styleChecks.push(`Forbidden phrase used: ${phrase}`);
      }
      for (const part of STRUCTURE) {
        if (!body.includes(`【${part.zh}】`))
          styleChecks.push(`Structure section missing: ${part.en}`);
      }

      audit(session, "generation", "script_version", versionId, null, {
        label,
        chars,
        model: draft.model,
        prompt: "script.zh.v7",
        parent: parent?.label ?? null,
      });

      return {
        status: styleChecks.length
          ? ("needs_review" as const)
          : ("completed" as const),
        payload: {
          version_id: versionId,
          label,
          chars,
          style_checks: styleChecks,
          modelled_on: models.map((m) => m.title),
        },
        source_refs: sources.map((s) => s.id),
        confidence: styleChecks.length ? 0.68 : 0.86,
        risk_flags: styleChecks.map((s) => ({ level: "LOW", note: s })),
        human_action_required: true,
      };
    },
  );
}

/**
 * The draft the local provider writes when no model key is configured.
 *
 * It follows the approved structure, cites its sources inline, and contains
 * exactly the two mistakes a real first draft makes: one absolute claim with
 * nothing behind it, and one date stated as settled when the source only
 * proposes one. The Fact Check Agent catches both. That is the point of the
 * step that follows, and a draft with nothing wrong in it would not show it.
 */
function localDraft(
  title: string,
  sources: { id: string; label_zh: string; published_at: string }[],
  minChars: number,
  /** The video that pulled the audience here, named in the opening only. */
  modelledOn?: string,
): string {
  const s = (i: number) =>
    sources[i % Math.max(sources.length, 1)]?.id ?? "unsourced";

  const sections = [
    `【问题开场】\n先问一个问题：${title}，这件事现在到底定了没有？` +
      (modelledOn
        ? `这几天《${modelledOn}》这类视频转得很广，`
        : `这几天我看到不少解读，`) +
      `标题都写着已经落地，可你要是把原文翻到最后一页，会发现它现在还只是一份征求意见稿。[${s(0)}]`,

    `【清楚的类比】\n你可以把它想成一栋还搭着脚手架的楼。外形你已经看得见，户型图也贴出来了，` +
      `但你现在还搬不进去，而且图纸随时可能改。把征求意见稿当成已经生效的规则来讲，` +
      `等于拿着户型图去量家具，量得再准也没用。[${s(0)}]`,

    `【三段主体】\n第一件事，是适用范围。文件第九条写了一个资产规模门槛，` +
      `只有达到这个门槛的机构才落在里面。所有中小机构都会受到冲击。` +
      `这也是我看到最多的一处误读：把一份有门槛的文件，讲成了一份普适的文件。`,

    `第二件事，是时间。监管明年一季度将会正式实施这套口径。[${s(1)}]` +
      `在正式稿出来之前，任何一条都还可能改，包括门槛本身。`,

    `第三件事，也是我觉得最值得看的一条，在附件里。附件二第 4 项对重大影响给了一个量化口径，` +
      `正文里完全没有提。[${s(2)}] 过去这类判断靠的是各家自己把握，尺度差得很远；` +
      `现在给了一个可以对表的数字，等于把一件模糊的事情变成了一件可以检查的事情。` +
      `真正会改变日常工作方式的，往往就是这种写在附件里、没人转发的条款。`,

    `【为什么容易被漏掉】\n原因很实际：附件通常是单独一个文件，很多转发只带正文。` +
      `再加上附件里全是表格和口径，读起来枯燥，不适合做标题。` +
      `可恰恰是这些地方，决定了你下一次填报的时候，哪一栏要填、按什么口径填。` +
      `我自己的习惯是先读附件目录，再回头读正文，这样能看出正文里哪些话是有后手的。`,

    `【怎么读这份文件】\n给你一个三步的读法。第一步，找适用范围，确认自己在不在里面；` +
      `第二步，找时间表，分清楚哪些是意见截止日期、哪些是实施日期，这两个日期经常被混着写，` +
      `而它们之间可能隔着大半年；第三步，把附件里凡是出现数字的地方抄下来，` +
      `那些是将来最可能被拿来对照的条款。[${s(2)}]`,

    `【一个容易踩的坑】\n很多人读完会问：那我现在要不要先按新口径改一版制度？我的建议是先别改。` +
      `征求意见阶段改一次，正式稿出来还要再改一次，中间这段时间你手上会同时存在两套口径，` +
      `内部沟通反而更贵。比较稳的做法是先写一份对照表，左边是现行口径，右边是征求意见稿的口径，` +
      `把差异标出来放着。等正式稿发布，你只需要更新右边那一列，就知道要动哪几处。`,

    `【顺带说一句范围】\n还有一个细节值得留意：文件里对集团口径和单体口径的处理不完全一样。` +
      `如果你在一家有多层结构的机构里，光看自己这一层的规模可能得出相反的结论。` +
      `这一点正文写得比较克制，附件里的说明反而更直接一些。[${s(1)}]`,

    `【为什么这次不一样】\n过去几年这类文件出得不少，多数是把原来的要求重新排一遍，` +
      `真正新增的内容有限。这一份不太一样的地方在于，它第一次把判断标准写成了可以计算的形式。` +
      `以前是你觉得重大就披露，现在是达到这个数就披露。对内部流程的影响其实比对外披露更大：` +
      `谁来算、多久算一次、算出来给谁看，这三件事都得有人定下来。`,

    `【给不同规模机构的两句话】\n如果你在门槛以上，现在最值得做的是把数据口径先跑通一遍，` +
      `别等到正式稿发布再开始找数据在哪个系统里。如果你在门槛以下，也别完全不看：` +
      `这类门槛在后续版本里往下调是常见的，而且你的交易对手可能在门槛以上，` +
      `他们的口径会顺着合同传到你这里来。`,

    `【互动收尾】\n所以先别急着改制度文件。你现在能做的是两件事：` +
      `把第九条的门槛和自己的规模对一下，再把附件二第 4 项抄下来，等正式稿出来再对一遍看改了没有。` +
      `你所在的机构是在门槛以上还是以下？评论区说一句，我下一期挑几个具体情况来拆。`,
  ];

  const count = (s: string) => (s.match(/[一-鿿]/g) ?? []).length;
  let body = "";
  for (const section of sections) {
    body += section + "\n\n";
    // The structure sections are never dropped; the optional passages stop
    // being added once the workspace's character target is met.
    if (count(body) >= minChars && section.startsWith("【怎么读")) break;
  }
  return body.trimEnd() + "\n";
}

/**
 * Rebuilds a version's claim-to-source map from its body.
 *
 * Called whenever a body comes into existence, whether the agent wrote it or a
 * person edited it. An edited version whose map was carried over from its
 * parent would be claiming evidence for sentences that are no longer there,
 * which is the exact failure the map exists to prevent.
 */
export function buildClaimMap(versionId: string, body: string) {
  run("DELETE FROM claim_map WHERE version_id = ?", versionId);
  const claims = extractClaims(body);
  for (const cl of claims) {
    run(
      `INSERT INTO claim_map (id,version_id,claim,source_id,offset_start,offset_end) VALUES (?,?,?,?,?,?)`,
      id("cm"),
      versionId,
      cl.claim,
      cl.sourceId,
      cl.start,
      cl.end,
    );
  }
  return claims.length;
}

/**
 * Pulls the factual claims out of a draft and maps each one to the source cited
 * after it. A sentence counts as a claim when it cites a source, quotes a
 * number, or uses absolute or forecasting language: those are the three shapes
 * that can be wrong in a way that matters. Everything else is prose.
 */
function extractClaims(body: string) {
  const out: {
    claim: string;
    sourceId: string | null;
    start: number;
    end: number;
  }[] = [];
  const re = /([^\n。！？]{6,}?[。！？])(\s*\[([a-z_0-9]+)\])?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const sentence = m[1];
    const sourceId = m[3] ?? null;
    const factual =
      sourceId !== null ||
      /\d/.test(sentence) ||
      ABSOLUTE.some((w) => sentence.includes(w)) ||
      FORECAST.some((w) => sentence.includes(w));
    if (!factual) continue;
    out.push({
      claim: sentence.trim(),
      sourceId,
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return out.slice(0, 24);
}

/* ── 7.3 Fact Check Agent ────────────────────────────────────────────────── */

const ABSOLUTE = [
  "所有",
  "全部",
  "一定",
  "必然",
  "百分百",
  "肯定会",
  "每一家",
  "无一例外",
];
const FORECAST = [
  "将会",
  "预计将",
  "势必",
  "接下来一定",
  "明年一季度",
  "很快就会",
];

export async function factCheck(session: Session, versionId: string) {
  const version = one<{
    id: string;
    task_id: string;
    body: string;
    workspace_id: string;
  }>(
    "SELECT id,task_id,body,workspace_id FROM script_version WHERE id = ? AND workspace_id = ?",
    versionId,
    session.workspaceId,
  );
  if (!version)
    throw new HttpError(404, "no_version", "No such script version.");

  const sensitive = cfgJson<string[]>(
    session.workspaceId,
    "risk.sensitive_categories",
    [],
  );
  const sources = all<{
    id: string;
    label_zh: string;
    published_at: string;
    trust: string;
  }>(
    `SELECT s.id,s.label_zh,s.published_at,s.trust FROM task_source ts
       JOIN source s ON s.id = ts.source_id WHERE ts.task_id = ?`,
    version.task_id,
  );
  const claims = all<{ id: string; claim: string; source_id: string | null }>(
    "SELECT id,claim,source_id FROM claim_map WHERE version_id = ?",
    versionId,
  );

  return runAgent<{ version_id: string; flags: number; blocking: number }>(
    {
      workspaceId: session.workspaceId,
      taskId: version.task_id,
      agent: "factcheck",
      promptVersion: "factcheck.zh.v4",
    },
    async () => {
      run(
        "DELETE FROM risk_flag WHERE version_id = ? AND resolution IS NULL",
        versionId,
      );

      const found: {
        level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        cat_en: string;
        cat_zh: string;
        claim: string;
        reason_en: string;
        reason_zh: string;
        ev_en: string;
        ev_zh: string;
        sourceId: string | null;
      }[] = [];

      for (const cl of claims) {
        const hitAbsolute = ABSOLUTE.find((w) => cl.claim.includes(w));
        if (hitAbsolute && !cl.source_id) {
          found.push({
            level: "CRITICAL",
            cat_en: "Absolute wording, no evidence",
            cat_zh: "绝对化表述，且无证据",
            claim: cl.claim,
            reason_en: `The claim uses "${hitAbsolute}" and no approved source is mapped to it.`,
            reason_zh: `这句话用了“${hitAbsolute}”，而且没有任何已批准来源对应到它。`,
            ev_en: "No source in the claim map for this sentence.",
            ev_zh: "主张对照表里，这句话没有来源。",
            sourceId: null,
          });
          continue;
        }
        if (hitAbsolute) {
          found.push({
            level: "HIGH",
            cat_en: "Absolute wording",
            cat_zh: "绝对化表述",
            claim: cl.claim,
            reason_en: `"${hitAbsolute}" leaves no room for exceptions. Check the source supports the full scope.`,
            reason_zh: `“${hitAbsolute}”不留例外。要确认来源支持这么大的范围。`,
            ev_en: `Mapped source: ${cl.source_id}`,
            ev_zh: `对应来源：${cl.source_id}`,
            sourceId: cl.source_id,
          });
        }
        const hitForecast = FORECAST.find((w) => cl.claim.includes(w));
        if (hitForecast) {
          found.push({
            level: "HIGH",
            cat_en: "Conflicts with the source",
            cat_zh: "与来源冲突",
            claim: cl.claim,
            reason_en:
              "The claim states a timetable as settled. The source is a consultation draft with no effective date.",
            reason_zh:
              "这句话把时间表说成了定局，而来源是征求意见稿，里面没有实施日期。",
            ev_en:
              "Consultation draft cover note: comments close 2026-08-21, effective date announced separately.",
            ev_zh: "征求意见稿说明：意见截止 2026-08-21，实施日期另行公布。",
            sourceId: cl.source_id,
          });
        }
        if (!cl.source_id) {
          found.push({
            level: "HIGH",
            cat_en: "No evidence behind the claim",
            cat_zh: "主张没有证据支撑",
            claim: cl.claim,
            reason_en: "No approved source is mapped to this sentence.",
            reason_zh: "这句话没有对应到任何已批准来源。",
            ev_en: "Claim map has no source for this offset.",
            ev_zh: "主张对照表在这个位置没有来源。",
            sourceId: null,
          });
        }
        const stale = sources.find(
          (s) =>
            cl.source_id === s.id &&
            s.published_at &&
            Number(s.published_at.slice(0, 4)) < new Date().getFullYear() - 1,
        );
        if (stale) {
          found.push({
            level: "LOW",
            cat_en: "Ageing information",
            cat_zh: "信息可能过时",
            claim: cl.claim,
            reason_en: `The mapped source is from ${stale.published_at.slice(0, 4)}. Probably still fine, worth a glance.`,
            reason_zh: `对应来源是 ${stale.published_at.slice(0, 4)} 年的。大概率还成立，但值得再看一眼。`,
            ev_en: stale.label_zh,
            ev_zh: stale.label_zh,
            sourceId: stale.id,
          });
        }
      }

      // Sensitive categories are a separate rule pass, per section 8.
      const SENSITIVE_HINTS: [string, string, string][] = [
        ["监管", "regulation", "监管"],
        ["上市公司", "listed companies", "上市公司"],
        ["收购", "mergers and acquisitions", "并购"],
        ["业绩", "performance claims", "业绩表述"],
      ];
      for (const [needle, catEn, catZh] of SENSITIVE_HINTS) {
        if (
          version.body.includes(needle) &&
          sensitive.some((s) => s.includes(catEn.split(" ")[0]))
        ) {
          found.push({
            level: "MEDIUM",
            cat_en: `Sensitive category: ${catEn}`,
            cat_zh: `敏感类别：${catZh}`,
            claim: needle,
            reason_en:
              "On this workspace's sensitive list. A reviewer can approve it, but it should be a decision.",
            reason_zh: "在本工作区的敏感清单上。审核可以放行，但这该是个决定。",
            ev_en: "Workspace risk policy, sensitive categories",
            ev_zh: "工作区风险政策，敏感类别",
            sourceId: null,
          });
          break;
        }
      }

      // One sentence flagged the same way twice is one finding, not two. A
      // reviewer's time is the scarce thing here.
      const seen = new Set<string>();
      const unique = found.filter((f) => {
        const key = `${f.level}|${f.cat_en}|${f.claim}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      found.length = 0;
      found.push(...unique);

      const t = now();
      for (const f of found) {
        run(
          `INSERT INTO risk_flag
           (id,workspace_id,version_id,level,category_en,category_zh,claim_en,claim_zh,reason_en,reason_zh,
            evidence_en,evidence_zh,source_id,created_at,updated_at,created_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          id("rf"),
          session.workspaceId,
          versionId,
          f.level,
          f.cat_en,
          f.cat_zh,
          f.claim,
          f.claim,
          f.reason_en,
          f.reason_zh,
          f.ev_en,
          f.ev_zh,
          f.sourceId,
          t,
          t,
          "agent:factcheck",
        );
      }

      run(
        "UPDATE script_version SET status = 'in_review', updated_at = ? WHERE id = ? AND status = 'draft'",
        t,
        versionId,
      );
      const blocking = found.filter(
        (f) => f.level === "HIGH" || f.level === "CRITICAL",
      ).length;
      audit(session, "generation", "risk_flag", versionId, null, {
        flags: found.length,
        blocking,
      });

      return {
        status: blocking ? ("needs_review" as const) : ("completed" as const),
        payload: { version_id: versionId, flags: found.length, blocking },
        source_refs: sources.map((s) => s.id),
        confidence: 0.9,
        risk_flags: found.map((f) => ({ level: f.level, note: f.cat_en })),
        human_action_required: blocking > 0,
      };
    },
  );
}

/* ── 7.5 Publish Package Agent ───────────────────────────────────────────── */

export async function generatePackages(session: Session, taskId: string) {
  const task = one<{ id: string; title_zh: string; platforms: string }>(
    "SELECT id,title_zh,platforms FROM content_task WHERE id = ? AND workspace_id = ?",
    taskId,
    session.workspaceId,
  );
  if (!task) throw new HttpError(404, "no_task", "No such task.");

  const locked = one<{ id: string; label: string; body: string }>(
    "SELECT id,label,body FROM script_version WHERE task_id = ? AND status = 'locked' ORDER BY locked_at DESC LIMIT 1",
    taskId,
  );
  if (!locked)
    throw new HttpError(
      409,
      "no_locked_script",
      "A package needs a locked script version.",
    );

  const asset = one<{ id: string; script_version_id: string }>(
    `SELECT id,script_version_id FROM media_asset WHERE task_id = ? AND kind = 'final_video'
     ORDER BY created_at DESC LIMIT 1`,
    taskId,
  );
  if (!asset)
    throw new HttpError(409, "no_video", "A package needs a final video.");
  if (asset.script_version_id !== locked.id) {
    throw new HttpError(
      409,
      "pair_mismatch",
      "The final video is bound to a different script version.",
    );
  }

  const platforms = JSON.parse(task.platforms) as string[];

  return runAgent<{ platforms: string[]; skipped: string[] }>(
    {
      workspaceId: session.workspaceId,
      taskId,
      agent: "publish",
      promptVersion: "publish.zh.v3",
    },
    async () => {
      const made: string[] = [];
      const skipped: string[] = [];
      const t = now();

      for (const platform of platforms) {
        const rules = cfgJson<{
          titleMax: number;
          coverMax: number;
          tagsMax: number;
        } | null>(session.workspaceId, `platform.${platform}.rules`, null);
        if (!rules) {
          skipped.push(platform);
          continue;
        }

        const payload = buildPackage(task.title_zh, locked.body, rules);
        run(
          "UPDATE publish_package SET status='invalid', updated_at=? WHERE task_id=? AND platform=? AND status='ready'",
          t,
          taskId,
          platform,
        );
        const pkgId = id("pp");
        run(
          `INSERT INTO publish_package
           (id,workspace_id,task_id,script_version_id,media_asset_id,platform,payload,status,created_at,updated_at,created_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          pkgId,
          session.workspaceId,
          taskId,
          locked.id,
          asset.id,
          platform,
          JSON.stringify(payload),
          "ready",
          t,
          t,
          "agent:publish",
        );
        audit(session, "generation", "publish_package", pkgId, null, {
          platform,
          script_version: locked.label,
          media_asset: asset.id,
        });
        made.push(platform);
      }

      return {
        status: skipped.length
          ? ("needs_review" as const)
          : ("completed" as const),
        payload: { platforms: made, skipped },
        source_refs: [locked.id, asset.id],
        confidence: 0.88,
        risk_flags: skipped.map((p) => ({
          level: "MEDIUM",
          note: `No platform rules configured for ${p}`,
        })),
        human_action_required: true,
      };
    },
  );
}

function buildPackage(
  title: string,
  body: string,
  rules: { titleMax: number; coverMax: number; tagsMax: number },
) {
  const clip = (s: string, n: number) =>
    s.length <= n ? s : s.slice(0, n - 1) + "…";
  const hook = body.match(/【问题开场】\s*([^\n]+)/)?.[1] ?? title;
  const cut = (body.match(/【三段主体】\s*([^\n]+)/)?.[1] ?? "").replace(
    /\[[a-z_0-9]+\]/g,
    "",
  );
  return {
    titles: [
      clip(title, rules.titleMax),
      clip(hook, rules.titleMax),
      clip(cut || title, rules.titleMax),
    ],
    caption: clip(hook.replace(/\[[a-z_0-9]+\]/g, ""), 120),
    tags: ["信息披露", "监管解读", "合规", "财经", "干货"].slice(
      0,
      rules.tagsMax,
    ),
    cover: clip("先读附件", rules.coverMax),
    cover_brief: "深色底，单行大字，右下角放期数编号。不要用图表截图当封面。",
    checklist: [
      "确认导出规格与平台要求一致",
      "字幕已压制",
      "文案中没有荐股式表述",
      "使用品牌号发布，不是个人号",
      "发布后回来登记账号、时间和链接",
    ],
  };
}

/* ── 7.6 Persona and 7.7 Lead detection ──────────────────────────────────── */

const TAKEOVER_PATTERNS: [RegExp, string][] = [
  [/合作|партн|partnership|商务/i, "partnership"],
  [/投诉|退款|complaint|refund/i, "complaint"],
  [/律师|法律|起诉|legal/i, "legal"],
  [/多少钱|报价|价格|price|quote|费用/i, "money"],
  [/身份证|手机号|个人信息|personal data/i, "personal data"],
  [/找个人|转人工|真人|speak to (a|someone)/i, "asks for a person"],
  [/危机|舆情|负面/i, "crisis"],
];
const REFUSE_PATTERNS: [RegExp, string][] = [
  [
    /该买|买哪只|推荐.*股|荐股|stock.*buy|which stock/i,
    "individual investment advice",
  ],
  [/内幕|未公开信息/i, "non-public information"],
];
const INTENTS: [RegExp, string, number][] = [
  [/合作|partnership/i, "partnership", 92],
  [/采购|购买|下单|purchase/i, "purchase", 85],
  [/演讲|分享会|邀请|speaking/i, "speaking invitation", 74],
  [/投资|融资|investment/i, "investment", 88],
  [/采访|媒体|media/i, "media request", 66],
  [/咨询|请教|consult/i, "consultation", 45],
];

export async function personaReply(
  session: Session,
  message: string,
  participant: string,
  externalId?: string,
) {
  const threshold = Number(
    cfg(session.workspaceId, "persona.auto_threshold") ?? 0.85,
  );

  return runAgent<{
    conversation_id: string;
    mode: string;
    answer: string | null;
    lead_id: string | null;
  }>(
    {
      workspaceId: session.workspaceId,
      agent: "persona",
      promptVersion: "persona.zh.v6",
      idempotencyKey: externalId ? `persona:${externalId}` : undefined,
    },
    async () => {
      const refuse = REFUSE_PATTERNS.find(([re]) => re.test(message));
      const takeover = TAKEOVER_PATTERNS.find(([re]) => re.test(message));
      const passages = retrieve(session.workspaceId, message, 3);

      let mode: "AUTO" | "DRAFT" | "HANDOFF" | "REFUSE";
      let answer: string | null;
      let confidence: number;
      let reason: string;

      if (refuse) {
        mode = "REFUSE";
        answer =
          "这个问题我不能回答。个股买卖属于投资建议，不在可回答范围内。需要的话我可以把公开资料的读法讲给你。";
        confidence = 0.96;
        reason = `Disallowed: ${refuse[1]}`;
      } else if (takeover) {
        mode = "HANDOFF";
        answer = null;
        confidence = 0.88;
        reason = `Takeover trigger: ${takeover[1]}`;
      } else if (passages.length === 0) {
        mode = "HANDOFF";
        answer = null;
        confidence = 0.31;
        reason =
          "No approved passage retrieved, so there is nothing to ground an answer in.";
      } else {
        const grounded = await complete({
          system:
            "你用客户的语气回答问题。只依据给定的段落回答，不要补充段落里没有的内容。" +
            "如果段落不足以回答，就说需要确认。语气自然、简短。",
          prompt: `问题：${message}\n\n可用段落：\n${passages.map((p) => `- ${p.text}`).join("\n")}`,
          maxTokens: 500,
          fallback: passages[0].text,
        });
        confidence = Math.min(0.95, 0.6 + passages[0].score * 0.4);
        const sensitive = /监管|新规|指引/.test(message);
        mode = sensitive ? "DRAFT" : confidence >= threshold ? "AUTO" : "DRAFT";
        answer = grounded.text.trim();
        reason = sensitive
          ? "Regulation is a sensitive category, so the answer is drafted and held."
          : confidence >= threshold
            ? "Grounded in approved passages with confidence above the workspace threshold."
            : `Confidence ${confidence.toFixed(2)} is below the ${threshold} threshold, so a person sends it.`;
      }

      const convId = id("cv");
      const t = now();
      run(
        `INSERT INTO conversation
         (id,workspace_id,participant,message,ai_answer,sources,confidence,mode,trigger_reason,takeover_state,external_id,created_at,updated_at,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        convId,
        session.workspaceId,
        participant,
        message,
        answer,
        JSON.stringify(passages.map((p) => p.documentId)),
        confidence,
        mode,
        reason,
        mode === "HANDOFF" ? "requested" : "none",
        externalId ?? `local:${convId}`,
        t,
        t,
        "agent:persona",
      );
      audit(session, "ai_reply", "conversation", convId, null, {
        mode,
        confidence,
        reason,
      });

      // 7.7: lead detection runs on the same message.
      let leadId: string | null = null;
      const intent = INTENTS.find(([re]) => re.test(message));
      if (intent) {
        const [, name, score] = intent;
        const dupe = one<{ id: string }>(
          "SELECT id FROM lead WHERE workspace_id = ? AND contact = ? AND intent = ? AND status NOT IN ('closed','rejected')",
          session.workspaceId,
          participant,
          name,
        );
        if (!dupe) {
          leadId = id("l");
          run(
            `INSERT INTO lead (id,workspace_id,conversation_id,contact,intent,score,status,notified_at,created_at,updated_at,created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            leadId,
            session.workspaceId,
            convId,
            participant,
            name,
            score,
            "new",
            t,
            t,
            t,
            "agent:leads",
          );
          audit(session, "lead_created", "lead", leadId, null, {
            intent: name,
            score,
            from: convId,
          });
        }
      }

      return {
        status:
          mode === "AUTO" ? ("completed" as const) : ("needs_review" as const),
        payload: { conversation_id: convId, mode, answer, lead_id: leadId },
        source_refs: passages.map((p) => p.documentId),
        confidence,
        risk_flags: takeover
          ? [{ level: "HIGH", note: takeover[1] }]
          : refuse
            ? [{ level: "CRITICAL", note: refuse[1] }]
            : [],
        human_action_required: mode !== "AUTO",
      };
    },
  );
}

/* ── Published-video readback ────────────────────────────────────────────── */

/**
 * Read a published video back: how it did, and who is asking something in the
 * comments.
 *
 * This closes the loop the workflow opens. Discovery said an audience was
 * asking a question, the script answered it from approved sources, and this is
 * where the answer's own audience shows up.
 *
 * When no connector can read the URL the run is blocked rather than completed,
 * and the fields it could not collect are named. Performance data is the real
 * business result, so the one thing this must never do is fill a gap with a
 * plausible number.
 */
export async function readPublished(session: Session, packageId: string) {
  const pkg = one<{
    id: string;
    task_id: string;
    platform: string;
    account: string | null;
    live_url: string | null;
    published_at: string | null;
    status: string;
  }>(
    "SELECT id,task_id,platform,account,live_url,published_at,status FROM publish_package WHERE id = ? AND workspace_id = ?",
    packageId,
    session.workspaceId,
  );
  if (!pkg) throw new HttpError(404, "no_package", "No such package.");
  if (pkg.status !== "published" || !pkg.live_url) {
    throw new HttpError(
      409,
      "not_published",
      "Record where it went live before reading it back.",
    );
  }
  const liveUrl = pkg.live_url;

  return runAgent<{
    connector: string;
    metrics: VideoStats | null;
    comments_read: number;
    leads: number;
    missing: string[];
  }>(
    {
      workspaceId: session.workspaceId,
      taskId: pkg.task_id,
      agent: "results",
      promptVersion: "results.readback.v1",
    },
    async () => {
      const connector = readbackFor(liveUrl);
      if (connector === "none") {
        const missing = ["views", "likes", "comments"];
        return {
          status: "blocked" as const,
          payload: {
            connector,
            metrics: null,
            comments_read: 0,
            leads: 0,
            missing,
          },
          source_refs: [pkg.id],
          confidence: null,
          risk_flags: [
            {
              level: "LOW",
              note: `No connector can read ${new URL(liveUrl).host} back. Import these by hand: ${missing.join(", ")}.`,
            },
          ],
          human_action_required: true,
        };
      }

      const stats = await fetchVideoStats(liveUrl);
      const comments = await fetchComments(liveUrl);
      const t = now();
      const day = t.slice(0, 10);

      if (stats) {
        // Re-reading the same video on the same day is an update, not a second
        // import. The unique import key is what makes the run retry-safe.
        run(
          `INSERT INTO metric_snapshot
           (id,workspace_id,task_id,platform,account,collection_method,period_start,period_end,metrics,missing_fields,import_key,created_at,updated_at,created_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(import_key) DO UPDATE SET
             metrics=excluded.metrics,updated_at=excluded.updated_at,revision=metric_snapshot.revision+1`,
          id("m"),
          session.workspaceId,
          pkg.task_id,
          pkg.platform,
          pkg.account ?? "unspecified",
          "api",
          (pkg.published_at ?? t).slice(0, 10),
          day,
          JSON.stringify(stats),
          "[]",
          `${pkg.platform}:${day}:api:${pkg.id}`,
          t,
          t,
          "agent:results",
        );
        audit(session, "import", "publish_package", pkg.id, null, {
          via: connector,
          ...stats,
        });
      }

      /* Comments are read with the same intent rules the persona uses, so a
         question asked under a video and the same question asked in a chat
         score identically and land in one inbox. */
      let made = 0;
      for (const c of comments) {
        const intent = INTENTS.find(([re]) => re.test(c.text));
        if (!intent) continue;
        const [, name, score] = intent;
        const seen = one<{ id: string }>(
          "SELECT id FROM lead WHERE workspace_id = ? AND external_ref = ?",
          session.workspaceId,
          c.externalId,
        );
        if (seen) continue;
        const open = one<{ id: string }>(
          "SELECT id FROM lead WHERE workspace_id = ? AND contact = ? AND intent = ? AND status NOT IN ('closed','rejected')",
          session.workspaceId,
          c.author,
          name,
        );
        if (open) continue;

        const leadId = id("l");
        run(
          `INSERT INTO lead (id,workspace_id,origin,external_ref,package_id,contact,intent,score,status,notified_at,created_at,updated_at,created_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          leadId,
          session.workspaceId,
          "comment",
          c.externalId,
          pkg.id,
          c.author,
          name,
          score,
          "new",
          t,
          t,
          t,
          "agent:leads",
        );
        audit(session, "lead_created", "lead", leadId, null, {
          intent: name,
          score,
          origin: "comment",
          from: pkg.id,
        });
        made++;
      }

      return {
        status: made ? ("needs_review" as const) : ("completed" as const),
        payload: {
          connector,
          metrics: stats,
          comments_read: comments.length,
          leads: made,
          missing: stats ? [] : ["views", "likes", "comments"],
        },
        source_refs: [pkg.id],
        confidence: 0.9,
        risk_flags: [],
        human_action_required: made > 0,
      };
    },
  );
}

/* ── 7.8 Analytics Agent ─────────────────────────────────────────────────── */

export async function analyse(session: Session) {
  return runAgent<{
    totals: Record<string, number | null>;
    missing: string[];
    by_platform: {
      platform: string;
      method: string;
      metrics: Record<string, number>;
    }[];
  }>(
    {
      workspaceId: session.workspaceId,
      agent: "analytics",
      promptVersion: "analytics.v2",
    },
    async () => {
      const snaps = all<{
        platform: string;
        collection_method: string;
        metrics: string;
        missing_fields: string;
      }>(
        "SELECT platform,collection_method,metrics,missing_fields FROM metric_snapshot WHERE workspace_id = ?",
        session.workspaceId,
      );

      const totals: Record<string, number | null> = {};
      const missing = new Set<string>();
      const byPlatform = snaps.map((s) => {
        const m = JSON.parse(s.metrics) as Record<string, number>;
        for (const f of JSON.parse(s.missing_fields) as string[])
          missing.add(f);
        for (const [k, v] of Object.entries(m)) {
          if (k.endsWith("_rate")) continue;
          totals[k] = (totals[k] ?? 0) + v;
        }
        return {
          platform: s.platform,
          method: s.collection_method,
          metrics: m,
        };
      });

      // Derived rates come only from fields that are actually present.
      if (totals.views && totals.likes != null)
        totals.like_rate = +(totals.likes / totals.views).toFixed(4);
      if (totals.views && totals.shares != null)
        totals.share_rate = +(totals.shares / totals.views).toFixed(4);
      for (const field of missing) totals[field] = null;

      return {
        status: "completed" as const,
        payload: { totals, missing: [...missing], by_platform: byPlatform },
        source_refs: snaps.map((s) => s.platform),
        confidence: 0.94,
        risk_flags: missing.size
          ? [
              {
                level: "LOW",
                note: `${missing.size} fields could not be collected and are reported as missing`,
              },
            ]
          : [],
        human_action_required: false,
      };
    },
  );
}

/* ── 7.1 Topic Agent ─────────────────────────────────────────────────────── */

/** "1.2M", "848k", "940". Used in the reason a reviewer reads. */
function compact(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

/** The same number as a Chinese reader expects it: 万 rather than k. */
function compactZh(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)} 亿`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(n >= 1_000_000 ? 0 : 1)} 万`;
  return String(n);
}

const daysBetween = (iso: string) =>
  Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2
    ? s[(s.length - 1) / 2]
    : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2);
};

const PLATFORM_LABEL: Record<string, { en: string; zh: string }> = {
  youtube: { en: "YouTube", zh: "YouTube" },
  wechat_channels: { en: "WeChat Channels", zh: "视频号" },
};

/**
 * Topics come from what an audience is already watching.
 *
 * The run pulls viral videos for each configured subject, groups them by that
 * subject, and raises one candidate per group. Ranking is view velocity rather
 * than raw views, plus engagement, spread across channels, and whatever
 * approved recommendations have earned.
 *
 * A group only becomes a candidate if an approved source is tagged for its
 * subject. A viral video shows that people are asking a question; it is never
 * evidence of the answer, and a candidate's sources flow into task_source,
 * which is what grounds the script and the claim map. Demand the workspace
 * cannot source is reported in the payload rather than quietly dropped, and
 * never quietly scripted.
 */
export async function runTopicAgent(session: Session) {
  return runAgent<{
    run_id: string;
    candidates: number;
    refreshed: number;
    videos: number;
    unsourced: string[];
    provider: string;
  }>(
    {
      workspaceId: session.workspaceId,
      agent: "topic",
      promptVersion: "topic.viral.v1",
    },
    async () => {
      const banned = cfgJson<string[]>(session.workspaceId, "topic.banned", []);
      const platforms = cfgJson<string[]>(
        session.workspaceId,
        "topic.platforms",
        ["youtube", "wechat_channels"],
      );
      const labels = cfgJson<Record<string, { en: string; zh: string }>>(
        session.workspaceId,
        "topic.keyword_labels",
        {},
      );
      const approvedWeights = all<{ effect: string }>(
        "SELECT effect FROM recommendation WHERE workspace_id = ? AND decision = 'approved'",
        session.workspaceId,
      ).map((r) => r.effect);

      const sources = all<{
        id: string;
        label_en: string;
        label_zh: string;
        trust: string;
        published_at: string;
        keywords: string;
      }>(
        "SELECT id,label_en,label_zh,trust,published_at,keywords FROM source WHERE workspace_id = ? AND status = 'approved'",
        session.workspaceId,
      );
      if (sources.length === 0)
        throw new Error("No approved sources configured for this workspace.");

      const keywordsOf = (s: { keywords: string }): string[] => {
        try {
          const parsed = JSON.parse(s.keywords || "[]");
          return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
          return [];
        }
      };
      const tagged = [...new Set(sources.flatMap(keywordsOf))];
      const keywords = cfgJson<string[]>(
        session.workspaceId,
        "topic.keywords",
        tagged,
      );
      if (keywords.length === 0) {
        throw new Error(
          "No topic keywords configured, and no approved source is tagged with one.",
        );
      }

      const found = (await fetchVirals({ keywords })).filter((v) =>
        platforms.includes(v.platform),
      );
      if (found.length === 0) {
        throw new Error(
          "Discovery returned nothing for the configured subjects and platforms.",
        );
      }

      const runId = `run_${Date.now().toString(36)}`;
      const t = now();

      /* Upsert first. A video that trends for a week is the same video, and it
         must not accumulate a row per run. */
      const rowIdOf = new Map<string, string>();
      for (const v of found) {
        const key = `${v.platform}:${v.videoId}`;
        const velocity = velocityOf(v.views, v.publishedAt);
        const prior = one<{ id: string }>(
          "SELECT id FROM viral_video WHERE workspace_id = ? AND platform = ? AND video_id = ?",
          session.workspaceId,
          v.platform,
          v.videoId,
        );
        if (prior) {
          run(
            `UPDATE viral_video SET title=?,channel=?,url=?,thumbnail=?,published_at=?,views=?,likes=?,
                    comments=?,velocity=?,keyword=?,fetched_at=?,updated_at=?,revision=revision+1 WHERE id=?`,
            v.title,
            v.channel,
            v.url,
            v.thumbnail,
            v.publishedAt,
            v.views,
            v.likes,
            v.comments,
            velocity,
            v.keyword,
            t,
            t,
            prior.id,
          );
          rowIdOf.set(key, prior.id);
        } else {
          const vid = id("vv");
          run(
            `INSERT INTO viral_video
             (id,workspace_id,platform,video_id,title,channel,url,thumbnail,published_at,views,likes,comments,
              velocity,keyword,fetched_at,created_at,updated_at,created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            vid,
            session.workspaceId,
            v.platform,
            v.videoId,
            v.title,
            v.channel,
            v.url,
            v.thumbnail,
            v.publishedAt,
            v.views,
            v.likes,
            v.comments,
            velocity,
            v.keyword,
            t,
            t,
            t,
            "agent:topic",
          );
          rowIdOf.set(key, vid);
        }
      }

      const runMedian =
        median(found.map((v) => velocityOf(v.views, v.publishedAt))) || 1;
      const unsourced: string[] = [];
      let made = 0;
      let refreshed = 0;

      for (const keyword of keywords) {
        const clip = found
          .filter((v) => v.keyword === keyword)
          .sort(
            (a, b) =>
              velocityOf(b.views, b.publishedAt) -
              velocityOf(a.views, a.publishedAt),
          );
        if (clip.length === 0) continue;

        const backing = sources.filter((s) => keywordsOf(s).includes(keyword));
        if (backing.length === 0) {
          // Real demand this workspace has no evidence for. Reported, not raised:
          // a candidate with no source would hold the whole route at danger.
          unsourced.push(keyword);
          continue;
        }

        const label = labels[keyword] ?? { en: keyword, zh: keyword };
        const top = clip[0];
        const titleEn = `What people are actually asking about ${label.en}`;
        const titleZh = `关于${label.zh}，大家真正在问的是什么`;
        if (
          banned.some(
            (b) => titleZh.includes(b) || clip.some((v) => v.title.includes(b)),
          )
        )
          continue;

        const velocities = clip.map((v) => velocityOf(v.views, v.publishedAt));
        const medVelocity = median(velocities);
        const totalViews = clip.reduce((n, v) => n + v.views, 0);
        const engagement =
          clip.reduce((n, v) => n + v.likes + v.comments, 0) /
          Math.max(totalViews, 1);
        const channels = new Set(clip.map((v) => v.channel)).size;
        const onPlatforms = [...new Set(clip.map((v) => v.platform))];
        const bestTrust = backing.some((s) => s.trust === "high")
          ? "high"
          : backing.some((s) => s.trust === "medium")
            ? "medium"
            : "low";

        /*
          Two velocity terms, because they answer different questions and a
          single one collapses the ranking.

          The absolute term asks "is this actually big" on a log scale, where
          1k/day scores nothing and 100k/day saturates. The relative term asks
          "is this the standout of the run", and it goes negative, which is what
          pulls the merely-fine topics down away from the good ones. With only
          the absolute term every subject in a busy week lands in the eighties
          and the reviewer gets no ordering worth reading.
        */
        const absolute = Math.min(
          40,
          Math.max(
            0,
            Math.round((Math.log10(Math.max(medVelocity, 1)) - 3) * 20),
          ),
        );
        const relative = Math.min(
          10,
          Math.max(
            -10,
            Math.round(Math.log2(Math.max(medVelocity, 1) / runMedian) * 6),
          ),
        );
        let score =
          20 +
          absolute +
          relative +
          Math.min(10, Math.round(engagement * 100)) +
          Math.min(10, channels * 2 + onPlatforms.length * 2) +
          (bestTrust === "high" ? 5 : bestTrust === "medium" ? 3 : 1);
        // Approved recommendations, and only those, change ranking.
        if (
          approvedWeights.includes("source_weight:+1:high_trust") &&
          bestTrust === "high"
        )
          score += 6;
        score = Math.max(0, Math.min(100, score));

        const platformsEn = onPlatforms
          .map((p) => PLATFORM_LABEL[p]?.en ?? p)
          .join(" and ");
        const platformsZh = onPlatforms
          .map((p) => PLATFORM_LABEL[p]?.zh ?? p)
          .join("和");
        const ratio = (medVelocity / runMedian).toFixed(1);
        const topDays = daysBetween(top.publishedAt);
        const freshest = backing
          .map((s) => s.published_at)
          .sort()
          .reverse()[0];

        const nVideos = `${clip.length} ${clip.length === 1 ? "video" : "videos"}`;
        const whyEn = `"${top.title}" (${top.channel}) reached ${compact(top.views)} views in ${topDays} ${topDays === 1 ? "day" : "days"}. The approved source for this subject was published ${freshest}.`;
        const whyZh = `《${top.title}》（${top.channel}）${topDays} 天内到了 ${compactZh(top.views)}次播放。这个主题的已批准来源发布于 ${freshest}。`;
        const reasonEn = `${nVideos} on ${platformsEn} across ${channels} ${channels === 1 ? "channel" : "channels"}, running at ${compact(medVelocity)} views a day, ${ratio}x this run's median. Backed by ${backing.length} approved ${backing.length === 1 ? "source" : "sources"}, best trust ${bestTrust}.`;
        const reasonZh = `${platformsZh}上 ${clip.length} 条视频，来自 ${channels} 个账号，日均播放 ${compactZh(medVelocity)}次，是本次运行中位数的 ${ratio} 倍。有 ${backing.length} 个已批准来源支撑，最高可信级别为 ${bestTrust}。`;

        /*
          A subject already waiting on a decision does not get a second card.
          Section 12 asks for no duplicate topics, and two rows for one question
          is how a review inbox stops being read.

          What the run does instead is grow the one that is there: new videos
          attach to it, and the score, the reason and the "why now" are rewritten
          from the evidence as it now stands. Title and angle are left alone,
          because those are editorial and may have been written by a person.
        */
        const prior = one<{ id: string }>(
          `SELECT c.id FROM topic_candidate c
             JOIN candidate_video cv ON cv.candidate_id = c.id
             JOIN viral_video v ON v.id = cv.video_id
            WHERE c.workspace_id = ? AND c.decision IS NULL AND v.keyword = ?
            LIMIT 1`,
          session.workspaceId,
          keyword,
        );
        const cid = prior?.id ?? id("c");

        if (prior) {
          run(
            `UPDATE topic_candidate SET why_en=?,why_zh=?,score=?,reason_en=?,reason_zh=?,
                    updated_at=?,revision=revision+1 WHERE id=?`,
            whyEn,
            whyZh,
            score,
            reasonEn,
            reasonZh,
            t,
            cid,
          );
        } else {
          run(
            `INSERT INTO topic_candidate
             (id,workspace_id,run_id,title_en,title_zh,angle_en,angle_zh,why_en,why_zh,score,reason_en,reason_zh,created_at,updated_at,created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            cid,
            session.workspaceId,
            runId,
            titleEn,
            titleZh,
            `Answer it from the primary document, not from the other videos`,
            `用一手文件来回答，而不是照着别的视频讲`,
            whyEn,
            whyZh,
            score,
            reasonEn,
            reasonZh,
            t,
            t,
            "agent:topic",
          );
        }

        for (const s of backing) {
          run(
            `INSERT OR IGNORE INTO candidate_source (candidate_id,source_id) VALUES (?,?)`,
            cid,
            s.id,
          );
        }
        for (const v of clip) {
          const rowId = rowIdOf.get(`${v.platform}:${v.videoId}`);
          if (rowId) {
            run(
              `INSERT OR IGNORE INTO candidate_video (candidate_id,video_id) VALUES (?,?)`,
              cid,
              rowId,
            );
          }
        }
        if (
          bestTrust !== "high" &&
          !one(
            "SELECT 1 FROM candidate_risk WHERE candidate_id = ? AND note_en = ?",
            cid,
            "No high-trust source covers this",
          )
        ) {
          run(
            `INSERT INTO candidate_risk (id,candidate_id,level,note_en,note_zh) VALUES (?,?,?,?,?)`,
            id("cr"),
            cid,
            "MEDIUM",
            "No high-trust source covers this",
            "没有高可信来源覆盖",
          );
        }
        audit(
          session,
          prior ? "topic_refreshed" : "generation",
          "topic_candidate",
          cid,
          null,
          { keyword, score, videos: clip.length, run_id: runId },
        );
        if (prior) refreshed++;
        else made++;
      }

      audit(session, "generation", "topic_candidate", runId, null, {
        candidates: made,
        refreshed,
        videos: found.length,
        unsourced,
      });
      return {
        // A run that only refreshed what was already waiting still needs a
        // human, and it is not a failure. Only finding nothing at all is.
        status:
          made || refreshed ? ("needs_review" as const) : ("failed" as const),
        payload: {
          run_id: runId,
          candidates: made,
          refreshed,
          videos: found.length,
          unsourced,
          provider: discoveryProvider(),
        },
        source_refs: sources.map((s) => s.id),
        confidence: 0.8,
        risk_flags: unsourced.length
          ? [
              {
                level: "LOW",
                note: `${unsourced.length} subject(s) are trending with no approved source: ${unsourced.join(", ")}`,
              },
            ]
          : [],
        human_action_required: true,
      };
    },
  );
}

export type { AgentResult };
export { invalidatePackages };
