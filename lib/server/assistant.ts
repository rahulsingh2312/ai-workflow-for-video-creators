import { all, one } from "@/lib/server/db";
import type { Session } from "@/lib/server/auth";
import {
  factCheck,
  generatePackages,
  generateScript,
  readPublished,
  runTopicAgent,
} from "@/lib/server/agents";
import { proveRoute, runForward } from "@/lib/server/interlocking";

/*
  Driving the workspace by typing.

  The rule this whole file is built around comes from the interlocking: every
  route names an authority, and some of those authorities are people. Where the
  authority is an agent — find topics, write the draft, check the facts, build
  the packages, read the results — the assistant runs it, because that is
  already a machine doing the work and a person asking for it.

  Where the authority is a person — accepting a topic, resolving a flag,
  locking a script, recording a publication — the assistant does not act. It
  says what it would do and hands it back to be confirmed on the screen that
  owns it. Those decisions are the ones the audit log has to attribute to a
  named human with a reason, and an assistant that clicked them on request
  would quietly turn the whole record into fiction.

  Routing is deterministic rather than model-driven, for the same reason the
  gateway ships a rules provider: an operator console that only works when an
  API key is present is not a console. The model is not consulted here at all.
*/

export type AssistantReply = {
  /** What to say back. */
  reply: string;
  /** A screen to move to, when the answer lives somewhere. */
  screen?: string;
  /** Set when the assistant ran something. */
  ran?: { action: string; detail: string };
  /** Set when a person has to be the one to do it. */
  handoff?: { action: string; where: string };
  /** Follow-up chips, so the next step is one tap rather than a guess. */
  chips?: string[];
};

type Lang = "en" | "zh";
const pick = (lang: Lang, en: string, zh: string) => (lang === "zh" ? zh : en);

/* ── What the assistant can see ──────────────────────────────────────────── */

function currentTask(session: Session) {
  return one<{ id: string; state: string; title_en: string; title_zh: string }>(
    `SELECT id,state,title_en,title_zh FROM content_task
      WHERE workspace_id = ? AND state != 'ANALYZED'
      ORDER BY updated_at DESC LIMIT 1`,
    session.workspaceId,
  );
}

function waitingTopics(session: Session) {
  return (
    one<{ n: number }>(
      "SELECT count(*) n FROM topic_candidate WHERE workspace_id = ? AND decision IS NULL",
      session.workspaceId,
    )?.n ?? 0
  );
}

function openFlags(taskId: string) {
  return all<{ id: string; level: string; category_en: string; category_zh: string }>(
    `SELECT f.id,f.level,f.category_en,f.category_zh
       FROM risk_flag f
       JOIN script_version v ON v.id = f.version_id
      WHERE v.task_id = ? AND f.resolution IS NULL
        AND f.level IN ('HIGH','CRITICAL')`,
    taskId,
  );
}

/* ── Intents ─────────────────────────────────────────────────────────────── */

/*
  Matched in order, so the specific ones come first: "what is blocking the
  script" is a status question, not a request to write one, and it has to be
  tested before the bare verb.
*/
const INTENTS: { key: string; re: RegExp }[] = [
  { key: "status", re: /what.*(next|blocked|blocking|holding|状态|卡在|下一步)|status|where are we|进度/i },
  { key: "topics", re: /find|discover|new topic|suggestion|trending|viral|找选题|选题|热门/i },
  { key: "script", re: /write|draft|script|写|脚本|初稿/i },
  { key: "factcheck", re: /fact.?check|check the facts|verify|claims|核查|核对|事实/i },
  { key: "packages", re: /package|publish kit|caption|物料|文案/i },
  { key: "results", re: /result|metric|how did it do|views|comment|数据|表现|评论/i },
  { key: "leads", re: /lead|customer|buyer|线索|客户/i },
  { key: "lock", re: /lock|freeze|锁定/i },
  { key: "accept", re: /accept|approve the topic|take (it|this one)|采用|通过选题/i },
  { key: "resolve", re: /resolve|dismiss|flag|处理|标记/i },
  { key: "record", re: /record|went live|published it|登记|发布了/i },
];

/* ── The one entry point ─────────────────────────────────────────────────── */

