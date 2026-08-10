"use client";

import { useState } from "react";
import { THREADS, MODE_ASPECT, type Mode } from "@/content/persona";
import { SECTIONS } from "@/content/copy";
import { tx, type Lang } from "@/lib/i18n";
import { clsx } from "@/lib/clsx";
import { Signal } from "@/components/Signal";

const MODES: Mode[] = ["AUTO", "DRAFT", "HANDOFF", "REFUSE"];

export function PersonaThread({ lang }: { lang: Lang }) {
  const [mode, setMode] = useState<Mode>("AUTO");
  const thread = THREADS.find((t) => t.mode === mode)!;
  const aspect = MODE_ASPECT[mode];

  return (
    <div>
      <div role="tablist" aria-label="Response modes" className="flex flex-wrap gap-2">
        {MODES.map((m) => {
          const active = m === mode;
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(m)}
              className={clsx(
                "plate flex items-center gap-2 rounded-sm border px-3 py-2 text-[11px] transition-colors duration-150",
                active
                  ? "border-rule-strong bg-panel-raised text-bone"
                  : "border-rule bg-panel-deep text-bone-dim hover:border-rule-strong hover:text-bone",
              )}
            >
              <Signal aspect={active ? MODE_ASPECT[m] : "dark"} size="xs" />
              {m}
            </button>
          );
        })}
      </div>

      <p className="measure mt-4 text-[14px] leading-relaxed text-bone-dim">
        {tx(SECTIONS.persona.modes[mode], lang)}
      </p>

      <div className="mt-8 grid gap-px overflow-hidden rounded-sm border border-rule bg-rule lg:grid-cols-2">
        {/* The thread as it appears in Enterprise WeChat. */}
        <div className="bg-panel-deep p-6 sm:p-8">
          <p className="plate text-[10px] text-bone-faint">
            {lang === "zh" ? "企业微信 · 会话" : "Enterprise WeChat · conversation"}
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[12px] text-bone-dim">{tx(thread.from, lang)}</span>
              <span className="data text-[11px] text-bone-faint">{thread.time}</span>
            </div>
            <p className="rounded-sm rounded-tl-none border border-rule bg-panel px-4 py-3 text-[14px] leading-relaxed">
              {tx(thread.message, lang)}
            </p>

            <div className="flex items-center gap-2 pt-2">
              <Signal aspect={aspect} size="sm" />
              <span className="plate text-[10px] text-bone-dim">{mode}</span>
              <span
                className="ml-auto data text-[11px]"
                style={{
                  color:
                    aspect === "danger"
                      ? "var(--fg-red)"
                      : aspect === "caution"
                        ? "var(--fg-amber)"
                        : "var(--fg-green)",
                }}
              >
                {lang === "zh" ? "置信度 " : "confidence "}
                {thread.confidence.toFixed(2)}
              </span>
            </div>
            <p
              className="rounded-sm rounded-tr-none border px-4 py-3 text-[14px] leading-relaxed"
              style={{
                borderColor:
                  aspect === "danger"
                    ? "color-mix(in srgb, var(--lamp-red) 45%, transparent)"
                    : aspect === "caution"
                      ? "color-mix(in srgb, var(--lamp-amber) 45%, transparent)"
                      : "color-mix(in srgb, var(--lamp-green) 45%, transparent)",
                background: "var(--panel)",
              }}
            >
              {tx(thread.reply, lang)}
            </p>
          </div>
        </div>

        {/* What the system recorded while doing it. */}
        <div className="bg-panel p-6 sm:p-8">
          <dl className="space-y-6">
            <div>
              <dt className="plate text-[10px] text-bone-faint">
                {lang === "zh" ? "为什么是这个模式" : "Why this mode"}
              </dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-bone-dim">
                {tx(thread.trigger, lang)}
              </dd>
            </div>

            <div>
              <dt className="plate text-[10px] text-bone-faint">
                {lang === "zh" ? "内部引用" : "Internal citations"}
              </dt>
              <dd className="mt-2">
                {thread.sources.length ? (
                  <ul className="space-y-1.5">
                    {thread.sources.map((s, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px] text-bone-dim">
                        <Signal aspect="clear" size="xs" className="mt-[6px]" />
                        <span>{tx(s, lang)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] leading-relaxed text-bone-faint">
                    {lang === "zh"
                      ? "没有引用，因为没有作答。空就是空，不会拿别的东西填上。"
                      : "None, because nothing was answered. An empty field stays empty rather than being filled with something else."}
                  </p>
                )}
              </dd>
            </div>

            {thread.side ? (
              <div>
                <dt className="plate text-[10px] text-bone-faint">
                  {lang === "zh" ? "同时发生的事" : "What else happened"}
                </dt>
                <dd className="mt-2 text-[14px] leading-relaxed text-bone-dim">
                  {tx(thread.side, lang)}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </div>
  );
}
