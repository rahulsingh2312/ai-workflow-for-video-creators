import type { Lang } from "@/lib/i18n";

/**
 * The database stores SCRIPT_LOCKED. A person reading a screen should see
 * "Script locked". Enum identifiers are for the schema, not for the interface.
 */
export const STATE_LABEL: Record<string, { en: string; zh: string }> = {
  NEW: { en: "Just created", zh: "刚建好" },
  TOPIC_REVIEW: { en: "Choosing a topic", zh: "选题待定" },
  TOPIC_SELECTED: { en: "Topic chosen", zh: "选题已定" },
  SCRIPT_DRAFT: { en: "Writing the script", zh: "写脚本中" },
  FACT_REVIEW: { en: "Checking the facts", zh: "核查事实中" },
  SCRIPT_LOCKED: { en: "Script locked", zh: "脚本已锁定" },
  PRODUCTION: { en: "Filming and editing", zh: "拍摄剪辑中" },
  VIDEO_READY: { en: "Video ready", zh: "成片就绪" },
  PUBLISH_PACKAGE_READY: { en: "Ready to publish", zh: "可以发布了" },
  PUBLISHED_MANUALLY: { en: "Published", zh: "已发布" },
  ANALYZED: { en: "Wrapped up", zh: "已复盘" },
};

/**
 * Eleven states is the right number for a workflow engine and too many for a
 * progress bar. These are the six phases a person actually thinks in.
 */
export const PHASES: {
  key: string;
  en: string;
  zh: string;
  states: string[];
}[] = [
  {
    key: "topic",
    en: "Topic",
    zh: "选题",
    states: ["NEW", "TOPIC_REVIEW", "TOPIC_SELECTED"],
  },
  { key: "script", en: "Script", zh: "脚本", states: ["SCRIPT_DRAFT"] },
  {
    key: "review",
    en: "Review",
    zh: "审核",
    states: ["FACT_REVIEW", "SCRIPT_LOCKED"],
  },
  {
    key: "produce",
    en: "Produce",
    zh: "制作",
    states: ["PRODUCTION", "VIDEO_READY"],
  },
  {
    key: "publish",
    en: "Publish",
    zh: "发布",
    states: ["PUBLISH_PACKAGE_READY", "PUBLISHED_MANUALLY"],
  },
  { key: "results", en: "Results", zh: "复盘", states: ["ANALYZED"] },
];

export function phaseOf(state: string) {
  return PHASES.findIndex((p) => p.states.includes(state));
}

export function stateLabel(state: string, lang: Lang) {
  return STATE_LABEL[state]?.[lang] ?? state;
}

/** Resolution words a reviewer picks, said the way a person would say them. */
export const RESOLUTION_LABEL: Record<
  string,
  { en: string; zh: string; hint: { en: string; zh: string } }
> = {
  approved: {
    en: "The claim is fine",
    zh: "这句话没问题",
    hint: {
      en: "You checked it and the script can say this",
      zh: "你核过了，脚本可以这么说",
    },
  },
  dismissed: {
    en: "Not a real problem",
    zh: "不算问题",
    hint: {
      en: "The checker was wrong. Say why.",
      zh: "是核查判断错了，写明原因。",
    },
  },
  revised: {
    en: "I rewrote it",
    zh: "我改过了",
    hint: { en: "The sentence has been changed", zh: "这句话已经改掉了" },
  },
  sourced: {
    en: "I added a source",
    zh: "我补了来源",
    hint: { en: "There is evidence for it now", zh: "现在有证据支撑了" },
  },
};

export const LEVEL_LABEL: Record<
  string,
  { en: string; zh: string; tone: "red" | "amber" }
> = {
  CRITICAL: { en: "Must fix", zh: "必须处理", tone: "red" },
  HIGH: { en: "Must fix", zh: "必须处理", tone: "red" },
  MEDIUM: { en: "Worth a look", zh: "值得看看", tone: "amber" },
  LOW: { en: "Minor", zh: "小问题", tone: "amber" },
};

export const MODE_LABEL: Record<
  string,
  { en: string; zh: string; tone: "green" | "amber" | "red" }
> = {
  AUTO: { en: "Sent automatically", zh: "已自动发送", tone: "green" },
  DRAFT: { en: "Waiting for you to send", zh: "等你点发送", tone: "amber" },
  HANDOFF: { en: "Passed to a person", zh: "已转人工", tone: "amber" },
  REFUSE: { en: "Declined", zh: "已拒答", tone: "red" },
};
