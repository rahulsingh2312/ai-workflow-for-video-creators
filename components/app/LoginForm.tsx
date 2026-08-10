"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { brand } from "@/lib/brand";
import { Badge, Button, Field, Input } from "@/components/app/kit";

const ACCOUNTS: {
  email: string;
  name: string;
  role: { en: string; zh: string };
  can: { en: string; zh: string };
}[] = [
  {
    email: "admin@example.com",
    name: "Admin",
    role: { en: "Everything", zh: "全部权限" },
    can: { en: "Do the whole thing start to finish", zh: "一个人从头走到尾" },
  },
  {
    email: "wu@example.com",
    name: "Wu Jia",
    role: { en: "Writer", zh: "内容执行" },
    can: { en: "Start topics and drafts", zh: "开选题、写草稿" },
  },
  {
    email: "zhang@example.com",
    name: "Zhang Wei",
    role: { en: "Editor", zh: "审核" },
    can: { en: "Approve topics and lock scripts", zh: "通过选题、锁定脚本" },
  },
  {
    email: "lin@example.com",
    name: "Lin Tao",
    role: { en: "Video", zh: "制作" },
    can: { en: "Upload the finished video", zh: "上传成片" },
  },
  {
    email: "he@example.com",
    name: "He Ping",
    role: { en: "Publishing", zh: "发布" },
    can: { en: "Get the captions and record the link", zh: "拿文案、登记链接" },
  },
  {
    email: "sun@example.com",
    name: "Sun Li",
    role: { en: "Sales", zh: "销售" },
    can: { en: "Handle messages and leads", zh: "处理消息和线索" },
  },
];

export function LoginForm({ lang }: { lang: Lang }) {
  const zh = lang === "zh";
  const t = (en: string, z: string) => (zh ? z : en);
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("throughline");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* The app owns its own theme; make sure the toggle state is on the document. */
  useEffect(() => {
    if (!document.documentElement.getAttribute("data-theme")) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? t("That did not work.", "登录失败。"));
        return;
      }
      router.push(`/${lang}/workspace`);
      router.refresh();
    } catch {
      setError(t("Could not reach the server.", "连接不上服务器。"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      data-surface="app"
      className="flex min-h-dvh flex-col"
      style={{ background: "var(--surface-white)", color: "var(--ink-gray-9)" }}
    >
      <div className="mx-auto grid w-full max-w-[980px] flex-1 items-center gap-12 px-6 py-12 lg:grid-cols-2 lg:gap-16">
        {/* Sign in */}
        <div className="order-2 lg:order-1">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-[var(--r)] text-[16px] font-bold"
            style={{
              background: "var(--surface-gray-7)",
              color: "var(--ink-white)",
            }}
          >
            {zh ? "主" : "T"}
          </span>
          <h1 className="mt-6 text-[30px] font-semibold leading-tight">
            {t("Welcome back", "欢迎回来")}
          </h1>
          <p
            className="mt-2 text-[15px] leading-relaxed"
            style={{ color: "var(--ink-gray-6)" }}
          >
            {t(
              "Sign in to pick a topic, write a script, and get it ready to post.",
              "登录后可以挑选题、写脚本，并把它准备到可以发布。",
            )}
          </p>

          <form onSubmit={submit} className="mt-8 max-w-sm space-y-4">
            <Field label={t("Email", "邮箱")} id="email">
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label={t("Password", "密码")} id="password">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            {error ? (
              <p
                className="rounded-[var(--r-sm)] px-3 py-2.5 text-[13.5px]"
                style={{
                  background: "var(--surface-red-2)",
                  color: "var(--ink-red-4)",
                  border: "1px solid var(--outline-red-1)",
                }}
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="solid"
              size="lg"
              full
              loading={busy}
              icon={ArrowRight}
            >
              {t("Sign in", "登录")}
            </Button>
          </form>

          <Link
            href={`/${lang}`}
            className="mt-6 inline-flex items-center gap-1.5 text-[13.5px]"
            style={{ color: "var(--ink-gray-4)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t(`About ${brand.nameEn}`, `了解 ${brand.nameZh}`)}
          </Link>
        </div>

        {/* Who you can be */}
        <div className="order-1 lg:order-2">
          <div
            className="rounded-[var(--r)] p-5"
            style={{
              background: "var(--surface-white)",
              border: "1px solid var(--outline-gray-1)",
              boxShadow: "var(--sh-md)",
            }}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold">
                {t("Pick who to be", "选一个身份")}
              </h2>
              <Badge>{t("test accounts", "测试账号")}</Badge>
            </div>
            <p
              className="mt-1.5 text-[13.5px] leading-relaxed"
              style={{ color: "var(--ink-gray-6)" }}
            >
              {t(
                "Different people can do different things here. Tap one to fill the form.",
                "不同的人能做的事不一样。点一个就填进表单。",
              )}
            </p>

            <ul className="mt-4 space-y-1.5">
              {ACCOUNTS.map((a) => {
                const active = a.email === email;
                return (
                  <li key={a.email}>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(a.email);
                        setPassword("throughline");
                        setError(null);
                      }}
                      className="flex w-full items-center gap-3 rounded-[var(--r-sm)] px-3 py-2.5 text-left transition-colors duration-150"
                      style={{
                        background: active
                          ? "var(--surface-gray-2)"
                          : "transparent",
                        border: `1px solid ${active ? "var(--outline-gray-2)" : "transparent"}`,
                      }}
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
                        style={{
                          background: "var(--surface-gray-3)",
                          color: "var(--ink-gray-6)",
                        }}
                      >
                        {a.name.slice(0, 2)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-[14px] font-medium">
                            {a.name}
                          </span>
                          <span
                            className="text-[12.5px]"
                            style={{ color: "var(--ink-gray-4)" }}
                          >
                            {zh ? a.role.zh : a.role.en}
                          </span>
                        </span>
                        <span
                          className="mt-0.5 block text-[12.5px]"
                          style={{ color: "var(--ink-gray-4)" }}
                        >
                          {zh ? a.can.zh : a.can.en}
                        </span>
                      </span>
                      {active ? (
                        <Check
                          className="h-4 w-4 shrink-0"
                          style={{ color: "var(--ink-green-3)" }}
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p
              className="mt-3 text-[12.5px]"
              style={{ color: "var(--ink-gray-4)" }}
            >
              {t(
                "They all use the password shown above.",
                "它们共用上面那个密码。",
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
