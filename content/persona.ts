import type { L } from "@/lib/i18n";

export type Mode = "AUTO" | "DRAFT" | "HANDOFF" | "REFUSE";

export type Thread = {
  mode: Mode;
  /** Illustrative sample data. No real person is represented here. */
  from: L;
  time: string;
  message: L;
  /** What the persona produced, or why it produced nothing. */
  reply: L;
  confidence: number;
  sources: L[];
  /** The rule that decided the mode. */
  trigger: L;
  /** What the system did besides reply. */
  side?: L;
};

export const THREADS: Thread[] = [
  {
    mode: "AUTO",
    from: { en: "Liu Wen · Contact", zh: "刘雯 · 外部联系人" },
    time: "09:14",
    message: {
      en: "Is the annual-report reading course still running? And does it cover the new disclosure rules?",
      zh: "请问年报精读那个课还开吗？会讲新的信息披露规则吗？",
    },
    reply: {
      en: "It is. The course runs monthly and the November session added a module on the new disclosure rules. I can send you the outline.",
      zh: "还开的。这门课每月一期，十一月这期新加了一节讲信息披露新规。需要的话我把大纲发你。",
    },
    confidence: 0.93,
    sources: [
      { en: "Course handbook v4, section 2.1", zh: "课程手册 v4，2.1 节" },
      { en: "FAQ v11, question 6", zh: "常见问题 v11，第 6 条" },
    ],
    trigger: {
      en: "Grounded in two approved passages, no sensitive category, confidence above the workspace threshold.",
      zh: "有两段已批准内容支撑，不涉敏感类别，置信度高于工作区阈值。",
    },
  },
  {
    mode: "DRAFT",
    from: { en: "Zhang Qi · Contact", zh: "张琦 · 外部联系人" },
    time: "10:02",
    message: {
      en: "What does he make of the regulator's new guidance? Will it hurt the smaller firms?",
      zh: "老师怎么看监管新出的这个指引？对小机构是不是打击很大？",
    },
    reply: {
      en: "Drafted and held. The draft summarises what the guidance actually says and stops short of predicting the effect on any firm.",
      zh: "已起草并扣下。草稿只复述指引原文写了什么，没有去预测它对任何机构的影响。",
    },
    confidence: 0.71,
    sources: [{ en: "Regulator notice, 2026-07-18", zh: "监管通知，2026-07-18" }],
    trigger: {
      en: "Regulation is a sensitive category. Every answer touching one is drafted and waits for a person to send it.",
      zh: "监管属于敏感类别。凡是碰到敏感类别的答复，一律先出草稿，等人来发。",
    },
  },
  {
    mode: "HANDOFF",
    from: { en: "Chen Hao · Contact", zh: "陈浩 · 外部联系人" },
    time: "11:37",
    message: {
      en: "We run a fund and we would like to talk about a longer-term partnership. Who should I speak to?",
      zh: "我们这边是做基金的，想聊聊长期合作。这边找谁对接比较合适？",
    },
    reply: {
      en: "Not answered. Assigned to a named human with the whole thread attached, and automatic replies on this conversation are paused until they decide what to send.",
      zh: "不作答。已连同完整对话指派给具体的人，并暂停本对话的自动回复，直到他决定发什么。",
    },
    confidence: 0.88,
    sources: [],
    trigger: {
      en: "Partnership request, and the intent classifier scored it as high-value commercial intent.",
      zh: "属于合作请求，且意向分类器判定为高价值商业意向。",
    },
    side: {
      en: "A lead was created: channel, contact reference, the message it came from, intent, score, owner, and the notification record.",
      zh: "已生成一条线索：渠道、联系人引用、来自哪条消息、意向、分数、负责人、通知记录。",
    },
  },
  {
    mode: "REFUSE",
    from: { en: "Anonymous · Contact", zh: "匿名 · 外部联系人" },
    time: "14:20",
    message: {
      en: "Just tell me which of these two stocks to buy before Friday.",
      zh: "你就直接说，这两只股票周五前我该买哪只？",
    },
    reply: {
      en: "Declined, with the reason recorded. The refusal is logged the same way an answer would be, so it shows up in review.",
      zh: "拒答，并记下原因。拒答和答复一样会留痕，因此在复盘时能看到。",
    },
    confidence: 0.96,
    sources: [],
    trigger: {
      en: "Individual investment advice is on the workspace's disallowed list. No confidence score makes it allowed.",
      zh: "个股投资建议在工作区的禁答清单上。置信度再高也不放行。",
    },
  },
];

export const MODE_ASPECT: Record<Mode, "clear" | "caution" | "danger"> = {
  AUTO: "clear",
  DRAFT: "caution",
  HANDOFF: "caution",
  REFUSE: "danger",
};
