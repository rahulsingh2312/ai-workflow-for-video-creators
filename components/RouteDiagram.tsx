"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { RotateCcw } from "lucide-react";
import { STATES } from "@/content/states";
import { HERO } from "@/content/copy";
import { tx, txs, type L, type Lang } from "@/lib/i18n";
import { clsx } from "@/lib/clsx";
import { Signal, type Aspect } from "@/components/Signal";

/*
  THE LINE.

  Eleven states, drawn as one run instead of a grid of eleven boxes. The run
  is the point: you can see at a glance that there is no way to enter it
  halfway, and you can see exactly where it stops belonging to the product.

  What moves is a single task walking the run, proving its conditions one at a
  time. It holds where real tasks hold, and it stops at the boundary, because
  an animation that sails through the one place the product refuses to go
  would be arguing against the page it sits on.
*/

type Mode = "idle" | "proving" | "held" | "handover" | "cleared" | "done";

/** FACT_REVIEW. Where most tasks actually sit, so it is where the run stalls. */
const HOLD_AT = 4;
/** PUBLISHED_MANUALLY. Past the boundary: a person does this, not the product. */
const BOUNDARY_AT = 9;

const PROVE_TICK = 140;
const CLEAR_MS = 110;
const HOLD_MS = 1600;
const HANDOVER_MS = 1500;

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
    // run is shown already cleared rather than cascading into that position.
    if (!started || reduced) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(setTimeout(resolve, ms));
      });

    (async () => {
      setIndex(-1);
      setMode("idle");
      setProved(0);
      await sleep(500);

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

  /* With motion reduced the run is simply shown as already walked. */
  const index = reduced ? STATES.length : rawIndex;
  const mode: Mode = reduced ? "done" : rawMode;
  const proved = reduced ? Number.MAX_SAFE_INTEGER : rawProved;

  const current = index >= 0 && index < STATES.length ? STATES[index] : null;
  const conditions = current ? txs(current.conditions, lang) : [];
  const status = STATUS[mode];

  return (
    <div ref={rootRef} className="rounded-xl border border-rule bg-panel-deep">
      {/* ── Readout: what the run is doing, right now ─────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule px-5 py-3.5 sm:px-6">
        <p aria-live="polite" className="flex min-w-0 items-center gap-2.5">
          <Signal aspect={status.aspect} size="sm" />
          <span className="truncate text-[13.5px] text-bone">
            {tx(status.label, lang)}
          </span>
          {current ? (
            <span className="mono hidden truncate text-[12px] text-bone-faint sm:inline">
              {current.post} · {current.code}
            </span>
          ) : null}
        </p>

        <button
          type="button"
          onClick={replay}
          className={clsx(
            "press ml-auto flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-bone-dim",
            "[transition:background-color_160ms_var(--ease-out),color_160ms_var(--ease-out)]",
            "hov:bg-panel-raised",
            "hov:text-bone",
          )}
        >
          <RotateCcw
            className="size-3.5 shrink-0"
            strokeWidth={1.75}
            aria-hidden
          />
          {tx(
            mode === "done" || mode === "idle" ? HERO.callRoute : HERO.reset,
            lang,
          )}
        </button>
      </div>

      {/* ── The run ───────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto px-5 py-9 sm:px-6 sm:py-11 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ol className="flex min-w-[46rem] items-start">
          {STATES.map((state, i) => {
            const passed = i < index || mode === "done";
            const active = i === index;
            const aspect: Aspect = passed
              ? "clear"
              : active && mode === "held"
                ? "danger"
                : active && (mode === "proving" || mode === "handover")
                  ? "caution"
                  : active && mode === "cleared"
                    ? "clear"
                    : "dark";

            return (
              <li
                key={state.code}
                className="relative flex flex-1 flex-col items-center"
              >
                {/*
                  The rail sits behind the marks and is drawn in two halves per
                  node, so the walked portion of the line ends exactly at the
                  mark that has been reached rather than at a node boundary.

                  The segment that crosses the boundary is the one arriving at
                  the state the product has no authority over, so the dash goes
                  on that node's left half, not its right.
                */}
                {i > 0 ? (
                  <Rail
                    filled={passed || active}
                    side="left"
                    dashed={state.beyondAuthority}
                  />
                ) : null}
                {i < STATES.length - 1 ? (
                  <Rail filled={passed} side="right" />
                ) : null}

                {state.beyondAuthority ? <Boundary lang={lang} /> : null}

                <span
                  className={clsx(
                    "relative z-10 flex size-6 items-center justify-center rounded-full bg-panel-deep",
                    "[transition:transform_260ms_var(--ease-out)]",
                    active && "scale-110",
                  )}
                >
                  <Signal aspect={aspect} size={active ? "md" : "sm"} />
                </span>

                <span
                  className={clsx(
                    "mono mt-3 text-[11px] leading-none text-bone-faint",
                  )}
                >
                  {state.post}
                </span>
                {/* A fixed two-line box, so one long name does not push the
                    row beneath it out of alignment with its neighbours. */}
                <span
                  className={clsx(
                    "mt-2 flex h-[2.6em] items-start px-1 text-center text-[11.5px] leading-tight",
                    "[transition:color_300ms_var(--ease-out)]",
                    active
                      ? "font-medium text-bone"
                      : passed
                        ? "text-bone-dim"
                        : "text-bone-faint",
                  )}
                >
                  {tx(state.name, lang)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── What the run is proving right now ─────────────────────────────── */}
      <div className="border-t border-rule px-5 py-5 sm:px-6">
        <div className="min-h-[4.5rem]">
          {current ? (
            <ul className="grid gap-x-10 gap-y-1.5 sm:grid-cols-2">
              {conditions.map((c, ci) => {
                const done = ci < proved;
                return (
                  <li
                    key={c}
                    className={clsx(
                      "flex items-start gap-2.5 text-[13px] leading-relaxed [transition:color_260ms_var(--ease-out)]",
                      done ? "text-bone-dim" : "text-bone-faint",
                    )}
                  >
                    <span className="flex h-[1.6em] shrink-0 items-center">
                      <Signal
                        aspect={
                          done ? (mode === "held" ? "danger" : "clear") : "dark"
                        }
                        size="xs"
                      />
                    </span>
                    <span>{c}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="lede max-w-[64ch] text-[15px] text-bone-faint">
              {tx(HERO.legend, lang)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Half a rail segment, drawn behind the marks. */
function Rail({
  filled,
  side,
  dashed,
}: {
  filled: boolean;
  side: "left" | "right";
  dashed?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={clsx(
        "absolute top-3 h-px -translate-y-1/2",
        side === "left" ? "left-0 right-1/2" : "left-1/2 right-0",
      )}
      style={{
        background: dashed
          ? "repeating-linear-gradient(90deg, var(--rule-strong) 0 3px, transparent 3px 7px)"
          : filled
            ? "var(--lamp-green)"
            : "var(--rule)",
        opacity: dashed ? 0.8 : 1,
        transition: "background-color 420ms var(--ease-out)",
      }}
    />
  );
}

/**
 * The boundary. A rule the run does not cross on its own authority, marked
 * where it actually falls rather than described in a caption somewhere else.
 */
function Boundary({ lang }: { lang: Lang }) {
  return (
    <span className="pointer-events-none absolute -top-6 left-0 z-20 flex -translate-x-1/2 flex-col items-center">
      <span className="plate whitespace-nowrap text-[9.5px] leading-none text-fg-red">
        {tx(HERO.boundaryShort, lang)}
      </span>
      <span
        aria-hidden
        className="mt-1.5 h-12 w-px"
        style={{
          background:
            "repeating-linear-gradient(180deg, var(--lamp-red) 0 3px, transparent 3px 7px)",
        }}
      />
      <span className="sr-only">{tx(HERO.boundary, lang)}</span>
    </span>
  );
}

const STATUS: Record<Mode, { label: L; aspect: Aspect }> = {
  idle: { label: HERO.reset, aspect: "dark" },
  proving: { label: HERO.proving, aspect: "caution" },
  held: { label: HERO.held, aspect: "danger" },
  handover: { label: HERO.handover, aspect: "caution" },
  cleared: { label: HERO.proved, aspect: "clear" },
  done: { label: HERO.proved, aspect: "clear" },
};
