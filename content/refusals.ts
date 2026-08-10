import type { L } from "@/lib/i18n";

/**
 * Signals that never clear. Every item here is straight out of the spec's
 * out-of-scope list or one of its hard rules. None of it is a missing feature
 * waiting on a roadmap, which is why they are drawn as fixed reds rather than
 * as gaps.
 */
export type Refusal = {
  post: string;
  what: L;
  why: L;
};

export const REFUSALS: Refusal[] = [
  {
    post: "R1",
    what: { en: "One-click publishing, to any platform", zh: "任何平台的一键发布" },
    why: {
      en: "Including YouTube. The product prepares the package and stops at the boundary.",
      zh: "YouTube 也包括在内。产品把物料准备好，到边界为止。",
    },
  },
  {
    post: "R2",
    what: { en: "Simulated clicking and browser RPA", zh: "模拟点击与浏览器 RPA" },
    why: {
      en: "No scripted browser is going to log into your account and press things for you.",
      zh: "不会有脚本化浏览器替你登录账号，替你点东西。",
    },
  },
  {
    post: "R3",
    what: { en: "Private platform APIs", zh: "平台私有接口" },
    why: {
      en: "Official APIs or nothing. An integration that depends on a door being left open is not an integration.",
      zh: "要么官方 API，要么不做。靠一扇没关严的门做的对接，不算对接。",
    },
  },
  {
    post: "R4",
    what: { en: "Automatic friend adding", zh: "自动加好友" },
    why: {
      en: "The persona answers people who came to it. It does not go out and collect them.",
      zh: "人设只回答主动来找它的人。它不出去攒人。",
    },
  },
  {
    post: "R5",
    what: { en: "Uncontrolled bulk or group messaging", zh: "失控的批量与群发消息" },
    why: {
      en: "A grounded persona that can also blast a thousand people is not a grounded persona.",
      zh: "一个能对着一千个人群发的人设，不算有据可依的人设。",
    },
  },
  {
    post: "R6",
    what: { en: "A recording, rough-cut, or editing engine", zh: "录制、粗剪或精剪引擎" },
    why: {
      en: "Your team already has tools for this and they are better than anything that would ship here.",
      zh: "这活儿你团队已经有工具了，而且比这里能做出来的都好。",
    },
  },
  {
    post: "R7",
    what: { en: "Training on client data nobody approved", zh: "拿没批准的客户数据去训练" },
    why: {
      en: "Private chats and rejected content never enter a training set on their own. Fine-tuning waits for a written go-ahead.",
      zh: "私聊和被否决的内容不会自己进训练集。微调要等到书面同意。",
    },
  },
  {
    post: "R8",
    what: {
      en: "Autonomous replies on legal, money, complaints, or crisis",
      zh: "法律、金钱、投诉、危机话题的自动回复",
    },
    why: {
      en: "Also partnership requests, negative publicity, personal data, low confidence, and anyone who asks for a human. All of it stops and waits.",
      zh: "还包括合作请求、负面舆情、个人信息、低置信度，以及任何一句“我要找人”。全部停下等人。",
    },
  },
  {
    post: "R9",
    what: { en: "Invented metrics", zh: "编出来的指标" },
    why: {
      en: "If the number was not imported, the report shows an empty field and names the collection method that failed.",
      zh: "没导进来的数字，报告里就是空的，并写明是哪种采集方式没成。",
    },
  },
];
