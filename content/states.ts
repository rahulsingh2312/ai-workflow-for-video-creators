import type { L, LL } from "@/lib/i18n";

export type Aspect = "danger" | "caution" | "clear" | "dark";

export type BlockState = {
  /** The state code from the spec. Never translated: it is an identifier. */
  code: string;
  /** Signal post number, the way a scheme plan numbers its signals. */
  post: string;
  name: L;
  /** One line: what is true about the task while it sits in this block. */
  meaning: L;
  /** Who holds authority in this block. */
  role: L;
  /**
   * What the interlocking proves before the signal ahead can clear. Straight
   * from the spec's rules, not invented.
   */
  conditions: LL;
  /** What exists when the task leaves this block. */
  produces: L;
  /**
   * PUBLISHED_MANUALLY is past the boundary marker. The product has no
   * authority there and does not pretend to.
   */
  beyondAuthority?: boolean;
};

export const STATES: BlockState[] = [
  {
    code: "NEW",
    post: "S1",
    name: { en: "New", zh: "新建" },
    meaning: {
      en: "A content task exists with a workspace ID and an owner. Nothing else yet.",
      zh: "内容任务已建立，带工作区 ID 和负责人。此外一无所有。",
    },
    role: { en: "Contributor", zh: "内容执行" },
    conditions: {
      en: [
        "The Topic Agent has run, on its schedule or by hand",
        "Every candidate carries at least one source reference",
        "Every candidate carries a score and the reason for that score",
        "Candidates matching the workspace's banned-topic list are already gone",
      ],
      zh: [
        "选题智能体已按计划或手动跑过一轮",
        "每条候选选题至少带一个来源引用",
        "每条候选选题带分数，且写明为什么是这个分数",
        "命中工作区禁选清单的候选已被剔除",
      ],
    },
    produces: {
      en: "A ranked list of topic candidates, each one traceable to where it came from.",
      zh: "一份排好序的候选选题，每条都能回溯到它的出处。",
    },
  },
  {
    code: "TOPIC_REVIEW",
    post: "S2",
    name: { en: "Topic review", zh: "选题待审" },
    meaning: {
      en: "Candidates are on the board with their evidence. A person has not decided yet.",
      zh: "候选选题连同证据摆在面板上，还没有人做决定。",
    },
    role: { en: "Reviewer", zh: "审核" },
    conditions: {
      en: [
        "A human has accepted, edited, rejected, or asked for more research on the candidate",
        "The decision and its reason are recorded",
        "The decision is written back as ranking feedback",
      ],
      zh: [
        "有人对该候选做了通过、修改、否决或补充调研的处理",
        "决定本身和决定的理由都已记录",
        "该决定已写回排序反馈",
      ],
    },
    produces: {
      en: "One selected topic, plus a decision the next ranking run learns from.",
      zh: "一个选定的选题，外加一条下次排序会学到的决定。",
    },
  },
  {
    code: "TOPIC_SELECTED",
    post: "S3",
    name: { en: "Topic selected", zh: "选题确定" },
    meaning: {
      en: "The angle, the reason to publish now, and the approved sources are fixed.",
      zh: "角度、为什么是现在发、以及可用来源，都已固定。",
    },
    role: { en: "Contributor", zh: "内容执行" },
    conditions: {
      en: [
        "The approved source set is attached to the task",
        "The client style profile resolves for this workspace",
        "Target platform and target length are set",
      ],
      zh: [
        "已批准的来源集合已挂到任务上",
        "该工作区的客户风格档案可解析",
        "目标平台和目标时长已设定",
      ],
    },
    produces: {
      en: "A brief the Script Agent can write against without guessing.",
      zh: "一份脚本智能体不用猜就能写的需求。",
    },
  },
  {
    code: "SCRIPT_DRAFT",
    post: "S4",
    name: { en: "Script draft", zh: "脚本草稿" },
    meaning: {
      en: "A spoken-video script exists as a version, with a parent and a claim map.",
      zh: "口播脚本以版本形式存在，有父版本，也有主张与来源的对照。",
    },
    role: { en: "Contributor", zh: "内容执行" },
    conditions: {
      en: [
        "The draft is saved as a version with a parent version",
        "A claim-to-source map exists for that exact version",
        "The character count is recorded against the workspace target",
      ],
      zh: [
        "草稿已存为版本，并记录父版本",
        "该版本有对应的主张与来源对照表",
        "字数已按工作区目标记录在案",
      ],
    },
    produces: {
      en: "A draft, its source map, its counts, style checks, and the questions the agent could not answer.",
      zh: "一份草稿，连同来源对照、字数、风格检查，以及智能体答不上来的问题。",
    },
  },
  {
    code: "FACT_REVIEW",
    post: "S5",
    name: { en: "Fact review", zh: "事实核查" },
    meaning: {
      en: "Claims are extracted and flagged. This is where most tasks sit at danger.",
      zh: "主张已被提取并标记风险。多数任务卡在这里，信号显示禁止。",
    },
    role: { en: "Reviewer", zh: "审核" },
    conditions: {
      en: [
        "Every CRITICAL flag has a human resolution",
        "Every HIGH flag has a human resolution",
        "Each resolution is one of: approve the claim, dismiss the flag with a reason, revise the script, or add an approved source",
        "Reviewer identity and approval time are recorded on each one",
      ],
      zh: [
        "每一条 CRITICAL 风险都有人做过处理",
        "每一条 HIGH 风险都有人做过处理",
        "每次处理只能是四选一：认可该主张、写明理由驳回该标记、改脚本、或补一个已批准来源",
        "每一条都记下了处理人和处理时间",
      ],
    },
    produces: {
      en: "A version where every risky sentence has a name and a timestamp attached to it.",
      zh: "一个版本，其中每句有风险的话都挂着一个人名和一个时间戳。",
    },
  },
  {
    code: "SCRIPT_LOCKED",
    post: "S6",
    name: { en: "Script locked", zh: "脚本锁定" },
    meaning: {
      en: "One version is immutable. Changing it does not edit it, it creates a child.",
      zh: "某个版本已不可更改。要改，不是编辑它，而是生出一个子版本。",
    },
    role: { en: "Reviewer", zh: "审核" },
    conditions: {
      en: [
        "The locked version is exported with its asset brief",
        "A producer is assigned to the task",
      ],
      zh: ["锁定版本连同素材说明已导出", "任务已指派给制作人员"],
    },
    produces: {
      en: "A script the video team can shoot against, and an audit entry saying who locked it and when.",
      zh: "一份可以直接开拍的脚本，以及一条写明谁在什么时候锁的审计记录。",
    },
  },
  {
    code: "PRODUCTION",
    post: "S7",
    name: { en: "Production", zh: "制作中" },
    meaning: {
      en: "Recording and editing happen in the tools your team already uses. Not here.",
      zh: "拍摄和剪辑在团队本来就在用的工具里完成，不在这里。",
    },
    role: { en: "Producer", zh: "制作" },
    conditions: {
      en: [
        "The final video is uploaded, or linked from storage",
        "That video reference is bound to exactly one locked script version",
      ],
      zh: ["成片已上传，或以存储链接形式挂上", "该成片引用只绑定到一个锁定脚本版本"],
    },
    produces: {
      en: "A final video reference with a version it can be checked against.",
      zh: "一个成片引用，且能对照到它所依据的版本。",
    },
  },
  {
    code: "VIDEO_READY",
    post: "S8",
    name: { en: "Video ready", zh: "成片就绪" },
    meaning: {
      en: "The video and the locked script are a matched pair. Break either one and the pair breaks.",
      zh: "成片和锁定脚本是一对。任一方变了，这一对就作废。",
    },
    role: { en: "Publishing operator", zh: "发布执行" },
    conditions: {
      en: [
        "Target platforms are chosen for this task",
        "Per-platform rules resolve from admin configuration",
        "Titles, caption, tags, cover copy, cover brief, and checklist are generated for each platform",
      ],
      zh: [
        "本任务的目标平台已选定",
        "各平台规则可从后台配置中解析出来",
        "每个平台的标题、文案、标签、封面文字、封面说明和发布清单都已生成",
      ],
    },
    produces: {
      en: "A publish package bound to this exact script version and this exact video.",
      zh: "一份发布物料包，绑定到这一个脚本版本和这一个成片。",
    },
  },
  {
    code: "PUBLISH_PACKAGE_READY",
    post: "S9",
    name: { en: "Publish package ready", zh: "物料包就绪" },
    meaning: {
      en: "Everything the operator needs is on one page. The line ends at the next signal.",
      zh: "发布执行需要的一切都在一页里。线路到下一个信号机为止。",
    },
    role: { en: "Publishing operator", zh: "发布执行" },
    conditions: {
      en: [
        "Nothing the system can prove. This is the boundary.",
        "A person opens the official platform app or website and publishes there",
      ],
      zh: ["系统无法证明任何东西。这里就是边界。", "由人打开平台官方 App 或网站，在那边发布"],
    },
    produces: {
      en: "Copy and a checklist, ready to be carried out of this product by hand.",
      zh: "文案和一份清单，等着被人手动带出这个产品。",
    },
  },
  {
    code: "PUBLISHED_MANUALLY",
    post: "S10",
    name: { en: "Published manually", zh: "已人工发布" },
    beyondAuthority: true,
    meaning: {
      en: "It went live somewhere this product cannot reach. All it does now is write down what happened.",
      zh: "内容发在了这个产品够不着的地方。它现在只做一件事：把发生的事记下来。",
    },
    role: { en: "Publishing operator", zh: "发布执行" },
    conditions: {
      en: [
        "The account used is recorded",
        "The publish time is recorded",
        "The live URL is recorded",
      ],
      zh: ["记录使用的账号", "记录发布时间", "记录线上链接"],
    },
    produces: {
      en: "A publication record: which account, what time, which URL, entered by a person.",
      zh: "一条发布记录：哪个账号、什么时间、哪个链接，由人填写。",
    },
  },
  {
    code: "ANALYZED",
    post: "S11",
    name: { en: "Analyzed", zh: "已复盘" },
    meaning: {
      en: "Results are in, the report is written, and only approved advice goes back up the line.",
      zh: "数据回来了，报告写好了，只有被批准的建议才会回流到线路起点。",
    },
    role: { en: "Reviewer", zh: "审核" },
    conditions: {
      en: [
        "Metrics are imported with the collection method stated on every field",
        "Derived rates are calculated only from fields that are actually present",
        "The report is reviewed and its recommendations accepted or rejected one by one",
        "Only accepted recommendations change topic ranking or source weights",
      ],
      zh: [
        "指标已导入，且每个字段都标明采集方式",
        "派生比率只用真实存在的字段算，缺的就是缺的",
        "报告经人审阅，建议逐条通过或否决",
        "只有通过的建议才会改动选题排序或来源权重",
      ],
    },
    produces: {
      en: "A weekly report, topic comparisons, and a short list of changes a human signed off on.",
      zh: "一份周报、选题对比，以及一小串有人签字通过的改动。",
    },
  },
];

