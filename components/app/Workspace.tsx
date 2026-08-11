"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  House,
  Lightbulb,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Send,
  Settings,
  Sparkles,
  Sun,
  Target,
  Upload,
  X,
  Calendar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { clsx } from "@/lib/clsx";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CheckRow,
  Divider,
  Dot,
  EmptyState,
  Field,
  Input,
  Meta,
  PageHead,
  Textarea,
  type Tone,
} from "@/components/app/kit";
import {
  LEVEL_LABEL,
  MODE_LABEL,
  PHASES,
  RESOLUTION_LABEL,
  phaseOf,
  stateLabel,
} from "@/components/app/labels";
import {
  Rail,
  DeskHeader,
  DeskToolbar,
  GroupHeading,
  Row,
  Chip,
  CHIP_COLORS,
  PrimaryAction,
} from "@/components/app/Shell";
import { ScriptReader, type SourceRow } from "@/components/app/ScriptReader";
import {
  Avatar,
  CellIcon,
  DOT,
  List,
  ListCell,
  ListGroupHeader,
  ListRow,
  Priority,
  StatusGlyph,
  Tag,
} from "@/components/app/List";

/* ── Types from the API ──────────────────────────────────────────────────── */

type Session = {
  userId: string;
  name: string;
  email: string;
  workspaceId: string;
  roles: string[];
};
type Condition = {
  key: string;
  label_en: string;
  label_zh: string;
  proved: boolean;
  detail?: string;
  humanGate?: boolean;
};
type Proof = {
  from: string;
  to: string;
  conditions: Condition[];
  cleared: boolean;
  manual: boolean;
  onFail_en: string;
  onFail_zh: string;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

type Screen =
  | "home"
  | "topics"
  | "task"
  | "publish"
  | "conversations"
  | "leads"
  | "analytics"
  | "knowledge"
  | "settings"
  | "activity";

const NAV: {
  group: { en: string; zh: string };
  items: { id: Screen; en: string; zh: string; icon: LucideIcon }[];
}[] = [
  {
    group: { en: "Work", zh: "工作" },
    items: [
      { id: "home", en: "Home", zh: "首页", icon: House },
      { id: "topics", en: "Topics", zh: "选题", icon: Lightbulb },
      { id: "task", en: "Script", zh: "脚本", icon: FileText },
      { id: "publish", en: "Publish", zh: "发布", icon: Send },
    ],
  },
  {
    group: { en: "Inbox", zh: "收件" },
    items: [
      { id: "conversations", en: "Messages", zh: "消息", icon: MessageSquare },
      { id: "leads", en: "Leads", zh: "线索", icon: Target },
    ],
  },
  {
    group: { en: "Insight", zh: "洞察" },
    items: [{ id: "analytics", en: "Results", zh: "数据", icon: BarChart3 }],
  },
  {
    group: { en: "Setup", zh: "设置" },
    items: [
      { id: "knowledge", en: "Knowledge", zh: "知识库", icon: BookOpen },
      { id: "settings", en: "Settings", zh: "配置", icon: Settings },
      { id: "activity", en: "Activity", zh: "操作记录", icon: Activity },
    ],
  },
];

/*
  Which task the workspace opens on.

  It used to be whichever one the list handed back first, which is an ordering
  decision made by a SQL query for its own reasons. With more than one task in
  flight that meant landing on an arbitrary one, and it made Publish lie: the
  screen would say "not ready yet" while a different task sat there with its
  package generated and waiting to be recorded.

  So: the furthest-along task wins, and among equals the one touched most
  recently. That is the one the person almost certainly came back for.
*/
const STATE_ORDER = [
  "NEW",
  "TOPIC_REVIEW",
  "TOPIC_SELECTED",
  "SCRIPT_DRAFT",
  "FACT_REVIEW",
  "SCRIPT_LOCKED",
  "PRODUCTION",
  "VIDEO_READY",
  "PUBLISH_PACKAGE_READY",
  "PUBLISHED_MANUALLY",
  "ANALYZED",
];

function pickTask<
  T extends { id: string; state?: string; updated_at?: string },
>(tasks: T[]): T {
  return [...tasks].sort((a, b) => {
    const d =
      STATE_ORDER.indexOf(String(b.state)) -
      STATE_ORDER.indexOf(String(a.state));
    if (d !== 0) return d;
    return String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? ""));
  })[0];
}

/* ── Data ────────────────────────────────────────────────────────────────── */

