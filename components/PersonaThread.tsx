"use client";

import { useState } from "react";
import { THREADS, MODE_ASPECT, type Mode } from "@/content/persona";
import { SECTIONS } from "@/content/copy";
import { tx, type Lang } from "@/lib/i18n";
import { clsx } from "@/lib/clsx";
import { Signal } from "@/components/Signal";
import { Label } from "@/components/Kit";

const MODES: Mode[] = ["AUTO", "DRAFT", "HANDOFF", "REFUSE"];

const FG: Record<string, string> = {
  danger: "var(--fg-red)",
  caution: "var(--fg-amber)",
  clear: "var(--fg-green)",
  dark: "var(--bone-faint)",
};

/**
 * One conversation, four ways.
 *
 * Left is what the client sees in Enterprise WeChat. Right is what the system
 * wrote down while it decided. Showing them side by side is the argument: the
 * reply is never the whole record, and the record is always available.
 */
export function PersonaThread({ lang }: { lang: Lang }) {
  const [mode, setMode] = useState<Mode>("AUTO");
  const thread = THREADS.find((t) => t.mode === mode)!;
  const aspect = MODE_ASPECT[mode];

  return (
    <div>
      {/* The four modes, as a segmented control. They are exclusive, and there
          are exactly four, so a row of tabs says that better than a menu. */}
      <div
        role="tablist"
        aria-label={lang === "zh" ? "回复模式" : "Response modes"}
        className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-rule bg-panel-inset p-1"
      >
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
                "press mono flex h-8 items-center gap-2 rounded-md px-3 text-[11.5px] tracking-[0.05em]",
                "[transition:background-color_160ms_var(--ease-out),color_160ms_var(--ease-out)]",
                active
                  ? "bg-panel-raised text-bone"
                  : "text-bone-faint hov:text-bone",
              )}
            >
              <Signal aspect={active ? MODE_ASPECT[m] : "dark"} size="xs" />
              {m}
            </button>
          );
        })}
      </div>

      <p className="lede measure mt-5 text-[16px] text-bone-dim">
        {tx(SECTIONS.persona.modes[mode], lang)}
      </p>

      <div
        key={mode}
        className="rise mt-10 overflow-hidden rounded-xl border border-rule lg:grid lg:grid-cols-2"
      >
        {/* ── What the client sees ──────────────────────────────────────── */}
        <div className="border-b border-rule bg-panel-deep p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <Label>
            {lang === "zh"
              ? "企业微信 · 会话"
              : "Enterprise WeChat · conversation"}
          </Label>

          <div className="mt-7 space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[13px] text-bone-dim">
                {tx(thread.from, lang)}
              </span>
              <span className="mono text-[11.5px] text-bone-faint">
                {thread.time}
              </span>
            </div>
            <p className="rounded-lg rounded-tl-sm border border-rule bg-panel-raised px-4 py-3 text-[14.5px] leading-relaxed">
              {tx(thread.message, lang)}
            </p>

            <div className="flex items-center gap-2.5 pt-3">
              <Signal aspect={aspect} size="sm" />
              <span className="mono text-[11.5px] tracking-[0.05em] text-bone-dim">
                {mode}
              </span>
              <span
                className="mono ml-auto text-[11.5px]"
                style={{ color: FG[aspect] }}
              >
                {lang === "zh" ? "置信度 " : "confidence "}
                {thread.confidence.toFixed(2)}
              </span>
            </div>
            <p
              className="rounded-lg rounded-tr-sm border px-4 py-3 text-[14.5px] leading-relaxed"
              style={{
                borderColor: `color-mix(in srgb, ${FG[aspect]} 32%, transparent)`,
                background: "var(--panel-raised)",
              }}
            >
              {tx(thread.reply, lang)}
            </p>
          </div>
        </div>

        {/* ── What the system recorded while doing it ───────────────────── */}
        <div className="bg-panel-raised p-6 sm:p-8">
          <dl className="space-y-7">
            <div>
              <dt>
                <Label>
                  {lang === "zh" ? "为什么是这个模式" : "Why this mode"}
                </Label>
              </dt>
              <dd className="mt-2.5 text-[14.5px] leading-relaxed text-bone-dim">
                {tx(thread.trigger, lang)}
              </dd>
            </div>

            <div>
              <dt>
                <Label>
                  {lang === "zh" ? "内部引用" : "Internal citations"}
                </Label>
              </dt>
              <dd className="mt-2.5">
                {thread.sources.length ? (
                  <ul className="space-y-2">
                    {thread.sources.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-[13.5px] leading-relaxed text-bone-dim"
                      >
                        <span className="flex h-[1.6em] shrink-0 items-center">
                          <Signal aspect="clear" size="xs" />
                        </span>
                        <span>{tx(s, lang)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="lede text-[14.5px] text-bone-faint">
                    {lang === "zh"
                      ? "没有引用，因为没有作答。空就是空，不会拿别的东西填上。"
                      : "None, because nothing was answered. An empty field stays empty rather than being filled with something else."}
                  </p>
                )}
              </dd>
            </div>

            {thread.side ? (
              <div>
                <dt>
                  <Label>
                    {lang === "zh" ? "同时发生的事" : "What else happened"}
                  </Label>
                </dt>
                <dd className="mt-2.5 text-[14.5px] leading-relaxed text-bone-dim">
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
