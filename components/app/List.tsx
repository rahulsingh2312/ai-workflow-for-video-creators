"use client";

import type { LucideIcon } from "lucide-react";
import {
  Circle,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  SignalHigh,
  SignalLow,
  SignalMedium,
} from "lucide-react";
import { clsx } from "@/lib/clsx";

/*
  Frappe's List, rebuilt.

  The whole thing is one CSS grid per row. Every trailing track is a fixed
  width so the title track (minmax(0,1fr)) is the only flexible one: it absorbs
  all the size difference, and every other column lands at the same x on every
  row. That single decision is what makes the list look machined rather than
  assembled.
*/

export function List({
  columns,
  children,
  className,
}: {
  columns: string[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx("list", className)}
      style={{ ["--cols" as string]: columns.join(" ") }}
    >
      {children}
    </div>
  );
}

export function ListRow({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick()
          : undefined
      }
      className={clsx("list-row h-10", onClick && "cursor-pointer", className)}
    >
      {children}
    </div>
  );
}

export function ListCell({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex min-w-0 items-center", className)}>
      {children}
    </div>
  );
}

/** Group heading: filled, rounded, count beside the name, hint on hover. */
export function ListGroupHeader({
  label,
  count,
  open,
  onToggle,
  lang,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  lang: "en" | "zh";
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="group flex w-full items-baseline rounded-[var(--r-sm)] px-2.5 py-2 text-left [transition:background-color_140ms_var(--e-out)]"
      style={{ background: "var(--rail)" }}
    >
      <span
        className="text-[14px] font-medium"
        style={{ color: "var(--ink-gray-8)" }}
      >
        {label}
      </span>
      <span
        className="ml-2 text-[13px] tabular-nums"
        style={{ color: "var(--ink-gray-5)" }}
      >
        {count}
      </span>
      <span
        className="ml-auto hidden text-[13px] group-hover:inline"
        style={{ color: "var(--ink-gray-5)" }}
      >
        {open
          ? lang === "zh"
            ? "收起"
            : "Collapse"
          : lang === "zh"
            ? "展开"
            : "Expand"}
      </span>
    </button>
  );
}

/* ── Badges ──────────────────────────────────────────────────────────────── */

export const DOT: Record<string, string> = {
  red: "var(--surface-red-6)",
  blue: "var(--surface-blue-6)",
  green: "var(--surface-green-6)",
  amber: "var(--surface-amber-6)",
  violet: "var(--surface-violet-6)",
  gray: "var(--surface-gray-6)",
};

/**
 * Outline badge. The column stays quiet because the fill is nothing and the
 * outline is grey; the only colour in it is a 6px dot, which is enough to make
 * a label recognisable at a glance without turning the row into a paint chart.
 */
export function Tag({ label, dot }: { label: string; dot?: string }) {
  return (
    <span
      title={label}
      /*
        Two rules keep a long label from being guillotined by its column.

        The label span carries its own `min-w-0`, because a flex child's default
        min-width is `auto`: without it the span refuses to shrink below its
        content, `text-overflow` never gets a chance to fire, and the ellipsis
        never appears.

        And the tag itself shrinks rather than holding its width. The tags cell
        is a fixed grid track with `overflow: hidden`, so a rigid tag that does
        not fit simply loses its right edge — border, ellipsis and all. Letting
        it shrink moves the truncation inside the tag, where it reads as a
        decision instead of a clipping bug.
      */
      className="inline-flex min-w-0 max-w-[9rem] shrink items-center gap-1.5 whitespace-nowrap rounded-[var(--r-sm)] px-1.5 py-0.5 text-[12px]"
      style={{
        boxShadow: "inset 0 0 0 1px var(--outline-gray-2)",
        color: "var(--ink-gray-7)",
      }}
    >
      {dot ? (
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: dot }}
        />
      ) : null}
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

/** Solid badge, for a status that should read at a glance. */
export function StatusBadge({
  label,
  theme,
}: {
  label: string;
  theme: "red" | "blue" | "green" | "amber" | "gray";
}) {
  const fill: Record<string, [string, string]> = {
    red: ["var(--surface-red-2)", "var(--ink-red-4)"],
    blue: ["var(--surface-blue-2)", "var(--ink-blue-3)"],
    green: ["var(--surface-green-2)", "var(--ink-green-3)"],
    amber: ["var(--surface-amber-2)", "var(--ink-amber-3)"],
    gray: ["var(--surface-gray-2)", "var(--ink-gray-6)"],
  };
  const [bg, fg] = fill[theme];
  return (
    <span
      className="inline-flex shrink-0 items-center whitespace-nowrap rounded-[var(--r-sm)] px-1.5 py-0.5 text-[12px] font-medium"
      style={{ background: bg, color: fg }}
    >
      {label}
    </span>
  );
}

/* ── Row glyphs ──────────────────────────────────────────────────────────── */

/** Status as a circle that fills as work progresses, the way Linear draws it. */
export const STATUS_ICON: Record<string, LucideIcon> = {
  backlog: CircleDashed,
  todo: Circle,
  doing: CircleDot,
  done: CircleCheck,
  cancelled: CircleX,
};

export function StatusGlyph({ kind }: { kind: keyof typeof STATUS_ICON }) {
  const Icon = STATUS_ICON[kind] ?? Circle;
  return (
    <Icon
      className="size-4 shrink-0"
      strokeWidth={1.75}
      style={{ color: "var(--ink-gray-6)" }}
      aria-hidden
    />
  );
}

/**
 * Priority. More bars means higher, so the glyph already carries the meaning;
 * colour only reinforces it, and low priority stays grey so those rows recede.
 */
const PRIORITY: Record<string, { icon: LucideIcon; color: string }> = {
  high: { icon: SignalHigh, color: "var(--ink-red-3)" },
  medium: { icon: SignalMedium, color: "var(--ink-amber-2)" },
  low: { icon: SignalLow, color: "var(--ink-gray-5)" },
};

export function Priority({
  level,
  label,
}: {
  level: "high" | "medium" | "low";
  label: string;
}) {
  const p = PRIORITY[level];
  return (
    <span
      className="flex items-center whitespace-nowrap text-[13px]"
      style={{ color: "var(--ink-gray-5)" }}
    >
      <p.icon
        className="mr-1 size-4 shrink-0"
        strokeWidth={2}
        style={{ color: p.color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

export function CellIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <Icon
      className="mr-1.5 size-3.5 shrink-0"
      strokeWidth={1.75}
      style={{ color: "var(--ink-gray-4)" }}
      aria-hidden
    />
  );
}

/** Initials avatar. Stacks with -space-x-1 when several sit together. */
export function Avatar({
  name,
  size = "sm",
}: {
  name: string;
  size?: "xs" | "sm";
}) {
  const px = size === "xs" ? "h-4 w-4 text-[9px]" : "h-5 w-5 text-[10px]";
  return (
    <span
      title={name}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium ring-2",
        px,
      )}
      style={{
        background: "var(--surface-gray-3)",
        color: "var(--ink-gray-6)",
        // The ring is the page colour, so stacked avatars cut into each other.
        ["--tw-ring-color" as string]: "var(--surface-white)",
      }}
    >
      {name.slice(0, 2)}
    </span>
  );
}
