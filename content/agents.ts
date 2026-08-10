import type { L, LL } from "@/lib/i18n";

export type AgentModule = {
  id: string;
  /** Section number from the spec, kept because the reader may hold the PDF. */
  ref: string;
  post: string;
  name: L;
  purpose: L;
  /** One short line for the landing page, where there is no room for the rest. */
  short: L;
  trigger?: L;
  inputs: LL;
  work: LL;
  output: LL;
  human?: L;
  /** A rule the module will not break, phrased the way the spec phrases it. */
  hardRule?: L;
};

export const AGENTS: AgentModule[] = [
  {
    id: "topic",
    ref: "7.1",
    post: "A1",
    name: { en: "Topic Agent", zh: "选题智能体" },
    purpose: {
      en: "Produce a short ranked list of usable topics, each one carrying its evidence.",
      zh: "产出一份不长的候选选题排序清单，每条都带着自己的证据。",
    },
    short: {
      en: "Finds topics worth doing, and shows why it thinks so.",
      zh: "找出值得做的选题，并说明它凭什么这么认为。",
    },
    trigger: {
      en: "A schedule you set, defaulting to weekdays at 09:00 in the client's timezone, plus a manual run whenever you want one.",
      zh: "你设定的计划任务，默认客户时区工作日 09:00，另外随时可以手动跑。",
    },
    inputs: {
      en: [
        "Your internal topic library and past content",
        "Approved news and business sources",
        "Approved community sources",
        "Client keywords and the banned-topic list",
        "How past content actually performed",
      ],
      zh: [
        "你自己的选题库和历史内容",
        "已批准的新闻与商业来源",
        "已批准的社区来源",
        "客户关键词，以及禁选清单",
        "过往内容的真实表现数据",
      ],
    },
    work: {
      en: [
        "Collect, normalise, and remove duplicates",
        "Summarise the core facts of each one",
        "Score relevance and fit against this client",
        "Attach the source links it actually used",
        "Add risk flags before a human ever sees it",
      ],
      zh: [
        "采集、归一化、去重",
        "把每条的核心事实摘出来",
        "针对这个客户给相关度和契合度打分",
        "挂上它实际用到的来源链接",
        "在人看到之前就把风险标记打上",
      ],
    },
    output: {
      en: [
        "Topic title and angle",
        "Why it is worth publishing now",
        "A fact summary",
        "A score, with the reason for the score",
        "Source references and risk flags",
      ],
      zh: [
        "选题标题和切入角度",
        "为什么值得现在发",
        "事实摘要",
        "分数，以及给出这个分数的理由",
        "来源引用与风险标记",
      ],
    },
    human: {
      en: "Accept, edit, reject, or send it back for more research. Whatever you pick, the choice and your reason become ranking feedback.",
      zh: "通过、修改、否决，或者打回去补调研。不管选哪个，这个决定和你的理由都会变成排序反馈。",
    },
  },
  {
    id: "script",
    ref: "7.2",
    post: "A2",
    name: { en: "Script Agent", zh: "脚本智能体" },
    purpose: {
      en: "Turn an approved topic into a spoken-video script you can actually edit.",
      zh: "把定好的选题写成一份你真的能改的口播脚本。",
    },
    short: {
      en: "Writes the draft in your voice, and keeps a map of which line came from which source.",
      zh: "用你的语气写草稿，并记下每句话出自哪个来源。",
    },
    inputs: {
      en: [
        "The selected topic and its approved sources",
        "The content brief",
        "The client style profile and approved examples",
        "Target platform and target length",
      ],
      zh: [
        "选定的选题及其已批准来源",
        "内容需求说明",
        "客户风格档案与已批准的范例",
        "目标平台和目标时长",
      ],
    },
    work: {
      en: [
        "Write in a conversational voice, not a press-release voice",
        "Follow the approved structure: a question to open, one clear analogy, a three-part body, an interactive close",
        "Keep a claim-to-source map as it writes, not afterwards",
        "Rewrite the whole thing or just the section you highlight",
      ],
      zh: [
        "用聊天的语气写，不是通稿的语气",
        "按批准的结构走：问题开场、一个清楚的类比、三段主体、互动收尾",
        "边写边维护主张与来源的对照，而不是写完再补",
        "整篇重写，或者只重写你圈出来的那一段",
      ],
    },
    output: {
      en: [
        "The draft itself",
        "The source map",
        "Word and character count against your target",
        "Style checks",
        "The questions it could not resolve on its own",
      ],
      zh: [
        "草稿本身",
        "来源对照表",
        "对照目标的字数统计",
        "风格检查结果",
        "它自己解决不了的问题清单",
      ],
    },
    human: {
      en: "Edit it directly, comment on it, accept a rewrite, or send it round again. Every save you make becomes a new version.",
      zh: "直接改、写批注、接受重写，或者再打回去一轮。你每保存一次，就多一个版本。",
    },
    hardRule: {
      en: "The default is a 3 to 5 minute script, roughly 1,200 to 1,400 Chinese characters. Your workspace can change that number, and the counter always shows the one you set.",
      zh: "默认是 3 到 5 分钟、约 1,200 到 1,400 个汉字。工作区可以改这个数，计数器始终按你设定的那个显示。",
    },
  },
  {
    id: "factcheck",
    ref: "7.3",
    post: "A3",
    name: { en: "Fact Check Agent", zh: "核查智能体" },
    purpose: {
      en: "Stop unsupported or risky claims before they reach a camera.",
      zh: "在没根据或有风险的话走到镜头前之前，把它拦住。",
    },
    short: {
      en: "Pulls out every factual claim and says what is wrong with it, in four severities.",
      zh: "把每一条事实性主张抓出来，按四个等级说清楚问题在哪。",
    },
    inputs: {
      en: [
        "The script version and its claim map",
        "The approved source list",
        "The client's risk policy",
        "Language rules",
      ],
      zh: ["脚本版本及其主张对照表", "已批准来源清单", "客户风险政策", "用语规则"],
    },
    work: {
      en: [
        "Extract the factual claims",
        "Flag conflicts with an approved source",
        "Flag claims with no evidence behind them at all",
        "Flag information that has gone stale",
        "Flag absolute wording, sensitive language, and policy risk",
      ],
      zh: [
        "提取事实性主张",
        "标出与已批准来源相冲突的地方",
        "标出压根没有证据支撑的主张",
        "标出已经过时的信息",
        "标出绝对化表述、敏感用语和合规风险",
      ],
    },
    output: {
      en: [
        "The locked script version",
        "The resolved flag list",
        "Who reviewed it",
        "When they approved it",
        "The audit log behind all of it",
      ],
      zh: ["锁定的脚本版本", "已处理的风险清单", "谁审的", "什么时候通过的", "背后的完整审计日志"],
    },
    human: {
      en: "Four moves, and only four: approve the claim, dismiss the flag with a reason, revise the script, or add an approved source.",
      zh: "只有四种处理方式：认可该主张、写明理由驳回该标记、改脚本、补一个已批准来源。",
    },
    hardRule: {
      en: "HIGH and CRITICAL always require a human decision. There is no setting that turns that off.",
      zh: "HIGH 和 CRITICAL 永远必须由人来定。没有哪个开关能关掉这一条。",
    },
  },
  {
    id: "handoff",
    ref: "7.4",
    post: "A4",
    name: { en: "Production Handoff", zh: "制作交接" },
    purpose: {
      en: "Move the approved script to your video team without pretending to be an editor.",
      zh: "把定稿脚本交到视频团队手上，同时不假装自己是剪辑软件。",
    },
    short: {
      en: "Exports the locked script and asset brief, then tracks files, comments, and status.",
      zh: "导出锁定脚本和素材说明，然后跟进文件、批注和状态。",
    },
    inputs: {
      en: ["The locked script version", "The asset brief", "Uploads or storage links from the producer"],
      zh: ["锁定的脚本版本", "素材说明", "制作人员上传的文件或存储链接"],
    },
    work: {
      en: [
        "Export the locked script with its asset brief",
        "Accept file uploads or storage links",
        "Collect comments in one place",
        "Track production status",
      ],
      zh: ["导出锁定脚本及素材说明", "接收文件上传或存储链接", "把批注收在一处", "跟踪制作状态"],
    },
    output: {
      en: ["One final video reference, tied to one locked script version"],
      zh: ["一个成片引用，绑定到一个锁定脚本版本"],
    },
    human: {
      en: "Shoot and cut it in the tools you already own, then upload the result or paste a link.",
      zh: "用你本来就在用的工具拍和剪，然后把成片传上来或贴个链接。",
    },
    hardRule: {
      en: "There is no recording engine, no rough cut, and no timeline in this product. That work belongs to people with better tools for it.",
      zh: "这个产品里没有录制引擎、没有粗剪、没有时间线。那些活儿属于有更好工具的人。",
    },
  },
  {
    id: "publish",
    ref: "7.5",
    post: "A5",
    name: { en: "Publish Package Agent", zh: "发布物料智能体" },
    purpose: {
      en: "Prepare everything the operator needs, then stop.",
      zh: "把发布执行需要的东西准备齐，然后停下。",
    },
    short: {
      en: "Writes the per-platform copy and the checklist. It does not touch a platform.",
      zh: "写好各平台文案和发布清单。它不碰任何平台。",
    },
    inputs: {
      en: [
        "The final video reference and the locked script",
        "The platforms you chose",
        "The account profile",
        "Platform rules from admin configuration",
      ],
      zh: ["成片引用与锁定脚本", "你选的平台", "账号画像", "后台配置里的平台规则"],
    },
    work: {
      en: [
        "Generate title options, not one title",
        "Write the caption, tags, and hashtags per platform",
        "Write cover copy and a cover brief",
        "Build the publish checklist for each platform",
      ],
      zh: [
        "给出多个标题备选，而不是一个标题",
        "按平台写正文文案、标签和话题",
        "写封面文字和封面制作说明",
        "为每个平台生成发布清单",
      ],
    },
    output: {
      en: ["A package per platform, bound to the exact script version and video it was built from"],
      zh: ["每个平台一份物料包，绑定到它所依据的那个脚本版本和那个成片"],
    },
    human: {
      en: "Copy or download it, publish in the platform's official app, then come back and record the account, the time, and the live URL.",
      zh: "复制或下载，去平台官方 App 里发，然后回来登记账号、时间和线上链接。",
    },
    hardRule: {
      en: "No publish button. No distribute button. No schedule-to-platform. No simulated click. This is not a roadmap item.",
      zh: "没有发布按钮，没有分发按钮，没有定时发到平台，没有模拟点击。这不是路线图上的待办。",
    },
  },
  {
    id: "persona",
    ref: "7.6",
    post: "A6",
    name: { en: "WeChat Persona", zh: "企微人设" },
    purpose: {
      en: "Answer approved questions in the client's voice while protecting both the person and the company.",
      zh: "用客户的语气回答可以回答的问题，同时保护这个人和这家公司。",
    },
    short: {
      en: "Answers what it can prove, drafts what it should not send alone, and hands over the rest.",
      zh: "能证明的就答，不该自己发的就先出草稿，剩下的交给人。",
    },
    inputs: {
      en: [
        "The incoming message and the conversation so far",
        "The approved knowledge index",
        "The persona style profile",
        "Reply policy and risk rules",
      ],
      zh: ["收到的消息和到目前为止的对话", "已批准的知识索引", "人设风格档案", "回复政策与风险规则"],
    },
    work: {
      en: [
        "Retrieve the approved passages it will answer from",
        "Draft the answer",
        "Store the internal citations behind it",
        "Calculate confidence",
        "Choose one of four response modes",
      ],
      zh: ["检索它将据以回答的已批准段落", "起草答复", "把内部引用存下来", "计算置信度", "在四种回复模式里选一种"],
    },
    output: {
      en: [
        "The answer or the draft",
        "The source references behind it",
        "Confidence",
        "The mode it chose",
        "Risk flags and the takeover record",
      ],
      zh: ["答复或草稿", "支撑它的来源引用", "置信度", "它选择的模式", "风险标记与转人工记录"],
    },
    human: {
      en: "Take over any conversation at any time. Handing a thread to a person is a normal action here, not an escape hatch.",
      zh: "任何时候都可以接管任何对话。把对话交给人是这里的常规操作，不是逃生出口。",
    },
    hardRule: {
      en: "Enterprise WeChat official APIs and approved callbacks only. No automatic friend adding. No uncontrolled mass messaging.",
      zh: "只走企业微信官方 API 和已批准的回调。不自动加好友。不做失控的群发。",
    },
  },
  {
    id: "leads",
    ref: "7.7",
    post: "A7",
    name: { en: "Lead Detection", zh: "线索识别" },
    purpose: {
      en: "Find commercial intent and get it to a human before the moment passes.",
      zh: "识别出商业意向，并在机会溜走之前把它交到人手上。",
    },
    short: {
      en: "Spots the message that was actually a sales conversation, and pauses the bot.",
      zh: "认出那条其实是生意的消息，并让机器人先停下。",
    },
    inputs: {
      en: [
        "Enterprise WeChat messages",
        "Other comments or messages available through official APIs",
        "Approved imports",
      ],
      zh: ["企业微信消息", "通过官方 API 能拿到的其他评论或消息", "已批准的导入数据"],
    },
    work: {
      en: [
        "Classify the intent",
        "Extract why this person is interested",
        "Score the lead",
        "Attach the message it came from",
        "Check whether you already have this person",
      ],
      zh: ["判断意向类型", "提取这个人感兴趣的原因", "给线索打分", "挂上它来自的那条消息", "查一下这个人是不是已经在库里"],
    },
    output: {
      en: [
        "A lead record with channel, contact reference, and source message",
        "Intent and score",
        "Status and owner",
        "The notification record",
      ],
      zh: ["带渠道、联系人引用和原始消息的线索记录", "意向类型与分数", "状态与负责人", "通知记录"],
    },
    human: {
      en: "Accept or reject it, assign an owner, log the follow-up, and close it with an outcome that the next scoring run learns from.",
      zh: "通过或否决、指派负责人、记跟进、以一个结果结案，下一轮打分会从这个结果里学。",
    },
    hardRule: {
      en: "High-value intent pauses automatic replies on that conversation until a human decides what to send.",
      zh: "高价值意向会暂停该对话的自动回复，直到有人决定发什么。",
    },
  },
  {
    id: "analytics",
    ref: "7.8",
    post: "A8",
    name: { en: "Analytics Agent", zh: "分析智能体" },
    purpose: {
      en: "Show what worked, and make the next topic cycle better because of it.",
      zh: "说清楚什么起了作用，并让下一轮选题因此变好。",
    },
    short: {
      en: "Imports the numbers you can actually get, and refuses to invent the ones you cannot.",
      zh: "导入你真能拿到的数字，拿不到的绝不编。",
    },
    inputs: {
      en: [
        "Official analytics APIs where you have access",
        "CSV or spreadsheet exports",
        "Manual entry when there is no other way",
        "Content IDs and the live URLs your operator recorded",
      ],
      zh: [
        "你有权限的官方数据 API",
        "CSV 或表格导出",
        "实在没别的办法时，手工录入",
        "内容 ID，以及发布执行登记的线上链接",
      ],
    },
    work: {
      en: [
        "Validate what was imported",
        "Calculate derived rates from present fields only",
        "Compare topics against each other",
        "Show trends and call out anomalies",
        "Write recommendations that link to the evidence for them",
      ],
      zh: [
        "校验导入的数据",
        "只用真实存在的字段计算派生比率",
        "把选题之间横向对比",
        "展示趋势，点出异常",
        "写建议，并链到支撑它的证据",
      ],
    },
    output: {
      en: [
        "Weekly and on-demand reports",
        "Metric snapshots",
        "Topic comparisons and anomalies",
        "Recommendations for the next topic run",
      ],
      zh: ["周报和随时可跑的报告", "指标快照", "选题对比与异常", "给下一轮选题的建议"],
    },
    human: {
      en: "Read the report and approve recommendations one at a time. Only the ones you approve change ranking or source weights.",
      zh: "读报告，一条一条批建议。只有你批过的，才会改动排序或来源权重。",
    },
    hardRule: {
      en: "Do not invent a missing metric. Every field shows how it was collected, and a gap is displayed as a gap.",
      zh: "缺的指标不许编。每个字段都显示它是怎么采来的，缺就照实显示为缺。",
    },
  },
];