/** The transition rows, drawn the way an interlocking table is drawn. */
export type Route = {
  from: string;
  to: string;
  /** Who is authorised to call this route. */
  authority: L;
  /** What happens when a condition fails to prove. */
  onFail: L;
};

export const ROUTES: Route[] = [
  {
    from: "NEW",
    to: "TOPIC_REVIEW",
    authority: { en: "Topic Agent", zh: "选题智能体" },
    onFail: {
      en: "The run is marked failed and stays visible with its error. No half-list is published to the inbox.",
      zh: "该次运行标记为失败，带错误信息留在界面上。不会把半份清单丢进收件箱。",
    },
  },
  {
    from: "TOPIC_REVIEW",
    to: "TOPIC_SELECTED",
    authority: { en: "Reviewer", zh: "审核" },
    onFail: {
      en: "The candidate holds in review. An undecided topic is not a rejected topic and does not expire on its own.",
      zh: "候选继续留在待审。没决定不等于被否决，它也不会自己过期。",
    },
  },
  {
    from: "TOPIC_SELECTED",
    to: "SCRIPT_DRAFT",
    authority: { en: "Script Agent", zh: "脚本智能体" },
    onFail: {
      en: "Generation is blocked, not guessed. A missing style profile or source set is reported as the reason.",
      zh: "生成被拦下，而不是靠猜。缺风格档案或缺来源，会被写成拦下的原因。",
    },
  },
  {
    from: "SCRIPT_DRAFT",
    to: "FACT_REVIEW",
    authority: { en: "Fact Check Agent", zh: "核查智能体" },
    onFail: {
      en: "A draft with no claim map cannot enter review. There would be nothing to check it against.",
      zh: "没有主张对照表的草稿进不了核查。因为没有东西可以拿来对。",
    },
  },
  {
    from: "FACT_REVIEW",
    to: "SCRIPT_LOCKED",
    authority: { en: "Reviewer, and only a reviewer", zh: "只有审核" },
    onFail: {
      en: "The signal stays at danger and the task holds in fact review. One unresolved HIGH flag is enough.",
      zh: "信号保持禁止，任务留在核查阶段。一条没处理的 HIGH 就够了。",
    },
  },
  {
    from: "SCRIPT_LOCKED",
    to: "PRODUCTION",
    authority: { en: "Reviewer", zh: "审核" },
    onFail: {
      en: "Export is refused without an assigned producer. A locked script with nobody holding it is how work goes missing.",
      zh: "没指派制作人员就不给导出。锁了却没人接手的脚本，正是活儿丢掉的方式。",
    },
  },
  {
    from: "PRODUCTION",
    to: "VIDEO_READY",
    authority: { en: "Producer", zh: "制作" },
    onFail: {
      en: "A video not bound to a locked version is rejected on upload. There is no orphan bucket.",
      zh: "没有绑定锁定版本的成片，在上传时就被拒。这里没有孤儿目录。",
    },
  },
  {
    from: "VIDEO_READY",
    to: "PUBLISH_PACKAGE_READY",
    authority: { en: "Publish Package Agent", zh: "发布物料智能体" },
    onFail: {
      en: "Missing platform rules block generation for that platform only. The other platforms still get their package.",
      zh: "某个平台缺规则，只拦这个平台。其他平台照常出物料。",
    },
  },
  {
    from: "PUBLISH_PACKAGE_READY",
    to: "PUBLISHED_MANUALLY",
    authority: { en: "A person, in the platform's own app", zh: "由人在平台自家 App 里完成" },
    onFail: {
      en: "There is no failure mode here, because there is no automation here. The package waits until someone publishes and comes back to record it.",
      zh: "这里没有失败模式，因为这里没有自动化。物料包一直等着，直到有人发完回来登记。",
    },
  },
  {
    from: "PUBLISHED_MANUALLY",
    to: "ANALYZED",
    authority: { en: "Analytics Agent", zh: "分析智能体" },
    onFail: {
      en: "Missing metrics stay missing and are shown as missing. The report does not fill a gap with an estimate.",
      zh: "缺的指标就写缺，并如实显示为缺。报告不会拿估算去补窟窿。",
    },
  },
];

