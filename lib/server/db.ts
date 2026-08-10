import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { SCHEMA } from "@/lib/server/schema";

/*
  Where the database lives.

  On a normal server this is ./data and it persists. On a serverless host the
  project directory is read-only and only /tmp is writable, so it falls back
  there: the app boots and works, but each cold start begins from the seed and
  nothing is shared between instances. Set TL_DB (or move to a hosted libSQL /
  Postgres) for durable storage.
*/
const EPHEMERAL = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_PATH =
  process.env.TL_DB ?? (EPHEMERAL ? "/tmp/throughline.db" : join(process.cwd(), "data", "throughline.db"));

let _db: DatabaseSync | null = null;

export function db(): DatabaseSync {
  if (_db) return _db;
  mkdirSync(join(DB_PATH, ".."), { recursive: true });
  const conn = new DatabaseSync(DB_PATH);
  conn.exec(SCHEMA);
  _db = conn;
  seed(conn);
  return conn;
}

export const now = () => new Date().toISOString();
export const id = (prefix: string) => `${prefix}_${randomUUID().slice(0, 8)}`;
export const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 32);

export function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  return db()
    .prepare(sql)
    .all(...(params as never[])) as T[];
}

export function one<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | null {
  const row = db()
    .prepare(sql)
    .get(...(params as never[]));
  return (row as T) ?? null;
}

export function run(sql: string, ...params: unknown[]) {
  return db()
    .prepare(sql)
    .run(...(params as never[]));
}

/* ── Seed ─────────────────────────────────────────────────────────────────
   Runs once. Creates the demonstration workspace with its users, sources,
   an unreviewed topic run, knowledge documents, conversations, leads and
   metrics. Everything here is invented; nothing is a real client or person.
   ------------------------------------------------------------------------ */

const WS = "ws_7f21";

