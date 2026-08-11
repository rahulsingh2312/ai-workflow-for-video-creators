"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { LucideIcon } from "lucide-react";
import { Check, Copy, Loader2 } from "lucide-react";
import { clsx } from "@/lib/clsx";

/*
  Components in Frappe UI's grammar: small radii, hairline outlines, a solid
  near-black primary, subtle gray for everything else, and a compact scale
  where 13px is a normal label rather than fine print.
*/

export type Tone = "gray" | "green" | "red" | "amber" | "blue";

const TONE: Record<Tone, { ink: string; surface: string; outline: string }> = {
  gray: {
    ink: "var(--ink-gray-7)",
    surface: "var(--surface-gray-2)",
    outline: "var(--outline-gray-1)",
  },
  green: {
    ink: "var(--ink-green-3)",
    surface: "var(--surface-green-2)",
    outline: "var(--outline-green-1)",
  },
  red: {
    ink: "var(--ink-red-4)",
    surface: "var(--surface-red-2)",
    outline: "var(--outline-red-1)",
  },
  amber: {
    ink: "var(--ink-amber-3)",
    surface: "var(--surface-amber-2)",
    outline: "var(--outline-amber-1)",
  },
  blue: {
    ink: "var(--ink-blue-3)",
    surface: "var(--surface-blue-2)",
    outline: "var(--outline-blue-1)",
  },
};

/* ── Button ──────────────────────────────────────────────────────────────── */

export type ButtonVariant = "solid" | "subtle" | "outline" | "ghost" | "danger";

const SIZE = {
  sm: "h-7 px-2 gap-1.5 t-xs rounded-[var(--r-sm)]",
  md: "h-8 px-2.5 gap-1.5 t-sm rounded-[var(--r-sm)]",
  lg: "h-10 px-4 gap-2 t-base rounded-[var(--r)]",
} as const;

export function Button({
  children,
  onClick,
  variant = "subtle",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  disabled,
  loading,
  type = "button",
  title,
  ariaLabel,
  full,
  className,
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: keyof typeof SIZE;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
  title?: string;
  /** Required on an icon-only button: the glyph itself is aria-hidden. */
  ariaLabel?: string;
  full?: boolean;
  className?: string;
}) {
  const styles: React.CSSProperties =
    variant === "solid"
      ? { background: "var(--surface-gray-7)", color: "var(--ink-white)" }
      : variant === "outline"
        ? {
            background: "var(--surface-white)",
            color: "var(--ink-gray-8)",
            boxShadow: "0 0 0 1px var(--outline-gray-2)",
          }
        : variant === "ghost"
          ? { background: "transparent", color: "var(--ink-gray-7)" }
          : variant === "danger"
            ? { background: "var(--surface-red-2)", color: "var(--ink-red-4)" }
            : {
                background: "var(--surface-gray-2)",
                color: "var(--ink-gray-8)",
              };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      aria-label={ariaLabel}
      style={styles}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium",
        "[transition:background-color_150ms_var(--e-out),box-shadow_150ms_var(--e-out),opacity_150ms_var(--e-out),transform_120ms_var(--e-out)]",
        "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
        SIZE[size],
        full && "w-full",
        "hov:brightness-[0.96]",
        variant === "ghost" && "hov:bg-[var(--surface-gray-2)]",
        className,
      )}
    >
      {loading ? (
        <Loader2
          className={
            size === "lg" ? "h-4 w-4 animate-spin" : "h-3.5 w-3.5 animate-spin"
          }
          aria-hidden
        />
      ) : Icon ? (
        <Icon
          className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"}
          aria-hidden
        />
      ) : null}
      {children}
      {IconRight ? (
        <IconRight
          className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"}
          aria-hidden
        />
      ) : null}
    </button>
  );
}

/* ── Badge ───────────────────────────────────────────────────────────────── */