/**
 * The invalidation rules. These are the reason the line is drawn as an
 * interlocking rather than a checklist: clearing one condition re-proves
 * every route that depended on it, and breaking one revokes them.
 */
export const INVALIDATIONS: { trigger: L; effect: L }[] = [
  {
    trigger: { en: "A locked script version is changed", zh: "锁定的脚本版本被改动" },
    effect: {
      en: "The change becomes a child version. The old version stays exactly as it was, and the record says who changed what and why.",
      zh: "改动变成一个子版本。旧版本原样保留，记录里写明谁改了什么、为什么。",
    },
  },
  {
    trigger: { en: "A new script version is locked", zh: "锁定了新的脚本版本" },
    effect: {
      en: "Any publish package tied to the older version is invalid and has to be regenerated.",
      zh: "绑在旧版本上的发布物料包全部作废，必须重新生成。",
    },
  },
  {
    trigger: { en: "A new final video is uploaded", zh: "上传了新的成片" },
    effect: {
      en: "The current package is invalidated the same way. The package is only ever as current as the pair it was built from.",
      zh: "当前物料包同样作废。物料包的新旧，永远取决于它所依据的那一对。",
    },
  },
  {
    trigger: { en: "A knowledge document gets a new version", zh: "知识文档出了新版本" },
    effect: {
      en: "The new version does not silently overwrite the evidence a past output already used. Old outputs keep pointing at what they actually read.",
      zh: "新版本不会悄悄覆盖过去输出所依据的证据。旧的输出仍指向它当时真正读到的东西。",
    },
  },
  {
    trigger: { en: "A document is restricted or expires", zh: "文档被限制访问或已过期" },
    effect: {
      en: "No agent can retrieve it from that moment on. Retrieval checks access at answer time, not at index time.",
      zh: "从那一刻起，任何智能体都检索不到它。权限是在回答时检查的，不是在建索引时。",
    },
  },
];
