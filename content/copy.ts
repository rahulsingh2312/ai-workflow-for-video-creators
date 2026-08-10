import type { L, LL } from "@/lib/i18n";

/** `{name}` is replaced at render with whatever lib/brand.ts is set to. */

export const NAV: { href: string; label: L }[] = [
  { href: "/workflow", label: { en: "The line", zh: "线路" } },
  { href: "/agents", label: { en: "Agents", zh: "智能体" } },
  { href: "/security", label: { en: "Audit", zh: "审计" } },
  { href: "/workspace", label: { en: "Workspace", zh: "工作台" } },
];

export const HERO = {
  h1: {
    en: "Nothing moves until the evidence clears.",
    zh: "证据不清，一步都动不了。",
  },
  sub: {
    en: "{name} carries a topic to a locked, fact-checked script, hands that script to your video team, and lays out everything your operator needs to publish by hand. It has no publish button. That part is on purpose.",
    zh: "{name} 把一个选题一路带到锁定、核过事实的脚本，把脚本交给你的视频团队，再把发布执行需要的东西一次摆齐。它没有发布按钮。这一点是故意的。",
  },
  primary: { en: "Open the workspace", zh: "打开工作台" },
  secondary: { en: "Walk the line", zh: "沿线走一遍" },
  panelTitle: { en: "Content task, route setting", zh: "内容任务 · 排列进路" },
  boundary: {
    en: "Boundary. No authority beyond this signal.",
    zh: "边界。此信号之外无权限。",
  },
  callRoute: { en: "Call the route", zh: "排列进路" },
  reset: { en: "Reset", zh: "复位" },
  proving: { en: "Proving", zh: "校验中" },
  proved: { en: "Proved", zh: "已证" },
  held: { en: "Held at danger", zh: "禁止通行" },
  handover: { en: "Handed to a person", zh: "已交人工" },
  boundaryShort: { en: "Boundary", zh: "边界" },
  legend: {
    en: "Red is at danger. Amber is proving. Green has cleared. Those are the only three colours on this site, and each one is data.",
    zh: "红是禁止，黄是校验中，绿是放行。整站只有这三种颜色，每一种都代表状态。",
  },
  keyTitle: { en: "Key", zh: "图例" },
  key: {
    danger: {
      en: "At danger. A condition will not prove, and the task holds where it is.",
      zh: "禁止。有条件不成立，任务停在原地。",
    },
    caution: { en: "Proving. Conditions are being checked right now.", zh: "校验中。正在逐条检查条件。" },
    clear: { en: "Cleared. Every condition proved, and a person signed where one was required.", zh: "放行。条件全部成立，需要签字的地方有人签了。" },
    boundary: {
      en: "Boundary. Track beyond this marker belongs to a person, not to this product.",
      zh: "边界。这个标记之外的线路属于人，不属于这个产品。",
    },
  },
  keyNote: {
    en: "Three colours, and every one of them is data. Nothing on this site is coloured for decoration.",
    zh: "三种颜色，每一种都代表状态。本站不为了好看而上色。",
  },
};

