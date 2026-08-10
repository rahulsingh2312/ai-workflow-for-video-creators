"use client";

import { useState } from "react";
import { STATES } from "@/content/states";
import { COMMON } from "@/content/copy";
import { tx, txs, type Lang } from "@/lib/i18n";
import { clsx } from "@/lib/clsx";
import { Signal } from "@/components/Signal";

/**
 * The line as a list you can interrogate. Selecting a block reads out what the
 * interlocking proves before the signal ahead of it will clear, which is the
 * only thing anyone actually wants to know about a workflow state.
 */
export function BlockExplorer({ lang }: { lang: Lang }) {
  const [selected, setSelected] = useState(4); // FACT_REVIEW, where the work is
  const state = STATES[selected];

  return (
    <div className="grid gap-px overflow-hidden rounded-sm border border-rule bg-rule lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <ol className="bg-panel-deep">
        {STATES.map((s, i) => {
          const active = i === selected;
          return (
            <li key={s.code}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                aria-current={active ? "true" : undefined}
                className={clsx(
                  "group flex w-full items-center gap-3 border-b border-rule px-4 py-3 text-left transition-colors duration-150 last:border-b-0",
                  active ? "bg-panel-raised" : "hover:bg-panel",
                )}
              >
                <Signal aspect={active ? "caution" : "dark"} size="sm" />
                <span className="plate data w-7 shrink-0 text-[10px] text-bone-faint">{s.post}</span>
                <span className="min-w-0 flex-1">
                  <span
                    className={clsx(
                      "plate block truncate text-[10px] transition-colors duration-150",
                      active ? "text-bone" : "text-bone-dim group-hover:text-bone",
                    )}
                  >
                    {s.code}
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-bone-dim">
                    {tx(s.name, lang)}
                  </span>
                </span>
                {s.beyondAuthority ? (
                  <span
                    aria-hidden
                    className="h-6 w-[3px] shrink-0"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(180deg, var(--lamp-red) 0 4px, transparent 4px 8px)",
                    }}
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="bg-panel p-6 sm:p-8">
        <p className="plate data text-[10px] text-bone-faint">
          {tx(COMMON.post, lang)} {state.post} · {state.code}
        </p>
        <h3 className="display mt-3 text-3xl font-semibold sm:text-4xl">{tx(state.name, lang)}</h3>
        <p className="measure mt-4 text-[15px] leading-relaxed text-bone-dim">
          {tx(state.meaning, lang)}
        </p>

        <div className="mt-8 grid gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)]">
          <div>
            <h4 className="plate text-[10px] text-bone-faint">{tx(COMMON.conditions, lang)}</h4>
            <ul className="mt-3 space-y-2">
              {txs(state.conditions, lang).map((c) => (
                <li key={c} className="flex items-start gap-2.5 text-[14px] leading-snug">
                  <Signal
                    aspect={state.beyondAuthority ? "dark" : "clear"}
                    size="xs"
                    className="mt-[7px]"
                  />
                  <span className="text-bone-dim">{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <dl className="space-y-5 border-t border-rule pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <div>
              <dt className="plate text-[10px] text-bone-faint">{tx(COMMON.role, lang)}</dt>
              <dd className="mt-1.5 text-[14px] text-bone">{tx(state.role, lang)}</dd>
            </div>
            <div>
              <dt className="plate text-[10px] text-bone-faint">{tx(COMMON.produces, lang)}</dt>
              <dd className="mt-1.5 text-[14px] leading-snug text-bone-dim">
                {tx(state.produces, lang)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
