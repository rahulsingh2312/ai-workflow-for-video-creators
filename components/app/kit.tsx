"use client";

import type { LucideIcon } from "lucide-react";
import { Check, Loader2 } from "lucide-react";
import { clsx } from "@/lib/clsx";

export type Tone = "ok" | "warn" | "bad" | "neutral";

const TONE_VARS: Record<Tone, { fg: string; bg: string; line: string }> = {
  ok: { fg: "var(--ok)", bg: "var(--ok-bg)", line: "var(--ok-line)" },
  warn: { fg: "var(--warn)", bg: "var(--warn-bg)", line: "var(--warn-line)" },
  bad: { fg: "var(--bad)", bg: "var(--bad-bg)", line: "var(--bad-line)" },
  neutral: { fg: "var(--ink-2)", bg: "var(--surface-2)", line: "var(--line)" },
};

/* ── Buttons ─────────────────────────────────────────────────────────────── */

export function Button({
  children,
  onClick,
  variant = "secondary",
  size = "md",
  icon: Icon,
  disabled,
  loading,
  type = "button",
  title,
  full,
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
  title?: string;
  full?: boolean;
}) {
  /*
    Named properties only: `all` would animate layout too. 160ms is the press
    window where feedback still reads as instant, and 0.97 is enough scale to
    feel the interface heard you without looking like a bounce.
  */
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium " +
    "[transition:transform_160ms_var(--e-out),background-color_160ms_var(--e-out),box-shadow_160ms_var(--e-out),opacity_160ms_var(--e-out)] " +
    "active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100";
  const sizes = {
    sm: "h-8 px-3 text-[13px]",
    md: "h-10 px-4 text-[14px]",
    lg: "h-11 px-5 text-[15px]",
  }[size];

  const styles: React.CSSProperties =
    variant === "primary"
      ? { background: "var(--brand)", color: "var(--brand-ink)", boxShadow: "var(--shadow-1)" }
      : variant === "danger"
        ? { background: "var(--bad-bg)", color: "var(--bad)", border: "1px solid var(--bad-line)" }
        : variant === "ghost"
          ? { background: "transparent", color: "var(--ink-2)" }
          : { background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--line-strong)", boxShadow: "var(--shadow-1)" };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      style={styles}
      className={clsx(
        base,
        sizes,
        full && "w-full",
        variant === "secondary" && "[@media(hover:hover)and(pointer:fine)]:hover:brightness-[0.97]",
        variant === "ghost" && "[@media(hover:hover)and(pointer:fine)]:hover:bg-[var(--surface-2)] [@media(hover:hover)and(pointer:fine)]:hover:text-[var(--ink)]",
        variant === "primary" && "[@media(hover:hover)and(pointer:fine)]:hover:opacity-90",
        variant === "danger" && "[@media(hover:hover)and(pointer:fine)]:hover:brightness-[0.97]",
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : Icon ? (
        <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
      ) : null}
      {children}
    </button>
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
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-1)",
      }}
      className={clsx("min-w-0 overflow-hidden", className)}
    >
      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon: Icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      {Icon ? (
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: "var(--surface-2)", color: "var(--ink-2)" }}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-0.5 text-[13px] leading-snug" style={{ color: "var(--ink-3)" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ── Status ──────────────────────────────────────────────────────────────── */

export function Badge({
  children,
  tone = "neutral",
  icon: Icon,
  size = "md",
}: {
  children: React.ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
  size?: "sm" | "md";
}) {
  const v = TONE_VARS[tone];
  return (
    <span
      style={{ background: v.bg, color: v.fg, border: `1px solid ${v.line}` }}
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11.5px]" : "px-2.5 py-1 text-[12.5px]",
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function Dot({ tone = "neutral" }: { tone?: Tone }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: TONE_VARS[tone].fg }}
    />
  );
}

/** A requirement, shown the way a person reads one: done or not, and why. */
export function CheckRow({
  done,
  children,
  detail,
  tone = "bad",
}: {
  done: boolean;
  children: React.ReactNode;
  detail?: string;
  tone?: Tone;
}) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span
        className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{
          background: done ? "var(--ok-bg)" : TONE_VARS[tone].bg,
          color: done ? "var(--ok)" : TONE_VARS[tone].fg,
          border: `1px solid ${done ? "var(--ok-line)" : TONE_VARS[tone].line}`,
        }}
      >
        {done ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block text-[14px] leading-snug"
          style={{ color: done ? "var(--ink-2)" : "var(--ink)" }}
        >
          {children}
        </span>
        {detail ? (
          <span className="mt-0.5 block text-[12.5px]" style={{ color: "var(--ink-3)" }}>
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
      <label htmlFor={id} className="block text-[13px] font-medium" style={{ color: "var(--ink)" }}>
        {label}
      </label>
      {hint ? (
        <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--ink-3)" }}>
          {hint}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
      {error ? (
        <p className="mt-1.5 text-[12.5px]" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line-strong)",
  borderRadius: "10px",
  color: "var(--ink)",
};

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...inputStyle, ...props.style }}
      className={clsx("h-10 w-full px-3 text-[14px] outline-none", props.className)}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...inputStyle, ...props.style }}
      className={clsx("w-full px-3 py-2.5 text-[14px] leading-relaxed outline-none", props.className)}
    />
  );
}

/* ── Layout bits ─────────────────────────────────────────────────────────── */

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight" style={{ color: "var(--ink)" }}>
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-[var(--r-lg)] px-6 py-14 text-center"
      style={{ background: "var(--surface-2)", border: "1px dashed var(--line-strong)" }}
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-full"
        style={{ background: "var(--surface)", color: "var(--ink-3)", boxShadow: "var(--shadow-1)" }}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-4 text-[16px] font-semibold" style={{ color: "var(--ink)" }}>
        {title}
      </h3>
      <p className="mt-1.5 max-w-[46ch] text-[13.5px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
        {body}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Meta({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[12.5px]" style={{ color: "var(--ink-3)" }}>
      {children}
    </span>
  );
}

export function Divider() {
  return <div className="my-4 h-px w-full" style={{ background: "var(--line)" }} />;
}