export const SECTIONS = {
  line: {
    h: { en: "Eleven blocks, and you cannot skip one.", zh: "十一个闭塞区间，一个都跳不过去。" },
    p: {
      en: "Every content task sits in exactly one block at a time. The state names are not decoration: they are the same eleven strings the workflow service, the database, and the audit log all agree on. Pick a block to see what has to prove before the signal ahead of it clears.",
      zh: "任何内容任务在同一时刻只处在一个区间里。这些状态名不是装饰：工作流服务、数据库和审计日志用的是同样这十一个字符串。点开任一区间，看看前方信号放行前必须先证明什么。",
    },
  },
  table: {
    h: { en: "What has to prove before a signal clears", zh: "信号放行前，必须证明什么" },
    p: {
      en: "A signalling interlocking is a table of routes and the conditions each one requires. Read a row left to right: the move, who is allowed to call it, and what happens when a condition will not prove. The interesting column is the last one.",
      zh: "联锁本质上是一张表：有哪些进路，每条进路要满足什么条件。一行从左往右读：这一步是什么、谁有权排这条进路、条件不成立时会怎样。最值得看的是最后一列。",
    },
    col: {
      route: { en: "Route", zh: "进路" },
      authority: { en: "Called by", zh: "排路人" },
      fail: { en: "If a condition will not prove", zh: "条件不成立时" },
    },
  },
  agents: {
    h: { en: "Eight agents, one output contract", zh: "八个智能体，一份输出契约" },
    p: {
      en: "Each agent sits behind the same input and output interface, which is the whole reason you can swap a model or a tool without rewriting the workflow around it. Every one of them returns these twelve fields, every time, including when it fails.",
      zh: "每个智能体都在同一套输入输出接口后面，这正是你能换模型、换工具而不必重写整条工作流的原因。它们每一次都返回下面这十二个字段，失败时也一样。",
    },
    contractTitle: { en: "Common output contract", zh: "通用输出契约" },
    more: { en: "Full module detail", zh: "完整模块说明" },
  },
  refusals: {
    h: { en: "Signals that never clear", zh: "永远不会放行的信号" },
    p: {
      en: "These are not gaps in the build. They are decisions, and they are the reason the rest of it can be trusted. Nine reds, fixed.",
      zh: "这些不是没做完的部分，而是决定，也正是其余部分值得信任的原因。九个红灯，固定不变。",
    },
  },
  persona: {
    h: { en: "It answers what it can prove, and hands over the rest", zh: "能证明的它就答，剩下的交给人" },
    p: {
      en: "Inside Enterprise WeChat, through official APIs and approved callbacks only. Every answer carries the internal passages it was built from and a confidence score, and the mode it picks is visible to you before anything is sent.",
      zh: "在企业微信里，只走官方 API 和已批准的回调。每条回答都带着它所依据的内部段落和置信度，它选了哪种模式，在发出之前你就看得到。",
    },
    modes: {
      AUTO: {
        en: "Grounded, low risk, high confidence. Sent on its own.",
        zh: "有据可依、低风险、高置信。自动发出。",
      },
      DRAFT: {
        en: "Written, held, and waiting for a person to press send.",
        zh: "写好了，先扣着，等人点发送。",
      },
      HANDOFF: {
        en: "Not answered. Assigned to a named human, with the thread attached.",
        zh: "不作答。指派给具体的人，并附上完整对话。",
      },
      REFUSE: {
        en: "Out of bounds. Declined, logged, and the reason recorded.",
        zh: "越界。拒答、留痕、记下原因。",
      },
    },
  },
  provenance: {
    h: { en: "Every sentence has a paper trail", zh: "每句话都留得下痕迹" },
    p: {
      en: "Pick any line in a published video and you can walk backwards: the claim, the source it came from, the reviewer who accepted it, the version that got locked, the video bound to that version, the package built from the pair, the account and time it was published under, and the metrics that came back.",
      zh: "从已发布视频里随便挑一句话，你都能倒着走回去：这条主张、它来自哪个来源、谁审过、锁的是哪个版本、绑定这个版本的成片、依据这一对生成的物料包、用哪个账号什么时候发的、以及回来的数据。",
    },
    chain: {
      en: [
        "Claim in the script",
        "Source reference and trust level",
        "Reviewer, decision, reason, timestamp",
        "Locked script version, with its parent",
        "Final video bound to that version",
        "Publish package built from the pair",
        "Account, publish time, live URL",
        "Metric snapshot and collection method",
      ],
      zh: [
        "脚本里的一条主张",
        "来源引用与可信级别",
        "审核人、决定、理由、时间戳",
        "锁定脚本版本，及其父版本",
        "绑定该版本的成片",
        "依据这一对生成的发布物料包",
        "账号、发布时间、线上链接",
        "指标快照与采集方式",
      ],
    } satisfies LL,
  },
  close: {
    h: { en: "The line ends here. A person takes it from the boundary.", zh: "线路到此为止。边界之后，交给人。" },
    p: {
      en: "That is the entire pitch. Everything upstream of the boundary is versioned, sourced, and signed for. Everything past it belongs to someone with a name.",
      zh: "整个主张就这么多。边界以前的每一步都有版本、有来源、有人签字。边界以后，属于一个有名有姓的人。",
    },
  },
};