function useApi(lang: Lang) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const call = useCallback(
    async (path: string, init?: RequestInit) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/${path}`, {
          ...init,
          headers: {
            "content-type": "application/json",
            ...(init?.headers ?? {}),
          },
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          router.push(`/${lang}/login`);
          return null;
        }
        if (!res.ok) {
          setError(
            data.message ??
              data.error ??
              `Something went wrong (${res.status})`,
          );
          return null;
        }
        return data;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not reach the server");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [lang, router],
  );

  return { call, error, setError, busy };
}

/* ── Shell ───────────────────────────────────────────────────────────────── */

export function Workspace({ lang, session }: { lang: Lang; session: Session }) {
  const zh = lang === "zh";
  const t = (en: string, z: string) => (zh ? z : en);
  const router = useRouter();
  const { call, error, setError, busy } = useApi(lang);

  const [screen, setScreen] = useState<Screen>("home");
  const [topics, setTopics] = useState<Row | null>(null);
  const [tasks, setTasks] = useState<Row[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [knowledge, setKnowledge] = useState<Row[]>([]);
  const [conversations, setConversations] = useState<Row[]>([]);
  const [leads, setLeads] = useState<Row[]>([]);
  const [analytics, setAnalytics] = useState<Row | null>(null);
  const [config, setConfig] = useState<Row[]>([]);
  const [activity, setActivity] = useState<Row[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const refresh = useCallback(
    async (target: Screen) => {
      const list = await call("tasks");
      if (list) {
        setTasks(list.tasks);
        if (!taskId && list.tasks.length) setTaskId(pickTask(list.tasks).id);
      }
      const active =
        taskId ?? (list?.tasks?.length ? pickTask(list.tasks).id : undefined);
      if (active) {
        const d = await call(`tasks/${active}`);
        if (d) setDetail(d);
      } else setDetail(null);

      if (target === "topics" || target === "home") {
        const d = await call("topics");
        if (d) setTopics(d);
      }
      if (target === "knowledge") {
        const d = await call("knowledge");
        if (d) setKnowledge(d.documents);
      }
      if (target === "conversations") {
        const d = await call("conversations");
        if (d) setConversations(d.conversations);
      }
      if (target === "leads" || target === "home") {
        const d = await call("leads");
        if (d) setLeads(d.leads);
      }
      if (target === "analytics") {
        const d = await call("analytics");
        if (d) setAnalytics(d);
      }
      if (target === "settings") {
        const d = await call("config");
        if (d) setConfig(d.config);
      }
      if (target === "activity" || target === "home") {
        const d = await call("audit");
        if (d) setActivity(d.events);
      }
    },
    [call, taskId],
  );

  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);
  useEffect(() => {
    void refreshRef.current(screen);
  }, [screen, taskId]);

  const go = useCallback(
    (s: Screen) => {
      setScreen(s);
      setError(null);
      setNavOpen(false);
      mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setError],
  );

  const act = useCallback(
    async (path: string, init: RequestInit) => {
      const d = await call(path, init);
      if (!d) return null;
      if (d.detail) setDetail(d.detail as Row);
      await refreshRef.current(screen);
      return d;
    },
    [call, screen],
  );

  const state = (detail?.task?.state as string) ?? null;
  const proof = (detail?.proof as Proof | null) ?? null;
  const counts = countsFor({ topics, detail, leads, knowledge });
  const next = nextStep({ lang, state, proof, topics });
  const currentNav = NAV.flatMap((g) => g.items).find((i) => i.id === screen);

  const railGroups = [
    {
      items: NAV[0].items.map((i) => ({
        id: i.id,
        label: zh ? i.zh : i.en,
        icon: i.icon,
        count: counts[i.id],
      })),
    },
    {
      label: t("Channels", "渠道"),
      items: NAV[1].items.map((i) => ({
        id: i.id,
        label: zh ? i.zh : i.en,
        icon: i.icon,
        count: counts[i.id],
      })),
    },
    {
      label: t("Workspace", "工作区"),
      items: [...NAV[2].items, ...NAV[3].items].map((i) => ({
        id: i.id,
        label: zh ? i.zh : i.en,
        icon: i.icon,
        count: counts[i.id],
      })),
    },
  ];

  return (
    <div data-surface="app" className="flex min-h-dvh">
      <Rail
        workspace={zh ? "见微 · 个人品牌" : "Jianwei Studio"}
        subtitle={t("Workspace", "工作区")}
        groups={railGroups}
        active={screen}
        onSelect={(id) => go(id as Screen)}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        footer={
          <div className="row flex items-center gap-2.5 px-2 py-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold"
              style={{
                background: "var(--rail-active)",
                color: "var(--ink-gray-6)",
              }}
            >
              {session.name.slice(0, 2)}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block truncate text-[13.5px]"
                style={{ color: "var(--ink-gray-7)" }}
              >
                {session.name}
              </span>
              <span
                className="block truncate text-[12px]"
                style={{ color: "var(--ink-gray-4)" }}
              >
                {session.roles[0]}
              </span>
            </span>
            <ThemeButton lang={lang} />
            <button
              type="button"
              title={t("Sign out", "退出")}
              aria-label={t("Sign out", "退出")}
              onClick={async () => {
                await call("auth/logout", { method: "POST" });
                router.push(`/${lang}/login`);
                router.refresh();
              }}
              className="rounded-[var(--r-sm)] p-1.5 [transition:background-color_120ms_var(--e-out)] hov:bg-[var(--rail-active)]"
            >
              <LogOut
                className="h-4 w-4"
                strokeWidth={1.75}
                style={{ color: "var(--ink-gray-4)" }}
              />
            </button>
          </div>
        }
      />

      {navOpen ? (
        <button
          type="button"
          aria-label={t("Close menu", "关闭菜单")}
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      ) : null}

      <main ref={mainRef} className="min-w-0 flex-1">
        <div
          className="flex items-center gap-3 px-4 py-3 lg:hidden"
          style={{ borderBottom: "1px solid var(--outline-gray-1)" }}
        >
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label={t("Open menu", "打开菜单")}
          >
            <Menu
              className="h-5 w-5"
              strokeWidth={1.75}
              style={{ color: "var(--ink-gray-6)" }}
            />
          </button>
          <span className="text-[15px] font-medium">
            {zh ? currentNav?.zh : currentNav?.en}
          </span>
        </div>

        {error ? (
          <div
            className="app-rise mx-4 mt-5 flex items-start gap-2.5 rounded-[var(--r)] px-3.5 py-3 sm:mx-6"
            style={{ background: "var(--surface-red-2)" }}
          >
            <AlertTriangle
              className="mt-px h-4 w-4 shrink-0"
              strokeWidth={1.75}
              style={{ color: "var(--ink-red-4)" }}
            />
            <p
              className="min-w-0 flex-1 text-[14px] leading-normal"
              style={{ color: "var(--ink-red-4)" }}
            >
              {error}
              <span className="ml-1.5" style={{ color: "var(--ink-gray-5)" }}>
                {t("Nothing was changed.", "什么都没有改动。")}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label={t("Dismiss", "关闭")}
            >
              <X
                className="h-4 w-4"
                strokeWidth={1.75}
                style={{ color: "var(--ink-gray-4)" }}
              />
            </button>
          </div>
        ) : null}

        {/*
          The screen wrapper owns the gutters, so every screen gets the same
          ones. They used to be applied per screen, which meant Home had none:
          on desktop its title sat flush against the rail, and on mobile, where
          there is no rail to hide behind, the first character was clipped by
          the viewport edge.
        */}
        <div className="app-rise px-4 pb-16 pt-6 sm:px-6" key={screen}>
          {screen === "home" && (
            <HomeScreen
              lang={lang}
              next={next}
              proof={proof}
              state={state}
              tasks={tasks}
              leads={leads}
              activity={activity}
              go={go}
            />
          )}
          {screen === "topics" && (
            <Topics lang={lang} topics={topics} act={act} go={go} busy={busy} />
          )}
          {screen === "task" && (
            <Task
              lang={lang}
              detail={detail}
              proof={proof}
              act={act}
              tasks={tasks}
              taskId={taskId}
              setTaskId={setTaskId}
              go={go}
              busy={busy}
            />
          )}
          {screen === "publish" && (
            <Publish
              lang={lang}
              detail={detail}
              act={act}
              busy={busy}
              tasks={tasks}
              taskId={taskId}
              setTaskId={setTaskId}
            />
          )}
          {screen === "conversations" && (
            <Messages lang={lang} rows={conversations} act={act} busy={busy} />
          )}
          {screen === "leads" && <Leads lang={lang} rows={leads} act={act} />}
          {screen === "analytics" && (
            <Results lang={lang} data={analytics} act={act} />
          )}
          {screen === "knowledge" && (
            <Knowledge lang={lang} rows={knowledge} act={act} busy={busy} />
          )}
          {screen === "settings" && (
            <SettingsScreen lang={lang} rows={config} act={act} />
          )}
          {screen === "activity" && (
            <ActivityScreen lang={lang} rows={activity} />
          )}
        </div>
      </main>
    </div>
  );
}

/* ── Chrome bits ─────────────────────────────────────────────────────────── */

/* The document element owns the theme; read it rather than mirroring it. */
const themeStore = {
  subscribe(onChange: () => void) {
    window.addEventListener("tl-theme", onChange);
    return () => window.removeEventListener("tl-theme", onChange);
  },
  get: () => document.documentElement.getAttribute("data-theme") ?? "dark",
  getServer: () => "dark",
};

function ThemeButton({ lang }: { lang: Lang }) {
  const dark =
    useSyncExternalStore(
      themeStore.subscribe,
      themeStore.get,
      themeStore.getServer,
    ) !== "light";
  return (
    <Button
      size="sm"
      variant="ghost"
      icon={dark ? Sun : Moon}
      title={lang === "zh" ? "切换明暗" : "Toggle theme"}
      onClick={() => {
        const value =
          document.documentElement.getAttribute("data-theme") === "light"
            ? "dark"
            : "light";
        document.documentElement.setAttribute("data-theme", value);
        try {
          localStorage.setItem("tl-theme", value);
        } catch {
          /* private mode */
        }
        window.dispatchEvent(new Event("tl-theme"));
      }}
    />
  );
}

function LangButton({ lang }: { lang: Lang }) {
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="ghost"
      title={lang === "zh" ? "English" : "中文"}
      onClick={() => router.push(`/${lang === "zh" ? "en" : "zh"}/workspace`)}
    />
  );
}

/** Six phases a person thinks in, not eleven states a database stores. */
function Stepper({ state, lang }: { state: string; lang: Lang }) {
  const current = phaseOf(state);
  return (
    <div className="mb-7">
      <ol className="flex items-center gap-1.5">
        {PHASES.map((p, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <li key={p.key} className="min-w-0 flex-1">
              <div
                className="h-1.5 w-full rounded-full transition-colors duration-300"
                style={{
                  background: done
                    ? "var(--ink-green-3)"
                    : now
                      ? "var(--ink-amber-3)"
                      : "var(--surface-gray-3)",
                }}
              />
              <p
                className="mt-2 truncate text-[12.5px]"
                style={{
                  color: now ? "var(--ink-gray-9)" : "var(--ink-gray-4)",
                  fontWeight: now ? 600 : 450,
                }}
              >
                {lang === "zh" ? p.zh : p.en}
              </p>
            </li>
          );
        })}
      </ol>
      <p className="mt-1.5 text-[13px]" style={{ color: "var(--ink-gray-6)" }}>
        {stateLabel(state, lang)}
      </p>
    </div>
  );
}

/* ── What happens next ───────────────────────────────────────────────────── */

type Next = {
  title: string;
  body: string;
  cta: string;
  screen: Screen | null;
  tone: Tone;
};

function nextStep({
  lang,
  state,
  proof,
  topics,
}: {
  lang: Lang;
  state: string | null;
  proof: Proof | null;
  topics: Row | null;
}): Next {
  const zh = lang === "zh";
  const t = (en: string, z: string) => (zh ? z : en);
  const waiting = ((topics?.candidates as Row[]) ?? []).filter(
    (c) => !c.decision,
  ).length;

  if (!state) {
    return {
      title: t("Pick a topic to start", "先挑一个选题"),
      body: t(
        `${waiting} suggestions are waiting. Taking one starts a script.`,
        `有 ${waiting} 条候选在等你。选一条就开始写脚本。`,
      ),
      cta: t("See suggestions", "看看候选"),
      screen: "topics",
      tone: "amber",
    };
  }
  if (state === "ANALYZED") {
    return {
      title: t("This one is done", "这条已经走完"),
      body: t(
        `It went out and the results are in. ${waiting} more topics are waiting.`,
        `已经发出去，数据也回来了。还有 ${waiting} 条选题在等。`,
      ),
      cta: t("Start the next one", "开始下一条"),
      screen: "topics",
      tone: "green",
    };
  }

  const held = proof?.conditions?.filter((c) => !c.proved) ?? [];
  const first = held[0];
  const screen: Screen =
    state === "PUBLISH_PACKAGE_READY" || state === "VIDEO_READY"
      ? "publish"
      : state === "PUBLISHED_MANUALLY"
        ? "analytics"
        : "task";

  return {
    title: stateLabel(state, lang),
    body: first
      ? zh
        ? first.label_zh
        : first.label_en
      : t("Everything is ready.", "都准备好了。"),
    cta: t("Continue", "继续"),
    screen,
    tone: held.length ? "amber" : "green",
  };
}

function countsFor({
  topics,
  detail,
  leads,
  knowledge,
}: {
  topics: Row | null;
  detail: Row | null;
  leads: Row[];
  knowledge: Row[];
}): Partial<Record<Screen, number>> {
  return {
    topics: ((topics?.candidates as Row[]) ?? []).filter((c) => !c.decision)
      .length,
    task: ((detail?.flags as Row[]) ?? []).filter(
      (f) => !f.resolution && (f.level === "HIGH" || f.level === "CRITICAL"),
    ).length,
    leads: leads.filter((l) => l.status === "new").length,
    knowledge: knowledge.filter((d) => d.status === "review").length,
    publish: ((detail?.packages as Row[]) ?? []).filter(
      (p) => p.status === "invalid",
    ).length,
  };
}

/* ── Screens ─────────────────────────────────────────────────────────────── */

type ActFn = (path: string, init: RequestInit) => Promise<Row | null>;

function describeEvent(e: Row, lang: Lang) {
  const zh = lang === "zh";
  const who = e.actor_name ?? (zh ? "有人" : "Someone");
  const map: Record<string, string> = zh
    ? {
        sign_in: "登录了",
        generation: "生成了内容",
        review: "做了审核",
        lock: "锁定了脚本",
        transition: "推进了流程",
        transition_refused: "被拦下，条件不成立",
        edit: "改动了内容",
        handoff: "交接了成片",
        publish_record: "登记了发布",
        ai_reply: "助手回复了消息",
        takeover: "接管了对话",
        lead_created: "识别到一条线索",
        lead_status_change: "更新了线索",
        create: "新建了记录",
        assign: "指派了负责人",
        package_invalidated: "让物料包作废",
        import: "导入了数据",
      }
    : {
        sign_in: "signed in",
        generation: "generated content",
        review: "reviewed something",
        lock: "locked a script",
        transition: "moved it forward",
        transition_refused: "was blocked",
        edit: "made a change",
        handoff: "handed off the video",
        publish_record: "recorded a publication",
        ai_reply: "the assistant replied",
        takeover: "took over a conversation",
        lead_created: "found a lead",
        lead_status_change: "updated a lead",
        create: "created a record",
        assign: "assigned an owner",
        package_invalidated: "invalidated a package",
        import: "imported data",
      };
  return `${who} ${map[e.action as string] ?? e.action}`;
}

function HomeScreen({
  lang,
  next,
  proof,
  state,
  tasks,
  leads,
  activity,
  go,
}: {
  lang: Lang;
  next: Next;
  proof: Proof | null;
  state: string | null;
  tasks: Row[];
  leads: Row[];
  activity: Row[];
  go: (s: Screen) => void;
}) {
  const zh = lang === "zh";
  const t = (en: string, z: string) => (zh ? z : en);
  const held = proof?.conditions?.filter((c) => !c.proved) ?? [];

  return (
    <>
      <PageHead
        title={t("Home", "首页")}
        subtitle={t(
          "Where things stand, and the one thing to do next.",
          "现在什么情况，以及接下来该做的那一件事。",
        )}
      />

      <div
        className="mb-6 flex flex-wrap items-center gap-5 rounded-[var(--r)] p-6"
        style={{
          background: "var(--surface-white)",
          border: "1px solid var(--outline-gray-1)",
          boxShadow: "var(--sh-md)",
        }}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{
            background:
              next.tone === "green"
                ? "var(--surface-green-2)"
                : "var(--surface-amber-2)",
            color:
              next.tone === "green"
                ? "var(--ink-green-3)"
                : "var(--ink-amber-3)",
          }}
        >
          {next.tone === "green" ? (
            <Check className="h-5 w-5" />
          ) : (
            <ArrowRight className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="text-[12.5px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--ink-gray-4)" }}
          >
            {t("Next", "下一步")}
          </p>
          <h2 className="mt-1 text-[20px] font-semibold leading-tight">
            {next.title}
          </h2>
          <p
            className="mt-1 text-[14px]"
            style={{ color: "var(--ink-gray-6)" }}
          >
            {next.body}
          </p>
        </div>
        {next.screen ? (
          <Button variant="solid" size="md" onClick={() => go(next.screen!)}>
            {next.cta}
          </Button>
        ) : null}
      </div>

      {/*
        Two named columns rather than an auto-flowing grid. With an odd number
        of cards, auto-flow leaves a hole in the last row and the page reads as
        unfinished; naming the columns also says something true, which is that
        the left one is the work and the right one is what is arriving.
      */}
      <div className="app-stagger grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:items-start">
        <div className="min-w-0 space-y-4">
          {state && held.length ? (
            <Card>
              <CardHeader
                title={t("Before this can move on", "还差这些才能往下走")}
                subtitle={t("Each one has to be true.", "每一条都必须成立。")}
              />
              <ul>
                {proof!.conditions.map((c) => (
                  <CheckRow key={c.key} done={c.proved} detail={c.detail}>
                    {zh ? c.label_zh : c.label_en}
                  </CheckRow>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card>
            <CardHeader title={t("Videos in progress", "进行中的内容")} />
            {tasks.length ? (
              <ul className="space-y-1">
                {tasks.map((x) => (
                  <li key={x.id} className="flex items-center gap-3 py-2">
                    <Dot tone={x.state === "ANALYZED" ? "green" : "amber"} />
                    <span className="min-w-0 flex-1 truncate text-[14px]">
                      {zh ? x.title_zh : x.title_en}
                    </span>
                    <Badge tone={x.state === "ANALYZED" ? "green" : "gray"}>
                      {stateLabel(x.state, lang)}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <Meta>{t("Nothing in progress.", "暂时没有进行中的内容。")}</Meta>
            )}
          </Card>

          <Card>
            <CardHeader
              title={t("Recent activity", "最近的操作")}
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  icon={ChevronRight}
                  onClick={() => go("activity")}
                />
              }
            />
            <ul className="space-y-1">
              {activity.slice(0, 6).map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-1.5">
                  <span
                    className="min-w-0 flex-1 truncate text-[13.5px]"
                    style={{ color: "var(--ink-gray-6)" }}
                  >
                    {describeEvent(e, lang)}
                  </span>
                  <Meta>{String(e.created_at).slice(11, 16)}</Meta>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader
              title={t("New leads", "新线索")}
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  icon={ChevronRight}
                  onClick={() => go("leads")}
                />
              }
            />
            {leads.length ? (
              <ul className="space-y-1">
                {leads.slice(0, 4).map((l) => (
                  <li key={l.id} className="flex items-center gap-3 py-2">
                    <Dot tone={l.score >= 80 ? "red" : "amber"} />
                    <span className="min-w-0 flex-1 truncate text-[14px]">
                      {l.contact}
                    </span>
                    <Meta>{l.intent}</Meta>
                  </li>
                ))}
              </ul>
            ) : (
              <Meta>{t("No leads yet.", "还没有线索。")}</Meta>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

/*
  The topic list.

  Columns are fixed tracks so every row lines up: glyph, score, title, tags,
  date, priority, who decided. The title track is the only flexible one, so it
  absorbs every width difference and nothing else drifts between rows.
*/
const TOPIC_COLUMNS = [
  "auto",
  "2.5rem",
  "minmax(0,1fr)",
  "13rem",
  "6.5rem",
  "5.5rem",
  "2rem",
];

function Topics({
  lang,
  topics,
  act,
  go,
  busy,
}: {
  lang: Lang;
  topics: Row | null;
  act: ActFn;
  go: (s: Screen) => void;
  busy: boolean;
}) {
  const zh = lang === "zh";
  const t = (en: string, z: string) => (zh ? z : en);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"waiting" | "all">("waiting");

  const candidates = (topics?.candidates as Row[]) ?? [];
  const links = (topics?.links as Row[]) ?? [];
  const sources = (topics?.sources as Row[]) ?? [];
  const risks = (topics?.risks as Row[]) ?? [];

  const scoped =
    tab === "waiting" ? candidates.filter((c) => !c.decision) : candidates;
  const groups = [
    {
      key: "waiting",
      label: t("Waiting on you", "等你处理"),
      rows: scoped.filter((c) => !c.decision),
    },
    {
      key: "accepted",
      label: t("Taken", "已采用"),
      rows: scoped.filter((c) => c.decision === "accepted"),
    },
    {
      key: "rejected",
      label: t("Passed on", "已放过"),
      rows: scoped.filter((c) => c.decision === "rejected"),
    },
  ].filter((g) => g.rows.length);

  const sourcesFor = (id: string) =>
    links
      .filter((l) => l.candidate_id === id)
      .map((l) => sources.find((x) => x.id === l.source_id))
      .filter(Boolean) as Row[];
  const risksFor = (id: string) => risks.filter((r) => r.candidate_id === id);
  const level = (score: number): "high" | "medium" | "low" =>
    score >= 80 ? "high" : score >= 65 ? "medium" : "low";
  const levelLabel = {
    high: t("High", "高"),
    medium: t("Medium", "中"),
    low: t("Low", "低"),
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <h1
          className="min-w-0 flex-1 truncate text-[16px] font-medium"
          style={{ color: "var(--ink-gray-8)" }}
        >
          {t("Topics", "选题")}
        </h1>
        <PrimaryAction
          icon={Sparkles}
          loading={busy}
          onClick={() => act("topics", { method: "POST", body: "{}" })}
        >
          {t("Find topics", "找选题")}
        </PrimaryAction>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div
          className="flex items-center rounded-[var(--r-sm)] p-[3px]"
          style={{ background: "var(--rail)" }}
        >
          {(
            [
              ["waiting", t("Waiting", "待处理")],
              ["all", t("All", "全部")],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className="rounded-[4px] px-2.5 py-1 text-[13px] [transition:background-color_140ms_var(--e-out),color_140ms_var(--e-out)]"
              style={{
                background: tab === k ? "var(--surface-white)" : "transparent",
                color: tab === k ? "var(--ink-gray-8)" : "var(--ink-gray-5)",
                boxShadow: tab === k ? "var(--sh-sm)" : undefined,
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <span
          className="ml-auto text-[13px]"
          style={{ color: "var(--ink-gray-5)" }}
        >
          {scoped.length} {t("topics", "条")}
        </span>
      </div>

      <div className="pt-4">
        {!groups.length ? (
          <div className="flex flex-col items-center gap-1 py-16 text-center">
            <Lightbulb
              className="size-6"
              strokeWidth={1.5}
              style={{ color: "var(--ink-gray-4)" }}
              aria-hidden
            />
            <p
              className="text-[14px] font-medium"
              style={{ color: "var(--ink-gray-7)" }}
            >
              {t("Nothing waiting", "没有待处理的候选")}
            </p>
            <p className="text-[13px]" style={{ color: "var(--ink-gray-5)" }}>
              {t("Look for more whenever you want.", "想要更多随时可以再找。")}
            </p>
          </div>
        ) : null}

        <div className="space-y-4">
          {groups.map((g) => {
            const open = !collapsed[g.key];
            return (
              <div key={g.key}>
                <ListGroupHeader
                  label={g.label}
                  count={g.rows.length}
                  open={open}
                  lang={lang}
                  onToggle={() =>
                    setCollapsed((p) => ({ ...p, [g.key]: open }))
                  }
                />
                {open ? (
                  <List columns={TOPIC_COLUMNS} className="mt-1">
                    {g.rows.map((c) => {
                      const mine = sourcesFor(c.id);
                      const myRisks = risksFor(c.id);
                      const lv = level(c.score);
                      const expanded = openId === c.id;
                      return (
                        <div key={c.id}>
                          <ListRow
                            onClick={() => setOpenId(expanded ? null : c.id)}
                          >
                            <ListCell>
                              <StatusGlyph
                                kind={
                                  c.decision === "accepted"
                                    ? "done"
                                    : c.decision === "rejected"
                                      ? "cancelled"
                                      : "todo"
                                }
                              />
                            </ListCell>
                            <ListCell>
                              <span
                                className="text-[13px] tabular-nums"
                                style={{ color: "var(--ink-gray-4)" }}
                              >
                                {c.score}
                              </span>
                            </ListCell>
                            <ListCell>
                              <span
                                className="truncate text-[14px] font-medium"
                                style={{ color: "var(--ink-gray-8)" }}
                              >
                                {zh ? c.title_zh : c.title_en}
                              </span>
                            </ListCell>
                            <ListCell className="gap-1.5 overflow-hidden">
                              <Tag
                                label={`${mine.length} ${t("sources", "来源")}`}
                                dot={DOT.gray}
                              />
                              {myRisks.slice(0, 1).map((r) => (
                                <Tag
                                  key={r.id}
                                  label={zh ? r.note_zh : r.note_en}
                                  dot={
                                    r.level === "HIGH" || r.level === "CRITICAL"
                                      ? DOT.red
                                      : DOT.amber
                                  }
                                />
                              ))}
                              {myRisks.length > 1 ? (
                                <span
                                  className="shrink-0 text-[12px]"
                                  style={{ color: "var(--ink-gray-4)" }}
                                >
                                  +{myRisks.length - 1}
                                </span>
                              ) : null}
                            </ListCell>
                            <ListCell>
                              {mine[0]?.published_at ? (
                                <span
                                  className="flex items-center whitespace-nowrap text-[13px]"
                                  style={{ color: "var(--ink-gray-5)" }}
                                >
                                  <CellIcon icon={Calendar} />
                                  {String(mine[0].published_at).slice(5)}
                                </span>
                              ) : null}
                            </ListCell>
                            <ListCell>
                              <Priority level={lv} label={levelLabel[lv]} />
                            </ListCell>
                            <ListCell className="justify-end">
                              {c.decided_by_name ? (
                                <Avatar name={String(c.decided_by_name)} />
                              ) : null}
                            </ListCell>
                          </ListRow>

                          {expanded ? (
                            <div
                              className="app-rise mb-2 ml-10 mr-3 rounded-[var(--r)] p-4"
                              style={{ background: "var(--rail)" }}
                            >
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                  <p
                                    className="text-[12px] font-medium"
                                    style={{ color: "var(--ink-gray-5)" }}
                                  >
                                    {t("Why now", "为什么是现在")}
                                  </p>
                                  <p
                                    className="mt-1 text-[13px] leading-normal"
                                    style={{ color: "var(--ink-gray-7)" }}
                                  >
                                    {zh ? c.why_zh : c.why_en}
                                  </p>
                                </div>
                                <div>
                                  <p
                                    className="text-[12px] font-medium"
                                    style={{ color: "var(--ink-gray-5)" }}
                                  >
                                    {t("Why this score", "为什么是这个分")}
                                  </p>
                                  <p
                                    className="mt-1 text-[13px] leading-normal"
                                    style={{ color: "var(--ink-gray-7)" }}
                                  >
                                    {zh ? c.reason_zh : c.reason_en}
                                  </p>
                                </div>
                                <div className="sm:col-span-2">
                                  <p
                                    className="text-[12px] font-medium"
                                    style={{ color: "var(--ink-gray-5)" }}
                                  >
                                    {t("Based on", "依据")}
                                  </p>
                                  <ul className="mt-1 space-y-1">
                                    {mine.map((x) => (
                                      <li
                                        key={x.id}
                                        className="flex items-center gap-2 text-[13px]"
                                        style={{ color: "var(--ink-gray-7)" }}
                                      >
                                        <span
                                          aria-hidden
                                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                                          style={{
                                            background:
                                              x.trust === "high"
                                                ? DOT.green
                                                : DOT.amber,
                                          }}
                                        />
                                        {zh ? x.label_zh : x.label_en}
                                        <span
                                          style={{ color: "var(--ink-gray-4)" }}
                                        >
                                          {x.published_at}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              {!c.decision ? (
                                <div className="mt-4 flex flex-wrap items-end gap-2">
                                  <div className="min-w-[220px] flex-1">
                                    <Field
                                      id={`r-${c.id}`}
                                      label={t("Your reason", "你的理由")}
                                      hint={t(
                                        "It teaches the next round what you like.",
                                        "下一轮会照着你的口味来。",
                                      )}
                                    >
                                      <Input
                                        id={`r-${c.id}`}
                                        value={reason[c.id] ?? ""}
                                        onChange={(e) =>
                                          setReason((p) => ({
                                            ...p,
                                            [c.id]: e.target.value,
                                          }))
                                        }
                                        placeholder={t(
                                          "Good timing and a solid source",
                                          "时机好，来源也扎实",
                                        )}
                                      />
                                    </Field>
                                  </div>
                                  <Button
                                    variant="solid"
                                    disabled={!(reason[c.id] ?? "").trim()}
                                    onClick={async () => {
                                      const d = await act(
                                        `topics/${c.id}/decide`,
                                        {
                                          method: "POST",
                                          body: JSON.stringify({
                                            decision: "accepted",
                                            reason: reason[c.id],
                                          }),
                                        },
                                      );
                                      if (d) go("task");
                                    }}
                                  >
                                    {t("Use this one", "就用这条")}
                                  </Button>
                                  <Button
                                    disabled={!(reason[c.id] ?? "").trim()}
                                    onClick={() =>
                                      act(`topics/${c.id}/decide`, {
                                        method: "POST",
                                        body: JSON.stringify({
                                          decision: "rejected",
                                          reason: reason[c.id],
                                        }),
                                      })
                                    }
                                  >
                                    {t("Pass", "跳过")}
                                  </Button>
                                </div>
                              ) : c.decision_reason ? (
                                <p
                                  className="mt-3 text-[13px]"
                                  style={{ color: "var(--ink-gray-5)" }}
                                >
                                  {t("You said:", "你写的理由：")}{" "}
                                  {c.decision_reason}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </List>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/** One prominent action, chosen from where the task actually is. */
function ActionBar({
  lang,
  task,
  proof,
  latest,
  mustFix,
  act,
  busy,
  mediaRef,
  setMediaRef,
}: {
  lang: Lang;
  task: Row;
  proof: Proof | null;
  latest: Row | undefined;
  mustFix: Row[];
  act: ActFn;
  busy: boolean;
  mediaRef: string;
  setMediaRef: (v: string) => void;
}) {
  const zh = lang === "zh";
  const t = (en: string, z: string) => (zh ? z : en);
  const needsProducer = proof?.conditions?.some(
    (c) => c.key === "producer" && !c.proved,
  );

  /*
    The one thing to do next.

    This used to be a fully saturated amber or green slab across the top of the
    screen, which shouted at a reviewer who was already looking at it and left
    nothing louder to escalate to. Now the ground stays near-neutral and the
    state is carried by a 3px rule down the leading edge plus a dot: legible at
    a glance, still quiet enough to sit above a list of flags that need to be
    the loudest thing on the page.
  */
  const TONE_INK: Record<string, string> = {
    green: "var(--ink-green-2)",
    amber: "var(--ink-amber-2)",
    gray: "var(--outline-gray-3)",
  };

  const box = (children: React.ReactNode, tone: Tone = "gray") => (
    <div
      className="relative flex flex-wrap items-center gap-x-5 gap-y-3 overflow-hidden rounded-[var(--r)] py-4 pl-5 pr-4"
      style={{
        background: "var(--surface-cards)",
        boxShadow: "inset 0 0 0 1px var(--outline-gray-2)",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: TONE_INK[tone] ?? TONE_INK.gray }}
      />
      {children}
    </div>
  );
  const copy = (title: string, body: string, tone: Tone = "gray") => (
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-2 text-[16px] font-medium tracking-[-0.012em]">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ background: TONE_INK[tone] ?? TONE_INK.gray }}
        />
        {title}
      </p>
      <p
        className="mt-1 pl-4 text-[13.5px] leading-relaxed"
        style={{ color: "var(--ink-gray-6)" }}
      >
        {body}
      </p>
    </div>
  );

  if (!latest) {
    return box(
      <>
        {copy(
          t("Write the first draft", "先写出初稿"),
          t(
            "Uses your topic, your approved sources, and your style.",
            "用你的选题、已批准来源和你的语气来写。",
          ),
          "amber",
        )}
        <Button
          variant="solid"
          size="md"
          icon={Sparkles}
          loading={busy}
          onClick={() =>
            act(`tasks/${task.id}/script`, { method: "POST", body: "{}" })
          }
        >
          {t("Write it", "开始写")}
        </Button>
      </>,
      "amber",
    );
  }
  if (task.state === "SCRIPT_DRAFT") {
    return box(
      <>
        {copy(
          t("Check the facts", "核对事实"),
          t(
            "Pulls out every claim and matches it against your sources.",
            "把每条主张抓出来，和你的来源逐一对照。",
          ),
          "amber",
        )}
        <Button
          variant="solid"
          size="md"
          icon={Check}
          loading={busy}
          onClick={() =>
            act(`tasks/${task.id}/factcheck`, { method: "POST", body: "{}" })
          }
        >
          {t("Check it", "开始核对")}
        </Button>
      </>,
      "amber",
    );
  }
  if (task.state === "FACT_REVIEW") {
    return box(
      <>
        {copy(
          mustFix.length
            ? t("Handle what's flagged", "先处理标出来的问题")
            : t("Ready to lock", "可以锁定了"),
          mustFix.length
            ? t(
                `${mustFix.length} things still need your call.`,
                `还有 ${mustFix.length} 处等你定。`,
              )
            : t(
                "Locking freezes this version so filming can start.",
                "锁定后这一版就定了，可以开拍。",
              ),
          mustFix.length ? "amber" : "green",
        )}
        <Button
          variant="solid"
          size="md"
          icon={Lock}
          disabled={mustFix.length > 0}
          loading={busy}
          onClick={() =>
            act(`tasks/${task.id}/lock`, { method: "POST", body: "{}" })
          }
        >
          {t("Lock the script", "锁定脚本")}
        </Button>
      </>,
      mustFix.length ? "amber" : "green",
    );
  }
  if (task.state === "SCRIPT_LOCKED" && needsProducer) {
    return box(
      <>
        {copy(
          t("Who is making this?", "这条谁来做？"),
          t(
            "Assign someone before the script goes out for filming.",
            "在脚本交出去拍之前，先指派一个人。",
          ),
        )}
        <Button
          variant="solid"
          size="md"
          loading={busy}
          onClick={() =>
            act(`tasks/${task.id}/assign`, {
              method: "POST",
              body: JSON.stringify({ producer_id: "u_lin" }),
            })
          }
        >
          {t("Assign Lin Tao", "指派林涛")}
        </Button>
      </>,
    );
  }
  if (task.state === "SCRIPT_LOCKED" || task.state === "PRODUCTION") {
    return box(
      <>
        {copy(
          t("Add the finished video", "上传成片"),
          t(
            "Film and edit wherever you normally do, then paste the link.",
            "照常在你自己的工具里拍和剪，剪完把链接贴过来。",
          ),
        )}
        <div className="flex w-full gap-2 sm:w-auto">
          <Input
            value={mediaRef}
            onChange={(e) => setMediaRef(e.target.value)}
            placeholder={t("Paste a link to the video", "贴成片链接")}
            className="sm:w-72"
          />
          <Button
            variant="solid"
            icon={Upload}
            disabled={!mediaRef.trim()}
            loading={busy}
            onClick={() =>
              act(`tasks/${task.id}/media`, {
                method: "POST",
                body: JSON.stringify({ ref: mediaRef }),
              })
            }
          >
            {t("Add", "添加")}
          </Button>
        </div>
      </>,
    );
  }
  return box(
    <>
      {copy(
        t("Everything here is done", "这一步已经完成"),
        t(
          "Head to Publish for the captions and the checklist.",
          "去“发布”那边拿文案和清单。",
        ),
        "green",
      )}
      <Badge tone="green" icon={Check}>
        {stateLabel(task.state, lang)}
      </Badge>
    </>,
    "green",
  );
}

function Task({
  lang,
  detail,
  proof,
  act,
  tasks,
  taskId,
  setTaskId,
  go,
  busy,
}: {
  lang: Lang;
  detail: Row | null;
  proof: Proof | null;
  act: ActFn;
  tasks: Row[];
  taskId: string | null;
  setTaskId: (v: string) => void;
  go: (s: Screen) => void;
  busy: boolean;
}) {
  const zh = lang === "zh";
  const t = (en: string, z: string) => (zh ? z : en);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [revise, setRevise] = useState("");
  const [mediaRef, setMediaRef] = useState("");
  const [showScript, setShowScript] = useState(true);

  if (!detail?.task) {
    return (
      <>
        <PageHead title={t("Script", "脚本")} />
        <EmptyState
          icon={FileText}
          title={t("No script yet", "还没有脚本")}
          body={t(
            "Take a topic suggestion and a first draft gets written for you.",
            "先采用一条选题建议，系统会替你写出初稿。",
          )}
          action={
            <Button variant="solid" onClick={() => go("topics")}>
              {t("See suggestions", "看看候选")}
            </Button>
          }
        />
      </>
    );
  }

  const task = detail.task as Row;
  const versions = (detail.versions as Row[]) ?? [];
  const flags = (detail.flags as Row[]) ?? [];
  const latest = versions[versions.length - 1];
  const mustFix = flags.filter(
    (f) => !f.resolution && (f.level === "HIGH" || f.level === "CRITICAL"),
  );
  const minor = flags.filter(
    (f) => !f.resolution && f.level !== "HIGH" && f.level !== "CRITICAL",
  );
  const resolved = flags.filter((f) => f.resolution);
  const lockedVersion = versions.find((v) => v.status === "locked");

  return (
    <>
      <PageHead
        title={zh ? task.title_zh : task.title_en}
        subtitle={stateLabel(task.state, lang)}
      />

      {tasks.length > 1 ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {tasks.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTaskId(x.id)}
              className="press max-w-[18rem] truncate rounded-full px-3 py-1.5 text-[13px] [transition:background-color_140ms_var(--e-out),color_140ms_var(--e-out)]"
              title={zh ? x.title_zh : x.title_en}
              style={{
                background:
                  x.id === taskId ? "var(--surface-gray-3)" : "transparent",
                boxShadow: "inset 0 0 0 1px var(--outline-gray-2)",
                color:
                  x.id === taskId ? "var(--ink-gray-9)" : "var(--ink-gray-6)",
                fontWeight: x.id === taskId ? 550 : 400,
              }}
            >
              {/* Truncation is CSS, not a slice: a hard cut at 28 characters
                  loses the ellipsis and lands mid-word. */}
              {zh ? x.title_zh : x.title_en}
            </button>
          ))}
        </div>
      ) : null}

      <ActionBar
        lang={lang}
        task={task}
        proof={proof}
        latest={latest}
        mustFix={mustFix}
        act={act}
        busy={busy}
        mediaRef={mediaRef}
        setMediaRef={setMediaRef}
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {flags.length ? (
            <Card>
              <CardHeader
                title={t("Things to check", "需要你确认的地方")}
                subtitle={
                  mustFix.length
                    ? t(
                        `${mustFix.length} must be handled before this can be locked.`,
                        `有 ${mustFix.length} 处必须处理，才能锁定。`,
                      )
                    : t("Nothing is blocking you.", "没有卡住你的东西了。")
                }
              />
              <div className="space-y-3">
                {[...mustFix, ...minor, ...resolved].map((f) => {
                  const level = LEVEL_LABEL[f.level] ?? LEVEL_LABEL.LOW;
                  const done = Boolean(f.resolution);
                  return (
                    /*
                      One flag, one card. The card itself stays neutral: three
                      red-outlined boxes stacked on top of each other read as an
                      alarm going off rather than as a list of three things to
                      look at, and the reviewer still has to read every one.
                      The level lives in the badge and in the 2px rule down the
                      inside edge, which is enough to sort them at a glance.
                    */
                    <div
                      key={f.id}
                      className="relative overflow-hidden rounded-[var(--r)] py-4 pl-5 pr-4"
                      style={{
                        background: done
                          ? "transparent"
                          : "var(--surface-cards)",
                        boxShadow: `inset 0 0 0 1px ${done ? "var(--outline-gray-1)" : "var(--outline-gray-2)"}`,
                      }}
                    >
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-0.5"
                        style={{
                          background: done
                            ? "var(--ink-green-2)"
                            : level.tone === "red"
                              ? "var(--ink-red-3)"
                              : "var(--ink-amber-2)",
                        }}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={done ? "green" : level.tone}>
                          {done
                            ? t("Handled", "已处理")
                            : zh
                              ? level.zh
                              : level.en}
                        </Badge>
                        <span
                          className="t-sm"
                          style={{ color: "var(--ink-gray-6)" }}
                        >
                          {zh ? f.category_zh : f.category_en}
                        </span>
                      </div>

                      {/*
                        The flagged sentence, set as the quotation it is. A rule
                        down its left says "this text is lifted out of the
                        script" without spending a colour on saying it.
                      */}
                      <blockquote
                        className="mt-3 border-l-2 pl-3 text-[15px] leading-relaxed"
                        style={{ borderColor: "var(--outline-gray-3)" }}
                      >
                        {zh ? f.claim_zh : f.claim_en}
                      </blockquote>

                      <p
                        className="mt-3 text-[13.5px] leading-relaxed"
                        style={{ color: "var(--ink-gray-7)" }}
                      >
                        {zh ? f.reason_zh : f.reason_en}
                      </p>
                      {/*
                        What the source actually says. This used to be a filled
                        grey bar, which made it identical to the note field
                        directly beneath it: one is evidence to read, the other
                        is a box to type in, and they looked the same. Evidence
                        is quiet text under a label; only the input keeps a fill.
                      */}
                      <p className="mt-3 text-[12.5px] leading-relaxed">
                        <span
                          className="t-2xs mr-1.5 uppercase tracking-[0.06em]"
                          style={{ color: "var(--ink-gray-4)" }}
                        >
                          {t("Source says", "来源写的是")}
                        </span>
                        <span style={{ color: "var(--ink-gray-6)" }}>
                          {zh ? f.evidence_zh : f.evidence_en}
                        </span>
                      </p>

                      {done ? (
                        <p
                          className="mt-3 flex flex-wrap items-center gap-2 text-[13px]"
                          style={{ color: "var(--ink-green-3)" }}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {zh
                            ? RESOLUTION_LABEL[f.resolution]?.zh
                            : RESOLUTION_LABEL[f.resolution]?.en}{" "}
                          · {f.resolver_name}
                          {f.resolution_reason ? (
                            <span style={{ color: "var(--ink-gray-4)" }}>
                              {f.resolution_reason}
                            </span>
                          ) : null}
                        </p>
                      ) : (
                        <div className="mt-4">
                          <Input
                            value={reason[f.id] ?? ""}
                            onChange={(e) =>
                              setReason((p) => ({
                                ...p,
                                [f.id]: e.target.value,
                              }))
                            }
                            placeholder={t(
                              "Add a note. Required to dismiss.",
                              "写个说明。判断它不是问题时必填。",
                            )}
                          />
                          {/*
                            Three decisions that accept the flag, and one that
                            throws it away. The dismissal is separated by a rule
                            and disabled until a reason exists, because it is the
                            only one of the four the audit log cannot explain on
                            its own, and the server rejects it without one.
                          */}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {(["approved", "revised", "sourced"] as const).map(
                              (r) => (
                                <Button
                                  key={r}
                                  size="sm"
                                  variant="outline"
                                  title={
                                    zh
                                      ? RESOLUTION_LABEL[r].hint.zh
                                      : RESOLUTION_LABEL[r].hint.en
                                  }
                                  onClick={() =>
                                    act(`flags/${f.id}`, {
                                      method: "POST",
                                      body: JSON.stringify({
                                        resolution: r,
                                        reason: reason[f.id] ?? "",
                                      }),
                                    })
                                  }
                                >
                                  {zh
                                    ? RESOLUTION_LABEL[r].zh
                                    : RESOLUTION_LABEL[r].en}
                                </Button>
                              ),
                            )}
                            <span
                              aria-hidden
                              className="mx-1 h-5 w-px"
                              style={{ background: "var(--outline-gray-2)" }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!(reason[f.id] ?? "").trim()}
                              title={
                                (reason[f.id] ?? "").trim()
                                  ? zh
                                    ? RESOLUTION_LABEL.dismissed.hint.zh
                                    : RESOLUTION_LABEL.dismissed.hint.en
                                  : t(
                                      "Write a note first: dismissing a flag has to say why.",
                                      "先写说明：判断它不是问题，必须写清楚原因。",
                                    )
                              }
                              onClick={() =>
                                act(`flags/${f.id}`, {
                                  method: "POST",
                                  body: JSON.stringify({
                                    resolution: "dismissed",
                                    reason: reason[f.id] ?? "",
                                  }),
                                })
                              }
                            >
                              {zh
                                ? RESOLUTION_LABEL.dismissed.zh
                                : RESOLUTION_LABEL.dismissed.en}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}

          {latest ? (
            <Card>
              <CardHeader
                title={t("The script", "脚本")}
                subtitle={t(
                  `${latest.chars} characters, version ${latest.label}`,
                  `${latest.chars} 字，版本 ${latest.label}`,
                )}
                action={
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={showScript ? ChevronUp : ChevronDown}
                    onClick={() => setShowScript((v) => !v)}
                  >
                    {showScript ? t("Hide", "收起") : t("Show", "展开")}
                  </Button>
                }
              />
              {showScript ? (
                <ScriptReader
                  body={String(latest.body ?? "")}
                  sources={(detail.sources as SourceRow[]) ?? []}
                  lang={lang}
                />
              ) : null}
            </Card>
          ) : null}
        </div>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title={t("History", "版本记录")} />
            <ol className="space-y-3">
              {versions.map((v) => (
                <li key={v.id} className="flex gap-3">
                  <span className="mt-1.5">
                    <Dot
                      tone={
                        v.status === "locked"
                          ? "green"
                          : v.status === "superseded"
                            ? "gray"
                            : "amber"
                      }
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium">
                      {v.label}
                      {v.status === "locked"
                        ? ` · ${t("locked", "已锁定")}`
                        : ""}
                      {v.parent_id
                        ? ` · ${t("from", "来自")} ${versions.find((p) => p.id === v.parent_id)?.label}`
                        : ""}
                    </p>
                    <p
                      className="mt-0.5 text-[13px]"
                      style={{ color: "var(--ink-gray-6)" }}
                    >
                      {zh ? v.note_zh : v.note_en}
                    </p>
                    <Meta>
                      {v.author_name ?? v.author_label} ·{" "}
                      {String(v.created_at).slice(5, 16).replace("T", " ")}
                    </Meta>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {lockedVersion ? (
            <Card>
              <CardHeader
                title={t("Change the locked script", "改动已锁定的脚本")}
                subtitle={t(
                  "This does not overwrite it. A new version is made, and anything built from the old one has to be redone.",
                  "这不会覆盖它。会生成新版本，基于旧版本做好的东西都要重做。",
                )}
              />
              <Input
                value={revise}
                onChange={(e) => setRevise(e.target.value)}
                placeholder={t("Why are you changing it?", "为什么要改？")}
              />
              <div className="mt-2.5">
                <Button
                  variant="danger"
                  disabled={!revise.trim()}
                  onClick={() =>
                    act(`tasks/${task.id}/revise`, {
                      method: "POST",
                      body: JSON.stringify({ reason: revise }),
                    })
                  }
                >
                  {t("Make a new version", "生成新版本")}
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

const PLATFORM_NAME: Record<string, { en: string; zh: string }> = {
  channels: { en: "WeChat Channels", zh: "视频号" },
  douyin: { en: "Douyin", zh: "抖音" },
  xhs: { en: "Xiaohongshu", zh: "小红书" },
};

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <p
        className="mb-1.5 text-[12.5px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--ink-gray-4)" }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function Publish({
  lang,
  detail,
  act,
  busy,
  tasks,
  taskId,
  setTaskId,
}: {
  lang: Lang;
  detail: Row | null;
  act: ActFn;
  busy: boolean;
  tasks: Row[];
  taskId: string | null;
  setTaskId: (v: string) => void;
}) {
  const zh = lang === "zh";
  const t = (en: string, z: string) => (zh ? z : en);
  const [url, setUrl] = useState<Record<string, string>>({});
  const [account, setAccount] = useState<Record<string, string>>({});
  const packages = (detail?.packages as Row[]) ?? [];
  const task = detail?.task as Row | undefined;

  const READY = [
    "VIDEO_READY",
    "PUBLISH_PACKAGE_READY",
    "PUBLISHED_MANUALLY",
    "ANALYZED",
  ];

  if (!task || !READY.includes(task.state)) {
    /*
      A dead end here is a lie when another task is sitting ready. The old
      empty state said "not ready yet" about whichever task happened to be
      selected, with no way to see that a different one had its package
      waiting. Now it names them and switches.
    */
    const ready = tasks.filter(
      (x) => READY.includes(String(x.state)) && x.id !== taskId,
    );

    return (
      <>
        <PageHead title={t("Publish", "发布")} />
        <EmptyState
          icon={Send}
          title={
            task
              ? t("This one is not ready yet", "这条还没到发布这一步")
              : t("Nothing to publish yet", "还没有可以发布的东西")
          }
          body={
            task
              ? t(
                  `"${String(zh ? task.title_zh : task.title_en)}" is at: ${stateLabel(task.state, lang)}. Captions and the checklist get written once the script is locked and the video is in.`,
                  `“${String(zh ? task.title_zh : task.title_en)}”现在是：${stateLabel(task.state, lang)}。脚本锁定、成片上传之后，文案和清单才会生成。`,
                )
              : t(
                  "Captions and checklists get written once a script is locked and the video is in.",
                  "脚本锁定、成片上传之后，文案和清单才会生成。",
                )
          }
          action={
            ready.length ? (
              <div className="flex flex-col items-center gap-2">
                <Meta>
                  {t(
                    ready.length === 1
                      ? "One other task is ready:"
                      : `${ready.length} other tasks are ready:`,
                    ready.length === 1
                      ? "另有 1 条已就绪："
                      : `另有 ${ready.length} 条已就绪：`,
                  )}
                </Meta>
                <div className="flex flex-wrap justify-center gap-2">
                  {ready.map((x) => (
                    <Button
                      key={x.id}
                      size="sm"
                      variant="outline"
                      iconRight={ArrowRight}
                      onClick={() => setTaskId(x.id)}
                    >
                      {String(zh ? x.title_zh : x.title_en).slice(0, 40)}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHead
        title={t("Publish", "发布")}
        subtitle={t(
          "Copy the words, post it in the app yourself, then paste the link back here.",
          "把文案复制走，自己在 App 里发，然后把链接贴回来。",
        )}
        action={
          <Button
            icon={Sparkles}
            loading={busy}
            onClick={() =>
              act(`tasks/${task.id}/packages`, { method: "POST", body: "{}" })
            }
          >
            {packages.length
              ? t("Rewrite", "重新生成")
              : t("Write the captions", "生成文案")}
          </Button>
        }
      />

      {!packages.length ? (
        <EmptyState
          icon={Send}
          title={t("Nothing written yet", "还没有文案")}
          body={t(
            "One set of titles, captions, tags and a checklist per platform.",
            "每个平台一套标题、文案、标签和发布清单。",
          )}
          action={
            <Button
              variant="solid"
              icon={Sparkles}
              loading={busy}
              onClick={() =>
                act(`tasks/${task.id}/packages`, { method: "POST", body: "{}" })
              }
            >
              {t("Write the captions", "生成文案")}
            </Button>
          }
        />
      ) : null}

      <div className="space-y-4">
        {packages.map((p) => {
          const payload = JSON.parse(p.payload as string);
          const invalid = p.status === "invalid";
          const published = p.status === "published";
          return (
            <Card key={p.id} className={invalid ? "opacity-70" : undefined}>
              <CardHeader
                title={PLATFORM_NAME[p.platform]?.[lang] ?? p.platform}
                action={
                  invalid ? (
                    <Badge tone="red">{t("Out of date", "已过期")}</Badge>
                  ) : published ? (
                    <Badge tone="green" icon={Check}>
                      {t("Posted", "已发布")}
                    </Badge>
                  ) : (
                    <Badge tone="amber">{t("Ready", "待发布")}</Badge>
                  )
                }
              />
              {invalid ? (
                <p
                  className="text-[13.5px]"
                  style={{ color: "var(--ink-gray-6)" }}
                >
                  {t(
                    "The script or the video changed after this was written. Rewrite it before posting.",
                    "写好之后脚本或成片又改过了。发之前请重新生成。",
                  )}
                </p>
              ) : (
                <>
                  <Section label={t("Pick a title", "挑个标题")}>
                    <ul className="space-y-1.5">
                      {payload.titles.map((x: string, i: number) => (
                        <li
                          key={i}
                          className="rounded-[var(--r-sm)] px-3 py-2 text-[14px]"
                          style={{ background: "var(--surface-gray-2)" }}
                        >
                          {x}
                        </li>
                      ))}
                    </ul>
                  </Section>
                  <Section label={t("Caption", "正文")}>
                    <p
                      className="rounded-[var(--r-sm)] px-3 py-2 text-[14px] leading-relaxed"
                      style={{ background: "var(--surface-gray-2)" }}
                    >
                      {payload.caption}
                    </p>
                  </Section>
                  <Section label={t("Tags", "标签")}>
                    <div className="flex flex-wrap gap-1.5">
                      {payload.tags.map((x: string) => (
                        <Badge key={x}>{x}</Badge>
                      ))}
                    </div>
                  </Section>
                  <Section label={t("Before you post", "发之前检查")}>
                    <ul>
                      {payload.checklist.map((x: string, i: number) => (
                        <CheckRow key={i} done={false}>
                          {x}
                        </CheckRow>
                      ))}
                    </ul>
                  </Section>

                  <Divider />
                  {published ? (
                    <p
                      className="text-[13.5px]"
                      style={{ color: "var(--ink-gray-6)" }}
                    >
                      {p.account} ·{" "}
                      {String(p.published_at).slice(0, 16).replace("T", " ")} ·{" "}
                      {p.live_url}
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label={t(
                          "Which account did you post from?",
                          "用哪个账号发的？",
                        )}
                      >
                        <Input
                          value={account[p.id] ?? ""}
                          onChange={(e) =>
                            setAccount((s) => ({
                              ...s,
                              [p.id]: e.target.value,
                            }))
                          }
                          placeholder={t("Main account", "主账号")}
                        />
                      </Field>
                      <Field label={t("Link to the post", "帖子链接")}>
                        <Input
                          value={url[p.id] ?? ""}
                          onChange={(e) =>
                            setUrl((s) => ({ ...s, [p.id]: e.target.value }))
                          }
                          placeholder="https://"
                        />
                      </Field>
                      <div className="sm:col-span-2">
                        <Button
                          variant="solid"
                          disabled={
                            !(url[p.id] ?? "").trim() ||
                            !(account[p.id] ?? "").trim()
                          }
                          onClick={() =>
                            act(`packages/${p.id}/record`, {
                              method: "POST",
                              body: JSON.stringify({
                                live_url: url[p.id],
                                account: account[p.id],
                              }),
                            })
                          }
                        >
                          {t("Save it", "保存")}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          );
        })}
      </div>

      {packages.length ? (
        <p className="mt-5 text-[13px]" style={{ color: "var(--ink-gray-4)" }}>
          {t(
            "There is no post button here on purpose. You post it yourself, in the platform's own app.",
            "这里故意没有发布按钮。请你自己在平台官方 App 里发。",
          )}
        </p>
      ) : null}
    </>
  );
}

function Messages({
  lang,
  rows,
  act,
  busy,
}: {
  lang: Lang;
  rows: Row[];
  act: ActFn;
  busy: boolean;
}) {
  const zh = lang === "zh";
  const t = (en: string, z: string) => (zh ? z : en);
  const [message, setMessage] = useState("");

  return (
    <>
      <PageHead
        title={t("Messages", "消息")}
        subtitle={t(
          "The assistant answers what it can back up, and passes anything sensitive to you.",
          "有依据的问题助手会答，敏感的它会交给你。",
        )}
      />

      <Card className="mb-5">
        <CardHeader
          title={t("Try a message", "试一条消息")}
          subtitle={t(
            "Type what someone might ask.",
            "输入一句别人可能会问的话。",
          )}
        />
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t(
              "Is the course still running?",
              "年报精读那个课还开吗？",
            )}
          />
          <Button
            variant="solid"
            icon={Send}
            disabled={!message.trim()}
            loading={busy}
            onClick={async () => {
              const d = await act("conversations", {
                method: "POST",
                body: JSON.stringify({ message, participant: "Contact" }),
              });
              if (d) setMessage("");
            }}
          >
            {t("Send", "发送")}
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {rows.map((c) => {
          const mode = MODE_LABEL[c.mode as string];
          return (
            <Card key={c.id}>
              <div className="flex items-start gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
                  style={{
                    background: "var(--surface-gray-3)",
                    color: "var(--ink-gray-6)",
                  }}
                >
                  {String(c.participant).slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-medium">
                      {c.participant}
                    </span>
                    <Badge tone={mode?.tone ?? "gray"}>
                      {zh ? mode?.zh : mode?.en}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[14.5px] leading-relaxed">
                    {c.message}
                  </p>
                  {c.ai_answer ? (
                    <div
                      className="mt-3 rounded-[var(--r)] p-3.5"
                      style={{ background: "var(--surface-gray-2)" }}
                    >
                      <p className="text-[14px] leading-relaxed">
                        {c.ai_answer}
                      </p>
                    </div>
                  ) : null}
                  <p
                    className="mt-2.5 text-[13px]"
                    style={{ color: "var(--ink-gray-4)" }}
                  >
                    {c.trigger_reason}
                  </p>
                  <div className="mt-3">
                    {c.takeover_state === "taken" ? (
                      <Badge tone="green" icon={Check}>
                        {t("You took this over", "你已接管")}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() =>
                          act(`conversations/${c.id}/takeover`, {
                            method: "POST",
                            body: "{}",
                          })
                        }
                      >
                        {t("I'll handle this", "我来处理")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function Leads({ lang, rows, act }: { lang: Lang; rows: Row[]; act: ActFn }) {
  const zh = lang === "zh";
  const t = (en: string, z: string) => (zh ? z : en);
  const [note, setNote] = useState<Record<string, string>>({});

  return (
    <>
      <PageHead
        title={t("Leads", "线索")}
        subtitle={t(
          "People who sounded like business. The assistant stops replying to them until you decide.",
          "听起来像生意的人。在你决定之前，助手不会再自动回他们。",
        )}
      />
      {!rows.length ? (
        <EmptyState
          icon={Target}
          title={t("No leads yet", "还没有线索")}
          body={t(
            "Send a message about a partnership in Messages and one shows up here.",
            "在“消息”里发一条谈合作的话，这里就会出现一条。",
          )}
        />
      ) : null}
      <div className="space-y-3">
        {rows.map((l) => (
          <Card key={l.id}>
            <div className="flex flex-wrap items-start gap-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[15px] font-bold"
                style={{
                  background:
                    l.score >= 80
                      ? "var(--surface-red-2)"
                      : "var(--surface-amber-2)",
                  color:
                    l.score >= 80 ? "var(--ink-red-4)" : "var(--ink-amber-3)",
                }}
              >
                {l.score}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15.5px] font-semibold">{l.contact}</p>
                <p
                  className="mt-0.5 text-[13.5px]"
                  style={{ color: "var(--ink-gray-6)" }}
                >
                  {l.intent} ·{" "}
                  {l.owner_name ?? t("nobody assigned", "还没人负责")}
                </p>
                {l.source_message ? (
                  <p
                    className="mt-2 text-[13.5px] italic"
                    style={{ color: "var(--ink-gray-4)" }}
                  >
                    “{l.source_message}”
                  </p>
                ) : null}
              </div>
              <Badge
                tone={
                  l.status === "closed"
                    ? "gray"
                    : l.status === "new"
                      ? "amber"
                      : "green"
                }
              >
                {l.status}
              </Badge>
            </div>
            <Divider />
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[200px] flex-1">
                <Input
                  value={note[l.id] ?? ""}
                  onChange={(e) =>
                    setNote((p) => ({ ...p, [l.id]: e.target.value }))
                  }
                  placeholder={t("What happened?", "发生了什么？")}
                />
              </div>
              <Button
                onClick={() =>
                  act(`leads/${l.id}`, {
                    method: "POST",
                    body: JSON.stringify({ status: "accepted" }),
                  })
                }
              >
                {t("Take it", "接下")}
              </Button>
              <Button
                disabled={!(note[l.id] ?? "").trim()}
                onClick={() =>
                  act(`leads/${l.id}/followup`, {
                    method: "POST",
                    body: JSON.stringify({ note: note[l.id] }),
                  })
                }
              >
                {t("Log a note", "记一笔")}
              </Button>
              <Button
                variant="ghost"
                disabled={!(note[l.id] ?? "").trim()}
                onClick={() =>
                  act(`leads/${l.id}`, {
                    method: "POST",
                    body: JSON.stringify({
                      status: "closed",
                      outcome: note[l.id],
                    }),
                  })
                }
              >
                {t("Close", "结案")}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

const METRIC_LABEL: Record<string, { en: string; zh: string }> = {
  views: { en: "Views", zh: "播放" },
  likes: { en: "Likes", zh: "点赞" },
  shares: { en: "Shares", zh: "分享" },
  follower_adds: { en: "New followers", zh: "新增关注" },
  like_rate: { en: "Like rate", zh: "点赞率" },
  share_rate: { en: "Share rate", zh: "分享率" },
  completion_rate: { en: "Finished watching", zh: "完播率" },
  group_exits: { en: "Group exits", zh: "退群" },
};

function Results({
  lang,
  data,
  act,
}: {
  lang: Lang;
  data: Row | null;
  act: ActFn;
}) {
  const zh = lang === "zh";
  const t = (en: string, z: string) => (zh ? z : en);
  const recs = (data?.recommendations as Row[]) ?? [];
  const report = (data?.report as Row) ?? null;

  return (
    <>
      <PageHead
        title={t("Results", "数据")}
        subtitle={t(
          "What actually happened, and what to change next time.",
          "实际发生了什么，以及下次要改什么。",
        )}
      />

      {report ? (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(report.totals as Record<string, number | null>)
            .slice(0, 8)
            .map(([k, v]) => (
              <Card key={k}>
                <p
                  className="text-[12.5px] font-medium"
                  style={{ color: "var(--ink-gray-4)" }}
                >
                  {METRIC_LABEL[k]?.[lang] ?? k}
                </p>
                <p className="mt-1.5 text-[22px] font-semibold leading-none">
                  {v == null ? (
                    <span
                      className="text-[15px]"
                      style={{ color: "var(--ink-red-4)" }}
                    >
                      {t("not available", "拿不到")}
                    </span>
                  ) : typeof v === "number" && v < 1 ? (
                    `${(v * 100).toFixed(1)}%`
                  ) : (
                    v.toLocaleString()
                  )}
                </p>
              </Card>
            ))}
        </div>
      ) : null}

      {report && (report.missing as string[]).length ? (
        <p
          className="mb-5 flex items-center gap-2 text-[13px]"
          style={{ color: "var(--ink-gray-6)" }}
        >
          <AlertTriangle
            className="h-4 w-4"
            style={{ color: "var(--ink-amber-3)" }}
          />
          {t(
            "Some numbers could not be collected. They are shown as missing rather than guessed.",
            "有些数字采不到。这里照实标为缺失，不做估算。",
          )}
        </p>
      ) : null}

      <Card>
        <CardHeader
          title={t("Suggestions for next time", "下次的建议")}
          subtitle={t(
            "Only the ones you approve change anything.",
            "只有你通过的，才会真的改变什么。",
          )}
        />
        <div className="space-y-3">
          {recs.map((r) => (
            <div
              key={r.id}
              className="rounded-[var(--r)] p-4"
              style={{ background: "var(--surface-gray-2)" }}
            >
              <p className="text-[14.5px] font-medium">
                {zh ? r.text_zh : r.text_en}
              </p>
              <p
                className="mt-1 text-[13px]"
                style={{ color: "var(--ink-gray-6)" }}
              >
                {zh ? r.evidence_zh : r.evidence_en}
              </p>
              <div className="mt-3">
                {r.decision ? (
                  <Badge tone={r.decision === "approved" ? "green" : "gray"}>
                    {r.decision === "approved"
                      ? t("Using it", "已采纳")
                      : t("Ignored", "未采纳")}
                  </Badge>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="solid"
                      onClick={() =>
                        act(`recommendations/${r.id}`, {
                          method: "POST",
                          body: JSON.stringify({ decision: "approved" }),
                        })
                      }
                    >
                      {t("Use it", "采纳")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        act(`recommendations/${r.id}`, {
                          method: "POST",
                          body: JSON.stringify({ decision: "rejected" }),
                        })
                      }
                    >
                      {t("Skip", "忽略")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function Knowledge({
  lang,
  rows,
  act,
  busy,
}: {
  lang: Lang;
  rows: Row[];
  act: ActFn;
  busy: boolean;
}) {
  const zh = lang === "zh";
  const t = (en: string, z: string) => (zh ? z : en);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const tone: Record<string, Tone> = {
    indexed: "green",
    review: "amber",
    restricted: "red",
    expired: "red",
  };
  const label: Record<string, { en: string; zh: string }> = {
    indexed: { en: "In use", zh: "使用中" },
    review: { en: "Needs approval", zh: "待批准" },
    restricted: { en: "Off limits", zh: "受限" },
    expired: { en: "Expired", zh: "已过期" },
  };

  return (
    <>
      <PageHead
        title={t("Knowledge", "知识库")}
        subtitle={t(
          "What the assistant is allowed to answer from. Nothing is used until you approve it.",
          "助手可以据以作答的材料。你不批准，它就用不了。",
        )}
      />

      <Card className="mb-5">
        <CardHeader title={t("Add something", "添加材料")} />
        <div className="space-y-3">
          <Field label={t("What is it?", "叫什么？")}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("Course handbook", "课程手册")}
            />
          </Field>
          <Field
            label={t("Paste the text", "粘贴正文")}
            hint={t("Leave a blank line between sections.", "段落之间空一行。")}
          >
            <Textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </Field>
          <Button
            variant="solid"
            disabled={!name.trim()}
            loading={busy}
            onClick={async () => {
              const d = await act("knowledge", {
                method: "POST",
                body: JSON.stringify({ name, text }),
              });
              if (d) {
                setName("");
                setText("");
              }
            }}
          >
            {t("Add it", "添加")}
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        {rows.map((d) => (
          <Card key={d.id}>
            <div className="flex flex-wrap items-center gap-3">
              <BookOpen
                className="h-[18px] w-[18px] shrink-0"
                style={{ color: "var(--ink-gray-4)" }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-medium">
                  {zh ? d.name_zh : d.name_en}
                </p>
                <Meta>
                  {zh ? d.type_zh : d.type_en} · {d.doc_version}
                </Meta>
              </div>
              <Badge tone={tone[d.status]}>
                {zh ? label[d.status]?.zh : label[d.status]?.en}
              </Badge>
              {d.status !== "indexed" ? (
                <Button
                  size="sm"
                  onClick={() =>
                    act(`knowledge/${d.id}/status`, {
                      method: "POST",
                      body: JSON.stringify({ status: "indexed" }),
                    })
                  }
                >
                  {t("Approve", "批准")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    act(`knowledge/${d.id}/status`, {
                      method: "POST",
                      body: JSON.stringify({ status: "restricted" }),
                    })
                  }
                >
                  {t("Stop using", "停用")}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

const SETTING_GROUP: Record<string, { en: string; zh: string }> = {
  topic: { en: "Finding topics", zh: "选题" },
  script: { en: "Writing", zh: "写作" },
  risk: { en: "Fact checking", zh: "核查" },
  persona: { en: "The assistant", zh: "助手" },
  lead: { en: "Leads", zh: "线索" },
  platform: { en: "Platform rules", zh: "平台规则" },
  platforms: { en: "Platforms", zh: "平台" },
  model: { en: "Model", zh: "模型" },
  retention: { en: "Keeping data", zh: "数据留存" },
};

function SettingsScreen({
  lang,
  rows,
  act,
}: {
  lang: Lang;
  rows: Row[];
  act: ActFn;
}) {
  const zh = lang === "zh";
  const t = (en: string, z: string) => (zh ? z : en);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const groups = [...new Set(rows.map((r) => String(r.key).split(".")[0]))];

  return (
    <>
      <PageHead
        title={t("Settings", "配置")}
        subtitle={t(
          "Everything here applies to this workspace only. Changing one is recorded.",
          "这里的设置只对本工作区生效，改动都会留痕。",
        )}
      />
      <div className="space-y-4">
        {groups.map((g) => {
          const items = rows.filter((r) => String(r.key).split(".")[0] === g);
          return (
            <Card key={g}>
              <CardHeader title={SETTING_GROUP[g]?.[lang] ?? g} />
              <div className="space-y-3">
                {items.map((c) => (
                  <div key={c.key} className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[200px] flex-1">
                      <Field
                        label={String(c.key)
                          .split(".")
                          .slice(1)
                          .join(" ")
                          .replace(/_/g, " ")}
                      >
                        <Input
                          value={edit[c.key] ?? c.value}
                          onChange={(e) =>
                            setEdit((p) => ({ ...p, [c.key]: e.target.value }))
                          }
                        />
                      </Field>
                    </div>
                    <Button
                      disabled={(edit[c.key] ?? c.value) === c.value}
                      onClick={() =>
                        act("config", {
                          method: "POST",
                          body: JSON.stringify({
                            key: c.key,
                            value: edit[c.key],
                          }),
                        })
                      }
                    >
                      {t("Save", "保存")}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function ActivityScreen({ lang, rows }: { lang: Lang; rows: Row[] }) {
  const zh = lang === "zh";
  const t = (en: string, z: string) => (zh ? z : en);
  return (
    <>
      <PageHead
        title={t("Activity", "操作记录")}
        subtitle={t(
          "Everything anyone did, in order, with the reason where one was needed.",
          "所有人做过的事，按时间排，需要理由的地方也记着。",
        )}
      />
      <Card padded={false}>
        <ul>
          {rows.map((e, i) => (
            <li
              key={e.id}
              className="flex items-start gap-3 px-5 py-3"
              style={{
                borderTop: i ? "1px solid var(--outline-gray-1)" : undefined,
              }}
            >
              <span className="mt-1.5">
                <Dot
                  tone={
                    e.action === "transition_refused"
                      ? "red"
                      : e.action === "lock" || e.action === "publish_record"
                        ? "green"
                        : "gray"
                  }
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px]">{describeEvent(e, lang)}</p>
                {e.reason ? (
                  <p
                    className="mt-0.5 text-[13px]"
                    style={{ color: "var(--ink-gray-4)" }}
                  >
                    “{e.reason}”
                  </p>
                ) : null}
              </div>
              <Meta>{String(e.created_at).slice(5, 16).replace("T", " ")}</Meta>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