function seed(conn: DatabaseSync) {
  const existing = conn.prepare("SELECT id FROM workspace WHERE id = ?").get(WS);
  if (existing) return;

  const t = now();
  const ex = (sql: string, ...p: unknown[]) => conn.prepare(sql).run(...(p as never[]));

  ex(
    `INSERT INTO workspace (id,name_en,name_zh,timezone,created_at,updated_at,created_by)
     VALUES (?,?,?,?,?,?,?)`,
    WS,
    "Jianwei · personal brand",
    "见微 · 个人品牌",
    "Asia/Shanghai",
    t,
    t,
    "system",
  );

  const users: [string, string, string, string[]][] = [
    ["u_admin", "Admin", "admin@example.com", ["admin", "contributor", "reviewer", "producer", "publisher", "support"]],
    ["u_wu", "Wu Jia", "wu@example.com", ["contributor"]],
    ["u_zhang", "Zhang Wei", "zhang@example.com", ["reviewer"]],
    ["u_lin", "Lin Tao", "lin@example.com", ["producer"]],
    ["u_he", "He Ping", "he@example.com", ["publisher"]],
    ["u_sun", "Sun Li", "sun@example.com", ["support"]],
  ];
  for (const [uid, name, email, roles] of users) {
    ex(`INSERT INTO app_user (id,name,email,created_at) VALUES (?,?,?,?)`, uid, name, email, t);
    for (const role of roles) {
      ex(`INSERT INTO membership (user_id,workspace_id,role) VALUES (?,?,?)`, uid, WS, role);
    }
  }

  const cfg: [string, string][] = [
    ["topic.schedule", "Weekdays 09:00"],
    ["topic.timezone", "Asia/Shanghai"],
    ["topic.candidates_per_run", "4"],
    ["topic.banned", JSON.stringify(["个股推荐", "宗教", "境外政治"])],
    ["script.min_chars", "1200"],
    ["script.max_chars", "1400"],
    ["script.structure", "question,analogy,three-part body,interactive close"],
    ["script.style_profile", "jianwei.v3"],
    ["script.forbidden_phrases", JSON.stringify(["稳赚", "必涨", "一定会", "百分百"])],
    ["risk.requires_reviewer", JSON.stringify(["HIGH", "CRITICAL"])],
    [
      "risk.sensitive_categories",
      JSON.stringify([
        "company names",
        "partners",
        "listed companies",
        "mergers and acquisitions",
        "regulation",
        "money",
        "forecasts",
        "performance claims",
      ]),
    ],
    ["persona.auto_threshold", "0.85"],
    ["persona.sampling_rate", "0.2"],
    [
      "persona.takeover_triggers",
      JSON.stringify([
        "low confidence",
        "missing source",
        "complaint",
        "negative publicity",
        "legal",
        "money",
        "personal data",
        "partnership",
        "crisis",
        "asks for a person",
      ]),
    ],
    ["lead.score_threshold", "60"],
    ["platforms.enabled", JSON.stringify(["channels", "douyin", "xhs"])],
    ["platform.channels.rules", JSON.stringify({ titleMax: 22, coverMax: 12, tagsMax: 4 })],
    ["platform.douyin.rules", JSON.stringify({ titleMax: 30, coverMax: 10, tagsMax: 5 })],
    ["platform.xhs.rules", JSON.stringify({ titleMax: 20, coverMax: 10, tagsMax: 5 })],
    ["model.primary", "gateway/llm-4"],
    ["model.fallback", "gateway/llm-3-fast"],
    ["retention.conversations_days", "180"],
    ["retention.contacts_days", "90"],
  ];
  for (const [k, v] of cfg) {
    ex(
      `INSERT INTO config (workspace_id,key,value,updated_at,updated_by) VALUES (?,?,?,?,?)`,
      WS,
      k,
      v,
      t,
      "system",
    );
  }

  const sources: [string, string, string, string, string, string][] = [
    ["s_reg", "Regulator consultation draft", "监管征求意见稿", "high", "2026-07-18", "https://example.gov/consult/2026-07"],
    ["s_qa", "Exchange Q&A, item 14", "交易所问答，第 14 条", "high", "2026-07-22", "https://example.exchange/qa/14"],
    ["s_assoc", "Industry association note", "行业协会说明", "medium", "2026-07-25", "https://example.org/note"],
    ["s_pboc", "Central bank announcement", "央行公告", "high", "2026-08-07", "https://example.gov/pboc/0807"],
    ["s_own", "Your own explainer, March", "你三月那期解读", "high", "2026-03-11", ""],
    ["s_stats", "Statistics bureau release", "统计局发布", "high", "2026-07-15", "https://example.gov/stats/q2"],
    ["s_filing", "Quarterly filing", "季度报告", "high", "2026-08-10", "https://example.exchange/filing/q3"],
  ];
  for (const [sid, en, zh, trust, date, url] of sources) {
    ex(
      `INSERT INTO source (id,workspace_id,label_en,label_zh,url,publisher,published_at,trust,last_check,created_at,updated_at,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      sid, WS, en, zh, url, "example", date, trust, t, t, t, "system",
    );
  }

  const docs: [string, string, string, string, string, string, string, string][] = [
    ["d_1", "Course handbook", "课程手册", "Product document", "产品文档", "v4", "indexed", "All agents"],
    ["d_2", "FAQ, customer-facing", "常见问题，对外", "FAQ", "问答", "v11", "indexed", "All agents"],
    ["d_3", "Tone guide and forbidden phrases", "语气指南与禁用表述", "Style guide", "风格指南", "v3", "indexed", "Script Agent only"],
    ["d_4", "Keynote transcript, spring event", "春季活动主题演讲实录", "Transcript", "实录", "v1", "review", "All agents"],
    ["d_5", "Pricing sheet, internal", "价格表，内部", "Internal document", "内部文档", "v9", "restricted", "No agent retrieval"],
    ["d_6", "Research report, 2024 edition", "研究报告，2024 版", "Research", "研究", "v1", "expired", "Retention rule expired"],
  ];
  for (const [did, en, zh, ten, tzh, ver, status, access] of docs) {
    ex(
      `INSERT INTO knowledge_document
       (id,workspace_id,name_en,name_zh,type_en,type_zh,doc_version,access_en,access_zh,ingest_stage,status,created_at,updated_at,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      did, WS, en, zh, ten, tzh, ver, access, access,
      status === "indexed" ? "published" : status === "review" ? "chunked" : "uploaded",
      status, t, t, "system",
    );
  }
  // Client documents are in the client's language, so the chunks are too.
  const chunks: [string, string, string][] = [
    ["k_1", "d_1", "年报精读课每月开一期。十一月这期新增了一节，讲信息披露新规的口径变化。"],
    ["k_2", "d_1", "每期课程三小时，分成两段，中间有一段现场答疑。课程大纲可以单独发。"],
    ["k_3", "d_2", "报名一般在开课前两周开放。需要大纲的话，随时找我要。"],
    ["k_4", "d_2", "往期课程的回放对已报名学员开放，有效期六个月。"],
    ["k_5", "d_3", "不要预测某项规则对某家具体机构的影响，只复述文件写了什么。"],
    ["k_6", "d_3", "遇到监管、并购、业绩这类话题，先出草稿，不要直接发出去。"],
    ["k_7", "d_2", "年报精读课还开吗？开的，每月一期，报名在开课前两周开放。"],
  ];
  for (const [cid, doc, text] of chunks) {
    ex(
      `INSERT INTO knowledge_chunk (id,workspace_id,document_id,ordinal,text) VALUES (?,?,?,?,?)`,
      cid, WS, doc, 0, text,
    );
  }

  ex(
    `INSERT INTO recommendation (id,workspace_id,text_en,text_zh,evidence_en,evidence_zh,effect,created_at,updated_at,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    "r_1", WS,
    "Raise the weight on primary regulatory sources by one step",
    "把一手监管来源的权重上调一档",
    "Four of the last five videos built on a primary source finished above the account average",
    "最近五条里，有四条以一手来源为基础的视频完播率高于账号平均",
    "source_weight:+1:high_trust", t, t, "system",
  );
  ex(
    `INSERT INTO recommendation (id,workspace_id,text_en,text_zh,evidence_en,evidence_zh,effect,created_at,updated_at,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    "r_2", WS,
    "Stop ranking same-week competitor topics into the top three",
    "同周对标账号已发的选题，不再进前三",
    "Both crowded topics this month landed under half the average view count",
    "本月两条撞题内容的播放量都不到平均值的一半",
    "rank_penalty:crowded", t, t, "system",
  );

  const metrics: [string, string, string, string, Record<string, number | null>, string[]][] = [
    ["m_1", "channels", "api", "Jianwei · Channels main",
      { views: 128400, likes: 5910, shares: 1204, completion_rate: 0.412, follower_adds: 742 }, []],
    ["m_2", "douyin", "csv", "Jianwei · Douyin",
      { views: 61200, likes: 2380, shares: 640, completion_rate: 0.331 }, ["group_exits"]],
    ["m_3", "xhs", "manual", "Jianwei · Xiaohongshu",
      { views: 18900, likes: 1120 }, ["shares", "completion_rate", "group_exits"]],
  ];
  for (const [mid, platform, method, account, mvals, missing] of metrics) {
    ex(
      `INSERT INTO metric_snapshot
       (id,workspace_id,platform,account,collection_method,period_start,period_end,metrics,missing_fields,import_key,created_at,updated_at,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      mid, WS, platform, account, method, "2026-08-03", "2026-08-09",
      JSON.stringify(mvals), JSON.stringify(missing), `${mid}-2026-08-09`, t, t, "system",
    );
  }

  seedTopicRun(conn, t);
  seedConversations(conn, t);
}

function seedTopicRun(conn: DatabaseSync, t: string) {
  const ex = (sql: string, ...p: unknown[]) => conn.prepare(sql).run(...(p as never[]));
  const run = "run_0810";

  const cands: [string, string, string, string, string, string, string, number, string, string, string[], [string, string, string][]][] = [
    ["c_204",
      "The three easiest things to miss in the new disclosure rules", "新版信息披露办法里，最容易被忽略的三条",
      "Read it as a compliance officer would, not as a headline", "用合规的眼睛读，而不是用标题的眼睛读",
      "The consultation period closes in eleven days and almost no one has covered the annex.", "征求意见还有十一天结束，附件部分几乎没人讲。",
      87,
      "High keyword match, a fresh primary source, and your last two rule-explainer videos outperformed the account average.",
      "关键词匹配度高、有新鲜的一手来源，而且你最近两条讲规则的视频都高于账号平均。",
      ["s_reg", "s_qa", "s_assoc"],
      [["MEDIUM", "Sensitive: regulation", "敏感：监管"]]],
    ["c_205",
      "What a half-point reserve-ratio cut actually does to a small bank", "降准 0.5 个百分点，对一家小银行到底意味着什么",
      "One balance sheet, walked through line by line", "拿一张资产负债表，一行一行走一遍",
      "It was announced Friday and the explainers so far have all been macro.", "周五刚宣布，目前的解读全是宏观层面的。",
      81,
      "Strong search interest this week, and the balance-sheet format is one your audience finishes at a higher rate.",
      "本周搜索热度高，而且资产负债表这种形式，你的观众完播率更好。",
      ["s_pboc", "s_own"],
      [["LOW", "Forecast wording", "预测性表述"]]],
    ["c_206",
      "Why this year's consumption data feels wrong to everyone", "为什么今年的消费数据，和你的体感差这么多",
      "The gap between the basket and your basket", "统计的那个篮子，和你的篮子之间的差距",
      "Evergreen, and the quarterly release lands Thursday.", "常青题材，季度数据周四发布。",
      73,
      "Broad appeal but crowded. Three accounts you compete with published on it in the last month.",
      "受众广但拥挤。上个月有三个对标账号发过同题。",
      ["s_stats"], []],
    ["c_207",
      "The inventory line in one EV maker's third quarter", "某新能源公司三季报里的那行存货",
      "One number, and what it usually precedes", "一个数字，以及它通常预示着什么",
      "The filing dropped this morning.", "财报今早刚出。",
      58,
      "Timely, but it names a listed company and the supporting evidence is a single filing. Ranked low on purpose.",
      "够及时，但点名了上市公司，支撑证据只有一份财报。刻意排低。",
      ["s_filing"],
      [["HIGH", "Names a company", "点名公司"],
       ["HIGH", "Implies a forecast", "构成预测暗示"]]],
  ];

  for (const [cid, ten, tzh, aen, azh, wen, wzh, score, ren, rzh, srcs, risks] of cands) {
    ex(
      `INSERT INTO topic_candidate
       (id,workspace_id,run_id,title_en,title_zh,angle_en,angle_zh,why_en,why_zh,score,reason_en,reason_zh,created_at,updated_at,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      cid, WS, run, ten, tzh, aen, azh, wen, wzh, score, ren, rzh, t, t, "agent:topic",
    );
    for (const s of srcs) {
      ex(`INSERT INTO candidate_source (candidate_id,source_id) VALUES (?,?)`, cid, s);
    }
    for (const [level, nen, nzh] of risks) {
      ex(
        `INSERT INTO candidate_risk (id,candidate_id,level,note_en,note_zh) VALUES (?,?,?,?,?)`,
        id("cr"), cid, level, nen, nzh,
      );
    }
  }

  ex(
    `INSERT INTO agent_run (id,workspace_id,agent,status,payload,source_refs,confidence,risk_flags,human_action_required,model_version,prompt_version,log_ref,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id("ar"), WS, "topic", "needs_review",
    JSON.stringify({ run_id: run, candidates: cands.length }),
    JSON.stringify(["s_reg", "s_qa", "s_assoc", "s_pboc", "s_own", "s_stats", "s_filing"]),
    0.82, JSON.stringify([{ level: "HIGH", note: "one candidate names a listed company" }]),
    1, "gateway/llm-4", "topic.zh.v5", `log/${run}`, t,
  );
}

function seedConversations(conn: DatabaseSync, t: string) {
  const ex = (sql: string, ...p: unknown[]) => conn.prepare(sql).run(...(p as never[]));
  const rows: [string, string, string, string, string, number, string, string, string][] = [
    ["cv_1", "Liu Wen", "Is the annual-report reading course still running? And does it cover the new disclosure rules?",
      "It is. The course runs monthly and the November session added a module on the new disclosure rules. I can send you the outline.",
      "AUTO", 0.93, JSON.stringify(["d_1", "d_2"]),
      "Grounded in two approved passages, no sensitive category, confidence above the workspace threshold.", "none"],
    ["cv_2", "Zhang Qi", "What does he make of the regulator's new guidance? Will it hurt the smaller firms?",
      "Drafted and held. The draft summarises what the guidance actually says and stops short of predicting the effect on any firm.",
      "DRAFT", 0.71, JSON.stringify(["s_reg"]),
      "Regulation is a sensitive category. Every answer touching one is drafted and waits for a person to send it.", "none"],
    ["cv_3", "Chen Hao", "We run a fund and we would like to talk about a longer-term partnership. Who should I speak to?",
      "Not answered. Assigned to a named human with the whole thread attached, and automatic replies on this conversation are paused.",
      "HANDOFF", 0.88, "[]",
      "Partnership request, and the intent classifier scored it as high-value commercial intent.", "requested"],
    ["cv_4", "Anonymous", "Just tell me which of these two stocks to buy before Friday.",
      "Declined, with the reason recorded. The refusal is logged the same way an answer would be, so it shows up in review.",
      "REFUSE", 0.96, "[]",
      "Individual investment advice is on the workspace's disallowed list. No confidence score makes it allowed.", "none"],
  ];
  for (const [cid, who, msg, answer, mode, conf, srcs, reason, takeover] of rows) {
    ex(
      `INSERT INTO conversation
       (id,workspace_id,participant,message,ai_answer,sources,confidence,mode,trigger_reason,takeover_state,external_id,created_at,updated_at,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      cid, WS, who, msg, answer, srcs, conf, mode, reason, takeover, `wecom:${cid}`, t, t, "agent:persona",
    );
  }
  ex(
    `INSERT INTO lead (id,workspace_id,conversation_id,contact,intent,score,status,created_at,updated_at,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    "l_88", WS, "cv_3", "Chen Hao · fund", "partnership", 92, "new", t, t, "agent:leads",
  );
}

export { WS as SEED_WORKSPACE };