export async function ask(
  session: Session,
  message: string,
  lang: Lang = "en",
): Promise<AssistantReply> {
  const t = (en: string, zh: string) => pick(lang, en, zh);
  const text = message.trim();
  if (!text) {
    return {
      reply: t("Ask me what to do next, or tell me to run something.", "问我下一步做什么，或者直接让我跑一个动作。"),
      chips: [t("What's next?", "下一步是什么？"), t("Find topics", "找选题")],
    };
  }

  const intent = INTENTS.find((i) => i.re.test(text))?.key ?? "status";
  const task = currentTask(session);
  const title = task ? (lang === "zh" ? task.title_zh : task.title_en) : null;

  switch (intent) {
    /* ── Things the assistant runs itself ──────────────────────────────── */

    case "topics": {
      const result = await runTopicAgent(session);
      const p = result.payload as {
        candidates: number;
        refreshed: number;
        videos: number;
        unsourced: string[];
      };
      if (result.status === "failed") {
        return {
          reply: t(
            `That run found nothing usable. ${p.unsourced?.length ? `Trending with no approved source: ${p.unsourced.join(", ")}.` : ""}`,
            `这次没找到能用的。${p.unsourced?.length ? `有热度但没有已批准来源：${p.unsourced.join("、")}。` : ""}`,
          ),
          screen: "topics",
        };
      }
      return {
        reply: t(
          `Read ${p.videos} videos. ${p.candidates} new topic${p.candidates === 1 ? "" : "s"}, ${p.refreshed} refreshed with newer proof.` +
            (p.unsourced?.length
              ? ` ${p.unsourced.join(", ")} is trending but no approved source covers it, so I left it alone.`
              : ""),
          `看了 ${p.videos} 条视频。新增 ${p.candidates} 条选题，${p.refreshed} 条依据有更新。` +
            (p.unsourced?.length ? ` ${p.unsourced.join("、")}有热度，但没有已批准来源，我没有立候选。` : ""),
        ),
        screen: "topics",
        ran: { action: "topics", detail: `${p.candidates} new, ${p.refreshed} refreshed` },
        chips: [t("What's next?", "下一步是什么？")],
      };
    }

    case "script": {
      if (!task) return noTask(t);
      const result = await generateScript(session, task.id);
      // The same forward step the buttons take. Running an agent without it
      // leaves the task a state behind, reporting itself clear.
      if (result.status !== "failed") runForward(session, task.id, "Draft generated");
      const p = result.payload as { label: string; chars: number; modelled_on: string[] };
      return {
        reply: t(
          `Wrote ${p.label}, ${p.chars} characters` +
            (p.modelled_on?.length ? `, shaped by ${p.modelled_on.length} video${p.modelled_on.length === 1 ? "" : "s"} the audience is already watching. Facts came only from the approved sources.` : "."),
          `写好了 ${p.label}，${p.chars} 字` +
            (p.modelled_on?.length ? `，形式参考了 ${p.modelled_on.length} 条观众正在看的视频。事实只取自已批准来源。` : "。"),
        ),
        screen: "task",
        ran: { action: "script", detail: p.label },
        chips: [t("Check the facts", "核对事实")],
      };
    }

    case "factcheck": {
      if (!task) return noTask(t);
      const latest = one<{ id: string }>(
        "SELECT id FROM script_version WHERE task_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1",
        task.id,
      );
      if (!latest) {
        return {
          reply: t("There is no draft to check yet.", "还没有可核对的初稿。"),
          screen: "task",
          chips: [t("Write the draft", "写初稿")],
        };
      }
      const result = await factCheck(session, latest.id);
      if (result.status !== "failed")
        runForward(session, task.id, "Claims extracted and flagged");
      const p = result.payload as { flags: number; blocking: number };
      return {
        reply: t(
          `Checked it. ${p.flags} flag${p.flags === 1 ? "" : "s"}, ${p.blocking} that need your call before it can lock.`,
          `核完了。${p.flags} 处标记，其中 ${p.blocking} 处要你定了才能锁。`,
        ),
        screen: "task",
        ran: { action: "factcheck", detail: `${p.flags} flags` },
        chips: [t("What's next?", "下一步是什么？")],
      };
    }

    case "packages": {
      if (!task) return noTask(t);
      const result = await generatePackages(session, task.id);
      if (result.status !== "failed")
        runForward(session, task.id, "Packages generated");
      const p = result.payload as { platforms: string[] };
      return {
        reply: t(
          `Built packages for ${p.platforms?.join(", ") ?? "the enabled platforms"}. Posting is still yours to do.`,
          `已生成 ${p.platforms?.join("、") ?? "已启用平台"}的物料。发布还是要你自己来。`,
        ),
        screen: "publish",
        ran: { action: "packages", detail: (p.platforms ?? []).join(", ") },
      };
    }

    case "results": {
      const pkg = one<{ id: string }>(
        `SELECT p.id FROM publish_package p JOIN content_task c ON c.id = p.task_id
          WHERE c.workspace_id = ? AND p.status = 'published'
          ORDER BY p.published_at DESC LIMIT 1`,
        session.workspaceId,
      );
      if (!pkg) {
        return {
          reply: t("Nothing is published yet, so there is nothing to read back.", "还没有已发布的内容，读不回数据。"),
          screen: "publish",
        };
      }
      const result = await readPublished(session, pkg.id);
      const p = result.payload as {
        connector: string;
        metrics: { views: number; likes: number; comments: number } | null;
        leads: number;
        missing: string[];
      };
      if (!p.metrics) {
        return {
          reply: t(
            `No connector can read that one back, so I did not guess. Import ${p.missing.join(", ")} by hand.`,
            `没有连接器能读回那条，我不会去猜。${p.missing.join("、")}需要手动导入。`,
          ),
          screen: "analytics",
        };
      }
      return {
        reply: t(
          `${p.metrics.views.toLocaleString()} views, ${p.metrics.comments.toLocaleString()} comments` +
            (p.leads ? `, and ${p.leads} commenter${p.leads === 1 ? "" : "s"} asking something worth answering.` : "."),
          `${p.metrics.views.toLocaleString()} 次播放，${p.metrics.comments.toLocaleString()} 条评论` +
            (p.leads ? `，其中 ${p.leads} 位在问值得回的问题。` : "。"),
        ),
        screen: p.leads ? "leads" : "analytics",
        ran: { action: "readback", detail: `${p.leads} leads` },
      };
    }

    case "leads":
      return {
        reply: t("Here are the people who sounded like business.", "这些是听起来像生意的人。"),
        screen: "leads",
      };

    /* ── Things only a person may do ───────────────────────────────────── */

    case "accept":
      return {
        reply: t(
          "Taking a topic is your call, and it needs a reason — that reason is what teaches the next round what you like. I have opened the list.",
          "选题采用要你来定，而且要写理由——下一轮就是照着这个理由来的。清单我已经打开了。",
        ),
        screen: "topics",
        handoff: { action: "accept a topic", where: "Topics" },
      };

    case "resolve": {
      if (!task) return noTask(t);
      const flags = openFlags(task.id);
      return {
        reply: flags.length
          ? t(
              `${flags.length} flag${flags.length === 1 ? "" : "s"} still need a human: ${flags.map((f) => f.category_en).join(", ")}. Dismissing one needs a reason, so it has to be you.`,
              `还有 ${flags.length} 处要人来定：${flags.map((f) => f.category_zh).join("、")}。判定为不是问题必须写理由，所以得你来。`,
            )
          : t("Nothing is flagged for you right now.", "现在没有要你处理的标记。"),
        screen: "task",
        handoff: flags.length ? { action: "resolve flags", where: "Script" } : undefined,
      };
    }

    case "lock":
      return {
        reply: t(
          "Locking freezes the version filming will use, so a reviewer has to be the one to do it. I have opened the script.",
          "锁定会把开拍要用的版本定死，所以必须由审核的人来点。脚本我已经打开了。",
        ),
        screen: "task",
        handoff: { action: "lock the script", where: "Script" },
      };

    case "record":
      return {
        reply: t(
          "Recording where it went live is a record of something you did somewhere else, so I cannot make it for you. The link is what ties the metrics back to this version.",
          "登记发布地址，记录的是你在别处做过的事，我没法替你填。这条链接是把数据接回这一版的凭据。",
        ),
        screen: "publish",
        handoff: { action: "record the publication", where: "Publish" },
      };

    /* ── Status ────────────────────────────────────────────────────────── */

    default: {
      const waiting = waitingTopics(session);
      if (!task) {
        return {
          reply: t(
            `Nothing is in flight. ${waiting} topic${waiting === 1 ? "" : "s"} waiting on your decision.`,
            `现在没有在跑的内容。有 ${waiting} 条选题等你定。`,
          ),
          screen: "topics",
          chips: [t("Find topics", "找选题")],
        };
      }
      const proof = proveRoute(session.workspaceId, task.id);
      const held = (proof?.conditions ?? []).filter((c) => !c.proved);
      const authority = proof?.authority_en ?? "";
      const mine = /Reviewer|Producer|Publisher/i.test(authority);
      return {
        reply: held.length
          ? t(
              `"${title}" is at ${proof?.from}. Held on: ${held.map((c) => c.label_en).join("; ")}. ${mine ? "That one is yours." : `${authority} has it.`}`,
              `《${title}》停在 ${proof?.from}。卡在：${held.map((c) => c.label_zh).join("；")}。${mine ? "这一步要你来。" : `由${proof?.authority_zh}负责。`}`,
            )
          : t(`"${title}" is clear to move on.`, `《${title}》可以往下走了。`),
        screen: "task",
        chips: held.length ? [] : [t("What's next?", "下一步是什么？")],
      };
    }
  }
}

function noTask(t: (en: string, zh: string) => string): AssistantReply {
  return {
    reply: t(
      "There is no content task open. Take a topic first and I will pick it up from there.",
      "现在没有在做的内容。先采用一条选题，我接着往下做。",
    ),
    screen: "topics",
    chips: [t("Find topics", "找选题")],
  };
}
