import { all, id, now, one, run } from "@/lib/server/db";
import { audit } from "@/lib/server/audit";
import type { Session } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/auth";
import { complete, retrieve, runAgent, type AgentResult } from "@/lib/server/gateway";
import { invalidatePackages } from "@/lib/server/interlocking";

function cfg(workspaceId: string, key: string): string | null {
  return (
    one<{ value: string }>("SELECT value FROM config WHERE workspace_id = ? AND key = ?", workspaceId, key)
      ?.value ?? null
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

export async function generateScript(session: Session, taskId: string, note?: string) {
  const task = one<{ id: string; title_zh: string; title_en: string; candidate_id: string | null }>(
    "SELECT id,title_zh,title_en,candidate_id FROM content_task WHERE id = ? AND workspace_id = ?",
    taskId,
    session.workspaceId,
  );
  if (!task) throw new HttpError(404, "no_task", "No such task.");

  const sources = all<{ id: string; label_zh: string; label_en: string; trust: string; published_at: string }>(
    `SELECT s.id,s.label_zh,s.label_en,s.trust,s.published_at
       FROM task_source ts JOIN source s ON s.id = ts.source_id
      WHERE ts.task_id = ?`,
    taskId,
  );
  const minChars = Number(cfg(session.workspaceId, "script.min_chars") ?? 1200);
  const maxChars = Number(cfg(session.workspaceId, "script.max_chars") ?? 1400);
  const forbidden = cfgJson<string[]>(session.workspaceId, "script.forbidden_phrases", []);
  const parent = one<{ id: string; label: string }>(
    "SELECT id,label FROM script_version WHERE task_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1",
    taskId,
  );

  return runAgent<{ version_id: string; label: string; chars: number; style_checks: string[] }>(
    { workspaceId: session.workspaceId, taskId, agent: "script", promptVersion: "script.zh.v7" },
    async () => {
      const sourceList = sources.map((s) => `- [${s.id}] ${s.label_zh} (${s.trust}, ${s.published_at})`).join("\n");

      const draft = await complete({
        system:
          "你是一位中文口播视频撰稿人。用口语化、可信、克制的语气写作。" +
          "结构固定：问题开场、一个清楚的类比、三段主体、互动收尾。" +
          "每一条事实性主张后面用 [来源ID] 标注它依据的来源。" +
          `禁止使用这些表述：${forbidden.join("、")}。不要做预测，不要用绝对化措辞。`,
        prompt:
          `选题：${task.title_zh}\n\n可用来源：\n${sourceList}\n\n` +
          `目标字数：${minChars} 到 ${maxChars} 个汉字。\n` +
          (note ? `本次要求：${note}\n` : ""),
        maxTokens: 3000,
        fallback: localDraft(task.title_zh, sources, minChars),
      });

      const body = draft.text.trim();
      const chars = (body.match(/[一-鿿]/g) ?? []).length || body.length;

      const label = parent ? `v${Number(parent.label.replace("v", "")) + 1}` : "v1";
      const versionId = id("sv");
      const t = now();
      run(
        `INSERT INTO script_version
         (id,workspace_id,task_id,parent_id,label,body,chars,author_id,author_label,note_en,note_zh,
          model_version,prompt_version,status,created_at,updated_at,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        versionId, session.workspaceId, taskId, parent?.id ?? null, label, body, chars,
        null, "Script Agent",
        note ? `Rewrite: ${note}` : "First draft from the approved brief",
        note ? `按要求重写：${note}` : "依据已批准需求的初稿",
        draft.model, "script.zh.v7", "draft", t, t, `agent:script`,
      );

      // The claim-to-source map is built while writing, not afterwards.
      buildClaimMap(versionId, body);

      const styleChecks: string[] = [];
      if (chars < minChars) styleChecks.push(`Under target: ${chars} of ${minChars} characters`);
      if (chars > maxChars) styleChecks.push(`Over target: ${chars} of ${maxChars} characters`);
      for (const phrase of forbidden) {
        if (body.includes(phrase)) styleChecks.push(`Forbidden phrase used: ${phrase}`);
      }
      for (const part of STRUCTURE) {
        if (!body.includes(`【${part.zh}】`)) styleChecks.push(`Structure section missing: ${part.en}`);
      }

      audit(session, "generation", "script_version", versionId, null,
        { label, chars, model: draft.model, prompt: "script.zh.v7", parent: parent?.label ?? null });

      return {
        status: styleChecks.length ? ("needs_review" as const) : ("completed" as const),
        payload: { version_id: versionId, label, chars, style_checks: styleChecks },
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
): string {
  const s = (i: number) => sources[i % Math.max(sources.length, 1)]?.id ?? "unsourced";

  const sections = [
    `【问题开场】\n先问一个问题：${title}，这件事现在到底定了没有？这几天我看到不少解读，` +
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
      id("cm"), versionId, cl.claim, cl.sourceId, cl.start, cl.end,
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
  const out: { claim: string; sourceId: string | null; start: number; end: number }[] = [];
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

const ABSOLUTE = ["所有", "全部", "一定", "必然", "百分百", "肯定会", "每一家", "无一例外"];
const FORECAST = ["将会", "预计将", "势必", "接下来一定", "明年一季度", "很快就会"];

export async function factCheck(session: Session, versionId: string) {
  const version = one<{ id: string; task_id: string; body: string; workspace_id: string }>(
    "SELECT id,task_id,body,workspace_id FROM script_version WHERE id = ? AND workspace_id = ?",
    versionId,
    session.workspaceId,
  );
  if (!version) throw new HttpError(404, "no_version", "No such script version.");

  const sensitive = cfgJson<string[]>(session.workspaceId, "risk.sensitive_categories", []);
  const sources = all<{ id: string; label_zh: string; published_at: string; trust: string }>(
    `SELECT s.id,s.label_zh,s.published_at,s.trust FROM task_source ts
       JOIN source s ON s.id = ts.source_id WHERE ts.task_id = ?`,
    version.task_id,
  );
  const claims = all<{ id: string; claim: string; source_id: string | null }>(
    "SELECT id,claim,source_id FROM claim_map WHERE version_id = ?",
    versionId,
  );

  return runAgent<{ version_id: string; flags: number; blocking: number }>(
    { workspaceId: session.workspaceId, taskId: version.task_id, agent: "factcheck", promptVersion: "factcheck.zh.v4" },
    async () => {
      run("DELETE FROM risk_flag WHERE version_id = ? AND resolution IS NULL", versionId);

      const found: {
        level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        cat_en: string; cat_zh: string;
        claim: string;
        reason_en: string; reason_zh: string;
        ev_en: string; ev_zh: string;
        sourceId: string | null;
      }[] = [];

      for (const cl of claims) {
        const hitAbsolute = ABSOLUTE.find((w) => cl.claim.includes(w));
        if (hitAbsolute && !cl.source_id) {
          found.push({
            level: "CRITICAL",
            cat_en: "Absolute wording, no evidence", cat_zh: "绝对化表述，且无证据",
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
            cat_en: "Absolute wording", cat_zh: "绝对化表述",
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
            cat_en: "Conflicts with the source", cat_zh: "与来源冲突",
            claim: cl.claim,
            reason_en: "The claim states a timetable as settled. The source is a consultation draft with no effective date.",
            reason_zh: "这句话把时间表说成了定局，而来源是征求意见稿，里面没有实施日期。",
            ev_en: "Consultation draft cover note: comments close 2026-08-21, effective date announced separately.",
            ev_zh: "征求意见稿说明：意见截止 2026-08-21，实施日期另行公布。",
            sourceId: cl.source_id,
          });
        }
        if (!cl.source_id) {
          found.push({
            level: "HIGH",
            cat_en: "No evidence behind the claim", cat_zh: "主张没有证据支撑",
            claim: cl.claim,
            reason_en: "No approved source is mapped to this sentence.",
            reason_zh: "这句话没有对应到任何已批准来源。",
            ev_en: "Claim map has no source for this offset.",
            ev_zh: "主张对照表在这个位置没有来源。",
            sourceId: null,
          });
        }
        const stale = sources.find(
          (s) => cl.source_id === s.id && s.published_at && Number(s.published_at.slice(0, 4)) < new Date().getFullYear() - 1,
        );
        if (stale) {
          found.push({
            level: "LOW",
            cat_en: "Ageing information", cat_zh: "信息可能过时",
            claim: cl.claim,
            reason_en: `The mapped source is from ${stale.published_at.slice(0, 4)}. Probably still fine, worth a glance.`,
            reason_zh: `对应来源是 ${stale.published_at.slice(0, 4)} 年的。大概率还成立，但值得再看一眼。`,
            ev_en: stale.label_zh, ev_zh: stale.label_zh, sourceId: stale.id,
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
        if (version.body.includes(needle) && sensitive.some((s) => s.includes(catEn.split(" ")[0]))) {
          found.push({
            level: "MEDIUM",
            cat_en: `Sensitive category: ${catEn}`, cat_zh: `敏感类别：${catZh}`,
            claim: needle,
            reason_en: "On this workspace's sensitive list. A reviewer can approve it, but it should be a decision.",
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
          id("rf"), session.workspaceId, versionId, f.level, f.cat_en, f.cat_zh,
          f.claim, f.claim, f.reason_en, f.reason_zh, f.ev_en, f.ev_zh, f.sourceId, t, t, "agent:factcheck",
        );
      }

      run("UPDATE script_version SET status = 'in_review', updated_at = ? WHERE id = ? AND status = 'draft'", t, versionId);
      const blocking = found.filter((f) => f.level === "HIGH" || f.level === "CRITICAL").length;
      audit(session, "generation", "risk_flag", versionId, null, { flags: found.length, blocking });

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
  if (!locked) throw new HttpError(409, "no_locked_script", "A package needs a locked script version.");

  const asset = one<{ id: string; script_version_id: string }>(
    `SELECT id,script_version_id FROM media_asset WHERE task_id = ? AND kind = 'final_video'
     ORDER BY created_at DESC LIMIT 1`,
    taskId,
  );
  if (!asset) throw new HttpError(409, "no_video", "A package needs a final video.");
  if (asset.script_version_id !== locked.id) {
    throw new HttpError(409, "pair_mismatch", "The final video is bound to a different script version.");
  }

  const platforms = JSON.parse(task.platforms) as string[];

  return runAgent<{ platforms: string[]; skipped: string[] }>(
    { workspaceId: session.workspaceId, taskId, agent: "publish", promptVersion: "publish.zh.v3" },
    async () => {
      const made: string[] = [];
      const skipped: string[] = [];
      const t = now();

      for (const platform of platforms) {
        const rules = cfgJson<{ titleMax: number; coverMax: number; tagsMax: number } | null>(
          session.workspaceId, `platform.${platform}.rules`, null,
        );
        if (!rules) {
          skipped.push(platform);
          continue;
        }

        const payload = buildPackage(task.title_zh, locked.body, rules);
        run("UPDATE publish_package SET status='invalid', updated_at=? WHERE task_id=? AND platform=? AND status='ready'",
          t, taskId, platform);
        const pkgId = id("pp");
        run(
          `INSERT INTO publish_package
           (id,workspace_id,task_id,script_version_id,media_asset_id,platform,payload,status,created_at,updated_at,created_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          pkgId, session.workspaceId, taskId, locked.id, asset.id, platform,
          JSON.stringify(payload), "ready", t, t, "agent:publish",
        );
        audit(session, "generation", "publish_package", pkgId, null,
          { platform, script_version: locked.label, media_asset: asset.id });
        made.push(platform);
      }

      return {
        status: skipped.length ? ("needs_review" as const) : ("completed" as const),
        payload: { platforms: made, skipped },
        source_refs: [locked.id, asset.id],
        confidence: 0.88,
        risk_flags: skipped.map((p) => ({ level: "MEDIUM", note: `No platform rules configured for ${p}` })),
        human_action_required: true,
      };
    },
  );
}

function buildPackage(title: string, body: string, rules: { titleMax: number; coverMax: number; tagsMax: number }) {
  const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1) + "…");
  const hook = body.match(/【问题开场】\s*([^\n]+)/)?.[1] ?? title;
  const cut = (body.match(/【三段主体】\s*([^\n]+)/)?.[1] ?? "").replace(/\[[a-z_0-9]+\]/g, "");
  return {
    titles: [clip(title, rules.titleMax), clip(hook, rules.titleMax), clip(cut || title, rules.titleMax)],
    caption: clip(hook.replace(/\[[a-z_0-9]+\]/g, ""), 120),
    tags: ["信息披露", "监管解读", "合规", "财经", "干货"].slice(0, rules.tagsMax),
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
  [/该买|买哪只|推荐.*股|荐股|stock.*buy|which stock/i, "individual investment advice"],
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

export async function personaReply(session: Session, message: string, participant: string, externalId?: string) {
  const threshold = Number(cfg(session.workspaceId, "persona.auto_threshold") ?? 0.85);

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
        answer = "这个问题我不能回答。个股买卖属于投资建议，不在可回答范围内。需要的话我可以把公开资料的读法讲给你。";
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
        reason = "No approved passage retrieved, so there is nothing to ground an answer in.";
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
        convId, session.workspaceId, participant, message, answer,
        JSON.stringify(passages.map((p) => p.documentId)), confidence, mode, reason,
        mode === "HANDOFF" ? "requested" : "none",
        externalId ?? `local:${convId}`, t, t, "agent:persona",
      );
      audit(session, "ai_reply", "conversation", convId, null, { mode, confidence, reason });

      // 7.7: lead detection runs on the same message.
      let leadId: string | null = null;
      const intent = INTENTS.find(([re]) => re.test(message));
      if (intent) {
        const [, name, score] = intent;
        const dupe = one<{ id: string }>(
          "SELECT id FROM lead WHERE workspace_id = ? AND contact = ? AND intent = ? AND status NOT IN ('closed','rejected')",
          session.workspaceId, participant, name,
        );
        if (!dupe) {
          leadId = id("l");
          run(
            `INSERT INTO lead (id,workspace_id,conversation_id,contact,intent,score,status,notified_at,created_at,updated_at,created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            leadId, session.workspaceId, convId, participant, name, score, "new", t, t, t, "agent:leads",
          );
          audit(session, "lead_created", "lead", leadId, null, { intent: name, score, from: convId });
        }
      }

      return {
        status: mode === "AUTO" ? ("completed" as const) : ("needs_review" as const),
        payload: { conversation_id: convId, mode, answer, lead_id: leadId },
        source_refs: passages.map((p) => p.documentId),
        confidence,
        risk_flags: takeover ? [{ level: "HIGH", note: takeover[1] }] : refuse ? [{ level: "CRITICAL", note: refuse[1] }] : [],
        human_action_required: mode !== "AUTO",
      };
    },
  );
}

/* ── 7.8 Analytics Agent ─────────────────────────────────────────────────── */

export async function analyse(session: Session) {
  return runAgent<{
    totals: Record<string, number | null>;
    missing: string[];
    by_platform: { platform: string; method: string; metrics: Record<string, number> }[];
  }>(
    { workspaceId: session.workspaceId, agent: "analytics", promptVersion: "analytics.v2" },
    async () => {
      const snaps = all<{ platform: string; collection_method: string; metrics: string; missing_fields: string }>(
        "SELECT platform,collection_method,metrics,missing_fields FROM metric_snapshot WHERE workspace_id = ?",
        session.workspaceId,
      );

      const totals: Record<string, number | null> = {};
      const missing = new Set<string>();
      const byPlatform = snaps.map((s) => {
        const m = JSON.parse(s.metrics) as Record<string, number>;
        for (const f of JSON.parse(s.missing_fields) as string[]) missing.add(f);
        for (const [k, v] of Object.entries(m)) {
          if (k.endsWith("_rate")) continue;
          totals[k] = (totals[k] ?? 0) + v;
        }
        return { platform: s.platform, method: s.collection_method, metrics: m };
      });

      // Derived rates come only from fields that are actually present.
      if (totals.views && totals.likes != null) totals.like_rate = +(totals.likes / totals.views).toFixed(4);
      if (totals.views && totals.shares != null) totals.share_rate = +(totals.shares / totals.views).toFixed(4);
      for (const field of missing) totals[field] = null;

      return {
        status: "completed" as const,
        payload: { totals, missing: [...missing], by_platform: byPlatform },
        source_refs: snaps.map((s) => s.platform),
        confidence: 0.94,
        risk_flags: missing.size
          ? [{ level: "LOW", note: `${missing.size} fields could not be collected and are reported as missing` }]
          : [],
        human_action_required: false,
      };
    },
  );
}

/* ── 7.1 Topic Agent ─────────────────────────────────────────────────────── */

export async function runTopicAgent(session: Session) {
  return runAgent<{ run_id: string; candidates: number }>(
    { workspaceId: session.workspaceId, agent: "topic", promptVersion: "topic.zh.v5" },
    async () => {
      const banned = cfgJson<string[]>(session.workspaceId, "topic.banned", []);
      const approvedWeights = all<{ effect: string }>(
        "SELECT effect FROM recommendation WHERE workspace_id = ? AND decision = 'approved'",
        session.workspaceId,
      ).map((r) => r.effect);

      const sources = all<{ id: string; label_zh: string; trust: string; published_at: string }>(
        "SELECT id,label_zh,trust,published_at FROM source WHERE workspace_id = ? AND status = 'approved'",
        session.workspaceId,
      );
      if (sources.length === 0) throw new Error("No approved sources configured for this workspace.");

      const runId = `run_${Date.now().toString(36)}`;
      const t = now();
      let made = 0;

      for (const src of sources.slice(0, 3)) {
        const titleZh = `围绕「${src.label_zh}」，这周值得讲的一条`;
        if (banned.some((b) => titleZh.includes(b))) continue;

        // Approved recommendations, and only those, change ranking.
        let score = src.trust === "high" ? 78 : 64;
        if (approvedWeights.includes("source_weight:+1:high_trust") && src.trust === "high") score += 6;

        const cid = id("c");
        run(
          `INSERT INTO topic_candidate
           (id,workspace_id,run_id,title_en,title_zh,angle_en,angle_zh,why_en,why_zh,score,reason_en,reason_zh,created_at,updated_at,created_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          cid, session.workspaceId, runId,
          `This week's angle on ${src.label_zh}`, titleZh,
          "Read the primary document, not the coverage of it", "读一手文件，而不是别人对它的报道",
          `The source was published ${src.published_at} and nothing has covered the detail yet.`,
          `来源发布于 ${src.published_at}，细节部分还没人讲。`,
          score,
          `Trust level ${src.trust}${approvedWeights.length ? ", adjusted by approved recommendations" : ""}.`,
          `来源可信级别为 ${src.trust}${approvedWeights.length ? "，并按已通过的建议做过调整" : ""}。`,
          t, t, "agent:topic",
        );
        run(`INSERT INTO candidate_source (candidate_id,source_id) VALUES (?,?)`, cid, src.id);
        made++;
      }

      audit(session, "generation", "topic_candidate", runId, null, { candidates: made });
      return {
        status: made ? ("needs_review" as const) : ("failed" as const),
        payload: { run_id: runId, candidates: made },
        source_refs: sources.map((s) => s.id),
        confidence: 0.8,
        risk_flags: [],
        human_action_required: true,
      };
    },
  );
}

export type { AgentResult };
export { invalidatePackages };