export const PAGES = {
  workflow: {
    title: { en: "The line", zh: "线路" },
    h1: { en: "The line, block by block", zh: "线路：逐区间说明" },
    lede: {
      en: "Eleven states, ten routes between them, and the conditions each route needs before its signal will clear. Below that, the five rules that revoke a clearance once it has been given.",
      zh: "十一个状态、十条进路，以及每条进路放行前需要满足的条件。再往下是五条规则，它们会把已经给出的放行收回去。",
    },
    invalidationH: { en: "Clearances that get revoked", zh: "会被收回的放行" },
    invalidationP: {
      en: "An interlocking is not a checklist, because a checklist only ever moves forward. Clearing one condition re-proves every route that depended on it, and breaking one takes those routes back.",
      zh: "联锁不是清单，因为清单只会往前走。满足一个条件，会重新验证所有依赖它的进路；破坏一个条件，那些进路也就一并收回。",
    },
    colTrigger: { en: "When this happens", zh: "当发生这件事" },
    colEffect: { en: "This is revoked", zh: "这一项被收回" },
  },
  agents: {
    title: { en: "Agents", zh: "智能体" },
    h1: { en: "Eight modules, in full", zh: "八个模块，完整说明" },
    lede: {
      en: "Purpose, trigger, inputs, what the agent does, what it returns, and what a person does with it. Where a module refuses something, the refusal is written into the module rather than left to policy.",
      zh: "用途、触发方式、输入、智能体做什么、返回什么、以及人拿到之后做什么。模块拒绝做的事，写在模块里，而不是丢给制度去管。",
    },
    labels: {
      purpose: { en: "Purpose", zh: "用途" },
      trigger: { en: "Trigger", zh: "触发" },
      inputs: { en: "Inputs", zh: "输入" },
      work: { en: "What it does", zh: "它做什么" },
      output: { en: "What it returns", zh: "它返回什么" },
      human: { en: "What you do", zh: "你做什么" },
      hard: { en: "Will not budge", zh: "不让步的地方" },
    },
  },
  security: {
    title: { en: "Audit", zh: "审计" },
    h1: { en: "Who changed what, when, and why", zh: "谁改了什么、什么时候改的、为什么" },
    lede: {
      en: "Role-based access, client-level isolation, an audit event on every meaningful action, and failure rules that keep a broken integration visible instead of silent.",
      zh: "基于角色的权限、客户级别的数据隔离、每个有意义的动作都留一条审计事件，以及一套失败规则：让坏掉的对接留在明面上，而不是悄无声息。",
    },
  },
  workspace: {
    title: { en: "Workspace", zh: "工作台" },
  },
};

