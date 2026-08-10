"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { STATES } from "@/content/states";
import { HERO } from "@/content/copy";
import { tx, txs, type Lang } from "@/lib/i18n";
import { clsx } from "@/lib/clsx";
import { Signal } from "@/components/Signal";

type Mode = "idle" | "proving" | "held" | "handover" | "cleared" | "done";

/** FACT_REVIEW. Where most tasks actually sit, so it is where the line stalls. */
const HOLD_AT = 4;
/** PUBLISHED_MANUALLY. Past the boundary: a person does this, not the product. */
const BOUNDARY_AT = 9;

const PROVE_TICK = 120;
const CLEAR_MS = 90;
const HOLD_MS = 1500;
const HANDOVER_MS = 1400;

const REDUCED = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

export function RouteDiagram({ lang }: { lang: Lang }) {
  const reduced = usePrefersReducedMotion();
  const [rawIndex, setIndex] = useState(-1);
  const [rawMode, setMode] = useState<Mode>("idle");
  const [rawProved, setProved] = useState(0);
  const [run, setRun] = useState(0);
  const [started, setStarted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  /* Only start once the diagram is actually on screen. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    // Reduced motion is a render-time decision, not a state change: the whole
    // line is shown already cleared rather than cascading into that position.
    if (!started || reduced) return;

    let cancelled = false;
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(resolve, ms);
        timers.push(id);
      });
    const timers: ReturnType<typeof setTimeout>[] = [];

    (async () => {
      setIndex(-1);
      setMode("idle");
      setProved(0);
      await sleep(400);

      for (let i = 0; i < STATES.length; i++) {
        if (cancelled) return;
        setIndex(i);
        setMode("proving");
        setProved(0);

        const conditions = STATES[i].conditions[lang].length;
        for (let c = 1; c <= conditions; c++) {
          await sleep(PROVE_TICK);
          if (cancelled) return;
          setProved(c);
        }

        if (i === HOLD_AT) {
          setMode("held");
          await sleep(HOLD_MS);
          if (cancelled) return;
        }
        if (i === BOUNDARY_AT) {
          setMode("handover");
          await sleep(HANDOVER_MS);
          if (cancelled) return;
        }

        setMode("cleared");
        await sleep(CLEAR_MS);
      }

      if (cancelled) return;
      setIndex(STATES.length);
      setMode("done");
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [run, reduced, lang, started]);

  const replay = useCallback(() => setRun((r) => r + 1), []);

  /* With motion reduced the route is simply shown as already set. */
  const index = reduced ? STATES.length : rawIndex;
  const mode: Mode = reduced ? "done" : rawMode;
  const proved = reduced ? Number.MAX_SAFE_INTEGER : rawProved;

  const current = index >= 0 && index < STATES.length ? STATES[index] : null;
  const conditions = current ? txs(current.conditions, lang) : [];

  return (
    <div ref={rootRef} className="border-y border-rule-strong bg-panel-deep">
      {/* Title strip. Every panel has one, and it says what you are looking at. */}
      <div className="mx-auto flex max-w-[88rem] flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule px-4 py-2 sm:px-6 lg:px-10">
        <h2 className="plate text-[10px] text-bone-dim">{tx(HERO.panelTitle, lang)}</h2>
        <div className="ml-auto flex items-center gap-3">
          <StatusReadout mode={mode} lang={lang} />
          <button
            type="button"
            onClick={replay}
            className="plate rounded-sm border border-rule bg-panel-inset px-2.5 py-1 text-[10px] text-bone-dim transition-colors duration-150 hover:border-rule-strong hover:text-bone"
          >
            {tx(mode === "done" || mode === "idle" ? HERO.callRoute : HERO.reset, lang)}
          </button>
        </div>
      </div>

      {/* The line. */}
      <div className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6 lg:px-10">
        <ol className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
          {STATES.map((state, i) => {
            const passed = i < index;
            const active = i === index;
            const aspect =
              passed || mode === "done"
                ? "clear"
                : active && mode === "held"
                  ? "danger"
                  : active && (mode === "proving" || mode === "handover")
                    ? "caution"
                    : active && mode === "cleared"
                      ? "clear"
                      : "dark";

            return (
              <li key={state.code} className="relative pt-5">
                {state.beyondAuthority ? <BoundaryMarker lang={lang} /> : null}

                {/* Track. The rail is engraved; occupancy fills it solid. */}
                <div className="relative h-6">
                  <span
                    aria-hidden
                    className={clsx(
                      "absolute left-0 right-0 top-3 h-[2px] -translate-y-1/2",
                      state.beyondAuthority ? "opacity-70" : "",
                    )}
                    style={
                      state.beyondAuthority
                        ? {
                            backgroundImage:
                              "repeating-linear-gradient(90deg, var(--rule-strong) 0 5px, transparent 5px 10px)",
                          }
                        : { backgroundColor: "var(--rule)" }
                    }
                  />
                  <span
                    aria-hidden
                    className="absolute left-0 top-3 h-[2px] -translate-y-1/2 origin-left transition-transform duration-[420ms]"
                    style={{
                      right: 0,
                      backgroundColor: passed || mode === "done" ? "var(--lamp-green)" : "var(--lamp-amber)",
                      boxShadow:
                        passed || mode === "done"
                          ? "0 0 8px 0 var(--halo-green)"
                          : "0 0 8px 0 var(--halo-amber)",
                      transform: `scaleX(${passed || mode === "done" ? 1 : active && mode !== "held" ? 0.55 : 0})`,
                    }}
                  />
                  <span className="absolute left-0 top-3 -translate-x-[1px] -translate-y-1/2">
                    <Signal aspect={aspect} size="md" />
                  </span>
                </div>

                <div className="mt-2 pl-1">
                  <div className="plate data text-[9px] leading-none text-bone-faint">
                    {state.post}
                  </div>
                  <div
                    className={clsx(
                      "plate mt-1.5 text-[10px] leading-tight transition-colors duration-300",
                      passed || mode === "done" || active ? "text-bone" : "text-bone-dim",
                    )}
                  >
                    {state.code}
                  </div>
                  {/*
                    Who holds authority in this block. The state name would just
                    repeat the code in English, and a label that says nothing is
                    worse than no label.
                  */}
                  <div className="mt-1 text-[12px] leading-snug text-bone-faint">
                    {tx(state.role, lang)}
                  </div>
                </div>
              </li>
            );
          })}

          {/* End of line. A scheme plan says where the sheet stops. */}
          <li aria-hidden className="relative hidden pt-5 lg:block">
            <div className="relative h-6">
              <span
                className="absolute left-0 right-auto top-3 h-4 w-[2px] -translate-y-1/2"
                style={{ backgroundColor: "var(--rule-strong)" }}
              />
            </div>
            <div className="mt-2 pl-1">
              <div className="plate data text-[9px] leading-none text-bone-faint">
                {lang === "zh" ? "线路终点" : "END OF LINE"}
              </div>
            </div>
          </li>
        </ol>
      </div>

      {/* Condition readout. What the interlocking is checking, right now. */}
      <div className="border-t border-rule bg-panel-inset">
        <div className="mx-auto max-w-[88rem] px-4 py-4 sm:px-6 lg:px-10">
          <div className="min-h-[5.5rem]">
            {current ? (
              <>
                <p className="plate text-[10px] text-bone-faint">
                  {current.post} · {current.code}
                </p>
                <ul className="mt-2 grid gap-x-8 gap-y-1 sm:grid-cols-2">
                  {conditions.map((c, ci) => {
                    const done = ci < proved;
                    return (
                      <li
                        key={c}
                        className={clsx(
                          "flex items-start gap-2 text-[12px] leading-snug transition-colors duration-200",
                          done ? "text-bone" : "text-bone-faint",
                        )}
                      >
                        <Signal
                          aspect={done ? (mode === "held" ? "danger" : "clear") : "dark"}
                          size="xs"
                          className="mt-[5px]"
                        />
                        <span>{c}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="text-[12px] leading-relaxed text-bone-faint">
                {tx(HERO.legend, lang)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusReadout({ mode, lang }: { mode: Mode; lang: Lang }) {
  const map: Record<Mode, { text: string; aspect: "danger" | "caution" | "clear" | "dark" }> = {
    idle: { text: tx(HERO.reset, lang), aspect: "dark" },
    proving: { text: tx(HERO.proving, lang), aspect: "caution" },
    held: { text: tx(HERO.held, lang), aspect: "danger" },
    handover: { text: tx(HERO.handover, lang), aspect: "caution" },
    cleared: { text: tx(HERO.proved, lang), aspect: "clear" },
    done: { text: tx(HERO.proved, lang), aspect: "clear" },
  };
  const s = map[mode];
  return (
    <p aria-live="polite" className="flex items-center gap-2">
      <Signal aspect={s.aspect} size="sm" />
      <span className="plate text-[10px] text-bone-dim">{s.text}</span>
    </p>
  );
}

function BoundaryMarker({ lang }: { lang: Lang }) {
  return (
    <span className="pointer-events-none absolute -left-2 top-0 z-10 flex flex-col items-start">
      <span className="plate whitespace-nowrap text-[9px] leading-none text-fg-red">
        {tx(HERO.boundaryShort, lang)}
      </span>
      <span
        aria-hidden
        className="mt-1 h-9 w-[3px]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, var(--lamp-red) 0 4px, transparent 4px 8px)",
        }}
      />
      <span className="sr-only">{tx(HERO.boundary, lang)}</span>
    </span>
  );
}