export function Badge({
  children,
  tone = "gray",
  icon: Icon,
}: {
  children: React.ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
}) {
  const c = TONE[tone];
  return (
    <span
      style={{ background: c.surface, color: c.ink }}
      className="t-xs inline-flex items-center gap-1 whitespace-nowrap rounded-[var(--r-sm)] px-1.5 py-0.5 font-medium"
    >
      {Icon ? <Icon className="h-3 w-3" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function Dot({ tone = "gray" }: { tone?: Tone }) {
  return (
    <span
      aria-hidden
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: TONE[tone].ink }}
    />
  );
}

/* ── Surfaces ────────────────────────────────────────────────────────────── */

export function Card({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      style={{
        background: "var(--surface-white)",
        boxShadow: "0 0 0 1px var(--outline-gray-1)",
      }}
      className={clsx("min-w-0 overflow-hidden rounded-[var(--r)]", className)}
    >
      <div className={padded ? "p-4" : undefined}>{children}</div>
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <h3
          className="t-base font-medium"
          style={{ color: "var(--ink-gray-9)" }}
        >
          {title}
        </h3>
        {subtitle ? (
          <p
            className="t-xs mt-1 leading-normal"
            style={{ color: "var(--ink-gray-5)" }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** The bar across the top of every page: where you are on the left, what you can do on the right. */
export function PageHeader({
  breadcrumb,
  actions,
}: {
  breadcrumb: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header
      className="sticky top-0 z-10 flex h-[52px] items-center gap-3 px-4 sm:px-5"
      style={{
        background: "var(--surface-white)",
        borderBottom: "1px solid var(--outline-gray-1)",
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {breadcrumb}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

/* ── List rows ───────────────────────────────────────────────────────────── */

export function ListRow({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const inner = (
    <div
      className={clsx(
        "flex w-full items-center gap-3 px-4 py-2.5 text-left",
        onClick &&
          "[transition:background-color_120ms_var(--e-out)] hov:bg-[var(--surface-gray-1)]",
        className,
      )}
      style={{ borderBottom: "1px solid var(--outline-gray-1)" }}
    >
      {children}
    </div>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="block w-full">
      {inner}
    </button>
  ) : (
    inner
  );
}

/** A requirement: done or not, and what the system actually found. */
export function CheckRow({
  done,
  children,
  detail,
}: {
  done: boolean;
  children: React.ReactNode;
  detail?: string;
}) {
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      {/*
        A condition that has not been met yet is outstanding, not failed. This
        used to fill unmet rows with the red surface, so a task at the start of
        its checklist showed a column of red discs and read as broken. Unmet is
        now an empty ring; only the met ones take a colour, because those are
        the ones carrying a result.
      */}
      <span
        className="mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
        style={{
          background: done ? "var(--surface-green-2)" : "transparent",
          boxShadow: done ? "none" : "inset 0 0 0 1.5px var(--outline-gray-3)",
          color: done ? "var(--ink-green-3)" : "transparent",
        }}
      >
        {done ? (
          <Check className="h-2.5 w-2.5" strokeWidth={3.5} aria-hidden />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="t-sm block leading-normal"
          style={{ color: done ? "var(--ink-gray-6)" : "var(--ink-gray-8)" }}
        >
          {children}
        </span>
        {detail ? (
          <span
            className="t-xs mt-0.5 block"
            style={{ color: "var(--ink-gray-4)" }}
          >
            {detail}
          </span>
        ) : null}
      </span>
    </li>
  );
}

/* ── Form controls ───────────────────────────────────────────────────────── */

/*
  A label with no `htmlFor` names nothing. Most call sites pass no id, so the
  field mints one and hands it down through context: the control picks it up
  automatically, an explicitly-passed id still wins, and the hint and error
  become the control's description rather than loose text near it.
*/
const FieldCtx = createContext<{ id: string; describedBy?: string } | null>(
  null,
);

export function Field({
  label,
  hint,
  error,
  children,
  id,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  id?: string;
}) {
  const auto = useId();
  const forId = id ?? auto;
  const hintId = hint ? `${auto}-hint` : undefined;
  const errId = error ? `${auto}-error` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label
        htmlFor={forId}
        className="t-xs block font-medium"
        style={{ color: "var(--ink-gray-6)" }}
      >
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="t-xs mt-0.5" style={{ color: "var(--ink-gray-4)" }}>
          {hint}
        </p>
      ) : null}
      <div className="mt-1.5">
        <FieldCtx.Provider value={{ id: forId, describedBy }}>
          {children}
        </FieldCtx.Provider>
      </div>
      {error ? (
        <p
          id={errId}
          role="alert"
          className="t-xs mt-1"
          style={{ color: "var(--ink-red-4)" }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

/*
  Frappe inputs sit on a filled gray field with no visible border until you
  focus them, which keeps a dense form from turning into a grid of boxes.
*/
const controlClass =
  "w-full rounded-[var(--r-sm)] px-2 t-sm outline-none " +
  "[transition:background-color_120ms_var(--e-out),box-shadow_120ms_var(--e-out)] " +
  "focus:bg-[var(--surface-white)] focus:shadow-[0_0_0_1px_var(--outline-gray-3)]";

const controlStyle: React.CSSProperties = {
  background: "var(--surface-gray-2)",
  color: "var(--ink-gray-8)",
};

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const f = useContext(FieldCtx);
  return (
    <input
      {...props}
      id={props.id ?? f?.id}
      aria-describedby={props["aria-describedby"] ?? f?.describedBy}
      style={{ ...controlStyle, ...props.style }}
      className={clsx("h-8", controlClass, props.className)}
    />
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const f = useContext(FieldCtx);
  return (
    <textarea
      {...props}
      id={props.id ?? f?.id}
      aria-describedby={props["aria-describedby"] ?? f?.describedBy}
      style={{ ...controlStyle, ...props.style }}
      className={clsx("py-2 leading-normal", controlClass, props.className)}
    />
  );
}

/* ── States ──────────────────────────────────────────────────────────────── */

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <Icon
        className="h-9 w-9"
        strokeWidth={1.25}
        style={{ color: "var(--ink-gray-3)" }}
        aria-hidden
      />
      <p className="t-base mt-4" style={{ color: "var(--ink-gray-6)" }}>
        {title}
      </p>
      {body ? (
        <p
          className="t-sm mt-1.5 max-w-[44ch] leading-normal"
          style={{ color: "var(--ink-gray-4)" }}
        >
          {body}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Meta({ children }: { children: React.ReactNode }) {
  return (
    <span className="t-xs" style={{ color: "var(--ink-gray-4)" }}>
      {children}
    </span>
  );
}

export function Divider() {
  return (
    <div
      className="my-3 h-px w-full"
      style={{ background: "var(--outline-gray-1)" }}
    />
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="t-xs mb-1.5 font-medium"
      style={{ color: "var(--ink-gray-5)" }}
    >
      {children}
    </p>
  );
}

/** Title block at the top of a page body. Compact, like the rest of the desk. */
export function PageHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="t-xl" style={{ color: "var(--ink-gray-9)" }}>
          {title}
        </h1>
        {subtitle ? (
          <p
            className="t-sm mt-1 max-w-[70ch] leading-normal"
            style={{ color: "var(--ink-gray-5)" }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ── Copy ────────────────────────────────────────────────────────────────── */

/**
 * Copy to clipboard.
 *
 * The publish screen exists to hand words to a person who will paste them into
 * someone else's app, so this is the most-used control on it. Three details
 * make it feel like it worked:
 *
 * - The label swaps to a confirmation and back after 1.6s, so the feedback is
 *   in the control the finger is already on rather than in a toast across the
 *   screen.
 * - The swap is masked with a short blur. Two labels crossfading in the same
 *   box read as two objects sliding past each other; the blur bridges them so
 *   it reads as one thing changing its mind.
 * - The timer is cleared on unmount, because a state update after the button
 *   is gone is a warning in the console and a bug waiting for a slower device.
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  className,
}: {
  value: string;
  label: string;
  copiedLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* Clipboard is permission-gated and can simply say no. Falling back to a
         selection keeps the text reachable instead of failing silently. */
      const el = document.createElement("textarea");
      el.value = value;
      el.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand("copy");
      } catch {
        /* nothing left to try */
      }
      el.remove();
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }, [value]);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className={clsx(
        "press inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[var(--r-sm)] px-2 text-[12.5px] font-medium",
        "[transition:background-color_140ms_var(--e-out),color_140ms_var(--e-out)]",
        "hov:bg-[var(--surface-gray-3)]",
        className,
      )}
      style={{ color: copied ? "var(--ink-green-3)" : "var(--ink-gray-6)" }}
    >
      <span
        className="relative flex size-3.5 shrink-0 items-center justify-center"
        aria-hidden
      >
        <Copy
          className={clsx(
            "absolute size-3.5 [transition:opacity_180ms_var(--e-out),filter_180ms_var(--e-out)]",
            copied ? "opacity-0 blur-[2px]" : "opacity-100 blur-0",
          )}
          strokeWidth={1.75}
        />
        <Check
          className={clsx(
            "absolute size-3.5 [transition:opacity_180ms_var(--e-out),filter_180ms_var(--e-out)]",
            copied ? "opacity-100 blur-0" : "opacity-0 blur-[2px]",
          )}
          strokeWidth={2.25}
        />
      </span>
      <span
        className={clsx(
          "[transition:filter_180ms_var(--e-out)]",
          copied ? "blur-0" : "blur-0",
        )}
      >
        {copied ? copiedLabel : label}
      </span>
    </button>
  );
}