export const SECURITY = {
  audited: {
    h: { en: "Actions that write an audit event", zh: "会写审计事件的动作" },
    items: {
      en: [
        "Generation",
        "Edit",
        "Review",
        "Lock",
        "Handoff",
        "Publish record",
        "AI reply",
        "Takeover",
        "Lead status change",
      ],
      zh: ["生成", "编辑", "审核", "锁定", "交接", "发布登记", "AI 回复", "转人工", "线索状态变更"],
    } satisfies LL,
    note: {
      en: "Each event shows who changed the record, when, what it looked like before, and the reason where a reason is required.",
      zh: "每条事件都显示：谁改的、什么时候、改之前长什么样，以及在需要理由的场合，理由是什么。",
    },
  },
  isolation: {
    h: { en: "How clients stay apart", zh: "客户之间怎么隔开" },
    items: {
      en: [
        "Every core record carries a workspace ID. There is no shared table without one.",
        "Each client and personal brand gets its own retrieval namespace.",
        "Restricted or expired documents cannot be retrieved by an agent, checked at answer time.",
        "Encryption in transit and at rest.",
        "API keys, private source text, and internal citations are never exposed to a user who lacks the role for them.",
      ],
      zh: [
        "每条核心记录都带工作区 ID。没有哪张共享表可以不带。",
        "每个客户、每个个人品牌，各自一个独立的检索命名空间。",
        "受限或过期的文档，智能体检索不到，且是在回答时检查的。",
        "传输中和静态存储都加密。",
        "API 密钥、来源原文、内部引用，绝不暴露给没有相应角色的人。",
      ],
    } satisfies LL,
  },
  failure: {
    h: { en: "When something breaks", zh: "出问题的时候" },
    items: {
      en: [
        "Jobs are retry-safe, and duplicate topics, replies, leads, and metric imports are prevented rather than cleaned up afterwards.",
        "A failed integration leaves the task visible with a clear error and a manual fallback, not a silent retry loop.",
        "A detected crisis or high-value lead pauses the AI reply and notifies the assigned human.",
        "Retention and deletion rules for documents, chats, contact data, and leads are set per client, not globally.",
      ],
      zh: [
        "任务可安全重试，重复的选题、回复、线索和指标导入是被拦住的，而不是事后再清理。",
        "对接失败时，任务带着明确的错误信息留在界面上，并给出手动兜底方案，而不是默默重试。",
        "识别到危机或高价值线索，立即暂停 AI 回复，并通知指定的人。",
        "文档、聊天、联系人数据和线索的留存与删除规则，按客户设定，不搞一刀切。",
      ],
    } satisfies LL,
  },
  ingestion: {
    h: { en: "How a client document becomes retrievable", zh: "客户文档怎么变成可检索的" },
    steps: {
      en: [
        "Upload",
        "Parse or OCR",
        "Add metadata and permissions",
        "Review",
        "Chunk",
        "Embed",
        "Index",
        "Publish to the approved set",
      ],
      zh: ["上传", "解析或 OCR", "补元数据与权限", "审核", "切块", "向量化", "建索引", "发布到已批准集合"],
    } satisfies LL,
    note: {
      en: "A new version of a document does not silently overwrite the evidence a past output already used. Old results keep pointing at what they actually read.",
      zh: "文档出新版本，不会悄悄覆盖过去输出所依据的证据。旧结果仍然指向它当时真正读到的东西。",
    },
  },
  model: {
    h: { en: "What the model does and does not learn", zh: "模型学什么，不学什么" },
    items: {
      en: [
        "An existing pretrained model, reached through a gateway that handles provider switching, cost limits, model versions, and structured output.",
        "RAG for client facts, with the approved passages retrieved at answer time and the references kept.",
        "Prompts and examples for voice, structure, and format.",
        "Separate classifiers or rules for risk, moderation, lead intent, and confidence, wherever those are cheaper to test than a full model call.",
        "Fine-tuning is optional, comes after a separate data review, and needs the client to say yes in writing.",
        "Every generated result records the model, the prompt, the knowledge version, and the source set behind it.",
      ],
      zh: [
        "用现成的预训练模型，通过网关接入，由网关负责切换供应商、成本上限、模型版本和结构化输出。",
        "客户事实走 RAG，回答时实时检索已批准段落，并保留引用。",
        "语气、结构和格式，靠提示词和范例来调。",
        "风险、审核、线索意向和置信度，凡是比整次模型调用更容易测的，就用单独的分类器或规则。",
        "微调是可选项，要先过一遍单独的数据审查，还要客户书面同意。",
        "每个生成结果都记下模型、提示词、知识版本和来源集合。",
      ],
    } satisfies LL,
  },
  roles: {
    h: { en: "Six roles", zh: "六种角色" },
    items: [
      {
        role: { en: "Contributor", zh: "内容执行" },
        can: { en: "Creates topics, drafts, and content tasks.", zh: "建选题、写草稿、建内容任务。" },
      },
      {
        role: { en: "Reviewer", zh: "审核" },
        can: {
          en: "Resolves fact and risk flags, approves topics, locks scripts.",
          zh: "处理事实与风险标记，通过选题，锁定脚本。",
        },
      },
      {
        role: { en: "Producer", zh: "制作" },
        can: {
          en: "Receives the locked script and uploads production files.",
          zh: "接收锁定脚本，上传制作文件。",
        },
      },
      {
        role: { en: "Publishing operator", zh: "发布执行" },
        can: {
          en: "Receives the package, publishes by hand, records the live URL.",
          zh: "接收物料包，手动发布，登记线上链接。",
        },
      },
      {
        role: { en: "Support or sales", zh: "客服或销售" },
        can: {
          en: "Takes over conversations, reviews leads, records follow-up.",
          zh: "接管对话、审线索、记跟进。",
        },
      },
      {
        role: { en: "Admin", zh: "管理员" },
        can: {
          en: "Users, workspaces, sources, models, integrations, risk rules, retention.",
          zh: "用户、工作区、来源、模型、集成、风险规则、留存策略。",
        },
      },
    ],
    note: {
      en: "One person often holds several of these. The point is not to make life hard, it is that the audit log can say which hat someone was wearing.",
      zh: "一个人常常同时兼几种角色。这么分不是为了给人添麻烦，而是为了让审计日志能说清楚：当时他是以什么身份做的。",
    },
  },
};