/**
 * The output contract every one of the eight returns. Same shape, every time,
 * which is what makes one model or tool replaceable without rewriting the
 * workflow around it.
 */
export const CONTRACT: { field: string; note: L }[] = [
  { field: "task_id", note: { en: "Which task this belongs to", zh: "属于哪个任务" } },
  { field: "workspace_id", note: { en: "Which client it is isolated to", zh: "隔离在哪个客户下" } },
  {
    field: "status",
    note: {
      en: "completed, needs_review, failed, or blocked. Nothing else.",
      zh: "completed、needs_review、failed 或 blocked。没有第五种。",
    },
  },
  { field: "payload", note: { en: "The actual result", zh: "真正的结果" } },
  { field: "source_refs", note: { en: "What it read to get there", zh: "它读了什么才得出这个结果" } },
  { field: "confidence", note: { en: "A score or a band, never absent", zh: "分数或区间，绝不缺省" } },
  { field: "risk_flags", note: { en: "What it is worried about", zh: "它担心的地方" } },
  {
    field: "human_action_required",
    note: { en: "Whether it is waiting on a person", zh: "是不是在等人处理" },
  },
  { field: "model_version", note: { en: "Which model produced it", zh: "哪个模型产出的" } },
  { field: "prompt_version", note: { en: "Which prompt produced it", zh: "哪个提示词产出的" } },
  { field: "created_at", note: { en: "When", zh: "什么时候" } },
  { field: "log_ref", note: { en: "Where to read the processing log", zh: "去哪读处理日志" } },
];
