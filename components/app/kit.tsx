"use client";

import type { LucideIcon } from "lucide-react";
import { Check, Loader2 } from "lucide-react";
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
      style={styles}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium",
        "[transition:background-color_150ms_var(--e-out),box-shadow_150ms_var(--e-out),opacity_150ms_var(--e-out),transform_120ms_var(--e-out)]",
        "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
        SIZE[size],
        full && "w-full",
        "[@media(hover:hover)and(pointer:fine)]:hover:brightness-[0.96]",
        variant === "ghost" &&
          "[@media(hover:hover)and(pointer:fine)]:hover:bg-[var(--surface-gray-2)]",
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
          "[transition:background-color_120ms_var(--e-out)] [@media(hover:hover)and(pointer:fine)]:hover:bg-[var(--surface-gray-1)]",
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
      <span
        className="mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
        style={{
          background: done ? "var(--surface-green-2)" : "var(--surface-red-2)",
          color: done ? "var(--ink-green-3)" : "var(--ink-red-4)",
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
  return (
    <div>
      <label
        htmlFor={id}
        className="t-xs block font-medium"
        style={{ color: "var(--ink-gray-6)" }}
      >
        {label}
      </label>
      {hint ? (
        <p className="t-xs mt-0.5" style={{ color: "var(--ink-gray-4)" }}>
          {hint}
        </p>
      ) : null}
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="t-xs mt-1" style={{ color: "var(--ink-red-4)" }}>
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
  return (
    <input
      {...props}
      style={{ ...controlStyle, ...props.style }}
      className={clsx("h-8", controlClass, props.className)}
    />
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
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