export const FOOTER = {
  builtFrom: {
    en: "This site was built from a 10-page MVP product specification. Every capability, rule, state name, and refusal described here comes from that document.",
    zh: "本站基于一份 10 页的 MVP 产品规格书搭建。这里写到的每项能力、规则、状态名和拒绝事项，都出自那份文档。",
  },
  honest: {
    en: "What you will not find here: pricing, customer names, uptime figures, accuracy percentages, or a launch date. None of those have been decided, so none of them are on the page.",
    zh: "你在这里找不到的东西：价格、客户名单、可用率数字、准确率百分比、上线日期。这些都还没定，所以页面上也就不写。",
  },
  demoNote: {
    en: "The workspace is the product, not a picture of it. It runs on a real database with the eleven states, the interlocking, immutable script versions, role permissions, and an audit event on every action. Sign in, accept a topic, and walk it to a recorded publication. The client, the documents, and the numbers are invented; everything the software does with them is real.",
    zh: "工作台就是产品本身，不是产品的图片。它跑在真实数据库上：十一个状态、联锁校验、不可更改的脚本版本、角色权限，每个动作都写一条审计事件。登录进去，通过一条选题，一路走到登记好的发布记录。客户、文档和数字是编的；软件对它们做的每一件事都是真的。",
  },
  spec: { en: "Read the source spec", zh: "查看规格书原文" },
  theme: { en: "Panel light", zh: "面板灯" },
  themeOn: { en: "On", zh: "开" },
  themeOff: { en: "Off", zh: "关" },
};

export const COMMON = {
  skipToContent: { en: "Skip to content", zh: "跳到正文" },
  langSwitch: { en: "Switch language", zh: "切换语言" },
  back: { en: "Back to the line", zh: "回到线路" },
  role: { en: "Authority", zh: "权限" },
  produces: { en: "Leaves behind", zh: "留下什么" },
  conditions: { en: "Proves before the next signal clears", zh: "下个信号放行前需证明" },
  block: { en: "Block", zh: "区间" },
  post: { en: "Post", zh: "信号机" },
} satisfies Record<string, L>;
