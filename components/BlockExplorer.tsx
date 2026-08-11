"use client";

import { useState } from "react";
import { STATES } from "@/content/states";
import { COMMON } from "@/content/copy";
import { tx, txs, type Lang } from "@/lib/i18n";
import { clsx } from "@/lib/clsx";
import { Signal } from "@/components/Signal";
import { Label } from "@/components/Kit";

/**
 * The line as a list you can interrogate.
 *
 * Selecting a block reads out what has to prove before the signal ahead of it
 * clears, which is the only thing anyone actually wants to know about a
 * workflow state. The selected row is marked by a filled ground and a rule
 * down its inside edge rather than by colour, so the three colours on this
 * page keep meaning what they mean everywhere else.
 */
export function BlockExplorer({ lang }: { lang: Lang }) {
  const [selected, setSelected] = useState(4); // FACT_REVIEW, where the work is
  const state = STATES[selected];

  return (
    <div className="overflow-hidden rounded-xl border border-rule lg:grid lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
      <ol className="border-b border-rule bg-panel lg:border-b-0 lg:border-r">
        {STATES.map((s, i) => {
          const active = i === selected;
          return (
            <li key={s.code}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                aria-current={active ? "true" : undefined}
                className={clsx(
                  "group relative flex w-full items-center gap-3 px-5 py-3 text-left",
                  "[transition:background-color_160ms_var(--ease-out)]",
                  active ? "bg-panel-raised" : "hov:bg-panel-deep",
                )}
              >
                {/* The marker for "you are here". 2px, inside edge, no colour. */}
                <span
                  aria-hidden
                  className={clsx(
                    "absolute inset-y-0 left-0 w-0.5 [transition:background-color_160ms_var(--ease-out)]",
                    active ? "bg-bone" : "bg-transparent",
                  )}
                />
                <Signal aspect={active ? "caution" : "dark"} size="sm" />
                <span className="mono w-7 shrink-0 text-[11px] text-bone-faint">
                  {s.post}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={clsx(
                      "block truncate text-[14px] [transition:color_160ms_var(--ease-out)]",
                      active
                        ? "font-medium text-bone"
                        : "text-bone-dim group-hov:text-bone",
                    )}
                  >
                    {tx(s.name, lang)}
                  </span>
                  <span className="mono mt-0.5 block truncate text-[11px] text-bone-faint">
                    {s.code}
                  </span>
                </span>
                {s.beyondAuthority ? (
                  <span
                    aria-hidden
                    title="Beyond the boundary"
                    className="h-7 w-px shrink-0"
                    style={{
                      background:
                        "repeating-linear-gradient(180deg, var(--lamp-red) 0 3px, transparent 3px 6px)",
                    }}
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>

      {/*
        Keyed on the selected state so the panel replays its entrance when the
        contents change. Without the key the text swaps in place, which reads
        as a glitch rather than as a new record being pulled.
      */}
      <div key={state.code} className="rise bg-panel-raised p-6 sm:p-9">
        <p className="mono text-[11.5px] text-bone-faint">
          {state.post} · {state.code}
        </p>
        <h3 className="display mt-3 text-[clamp(1.75rem,3vw,2.5rem)]">
          {tx(state.name, lang)}
        </h3>
        <p className="lede measure mt-4 text-[17px] text-bone-dim">
          {tx(state.meaning, lang)}
        </p>

        <div className="mt-9 grid gap-9 sm:grid-cols-[minmax(0,1fr)_minmax(0,13rem)] sm:gap-10">
          <div>
            <Label>{tx(COMMON.conditions, lang)}</Label>
            <ul className="mt-3.5 space-y-2.5">
              {txs(state.conditions, lang).map((c) => (
                <li
                  key={c}
                  className="flex items-start gap-3 text-[14px] leading-relaxed"
                >
                  <span className="flex h-[1.6em] shrink-0 items-center">
                    <Signal
                      aspect={state.beyondAuthority ? "dark" : "clear"}
                      size="xs"
                    />
                  </span>
                  <span className="text-bone-dim">{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <dl className="space-y-6 border-t border-rule pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
            <div>
              <dt>
                <Label>{tx(COMMON.role, lang)}</Label>
              </dt>
              <dd className="mt-2 text-[14.5px] text-bone">
                {tx(state.role, lang)}
              </dd>
            </div>
            <div>
              <dt>
                <Label>{tx(COMMON.produces, lang)}</Label>
              </dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-bone-dim">
                {tx(state.produces, lang)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
