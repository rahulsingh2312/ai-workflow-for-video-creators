"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronDown, ChevronsUpDown, Plus } from "lucide-react";
import { clsx } from "@/lib/clsx";

/*
  The desk shell.

  Two columns: a quiet rail on the left, content on the right. Rows in the
  content carry no separators; grouping comes from a heading and whitespace,
  and hover is a soft rounded band. Colour appears only in 6px dots.
*/

export function Rail({
  workspace,
  subtitle,
  groups,
  active,
  onSelect,
  footer,
  open,
  onClose,
}: {
  workspace: string;
  subtitle: string;
  groups: {
    label?: string;
    action?: { icon: LucideIcon; title: string; onClick: () => void };
    items: { id: string; label: string; icon: LucideIcon; count?: number }[];
  }[];
  active: string;
  onSelect: (id: string) => void;
  footer?: React.ReactNode;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-40 flex w-[248px] shrink-0 flex-col",
        "[transition:transform_220ms_var(--e-out)]",
        "lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
      style={{ background: "var(--rail)" }}
    >
      {/* Workspace switcher */}
      <button
        type="button"
        className="row mx-2 mt-2 flex items-center gap-2.5 px-2 py-2 text-left"
        onClick={onClose}
      >
        <span
          aria-hidden
          className="h-8 w-8 shrink-0 rounded-[var(--r)]"
          style={{ background: "linear-gradient(140deg, #4aa3df 0%, #2f7fb8 45%, #6fd0c8 100%)" }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold leading-tight" style={{ color: "var(--ink-gray-9)" }}>
            {workspace}
          </span>
          <span className="block truncate text-[12.5px] leading-tight" style={{ color: "var(--ink-gray-4)" }}>
            {subtitle}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0" strokeWidth={1.75} style={{ color: "var(--ink-gray-4)" }} aria-hidden />
      </button>

      <nav aria-label="Sections" className="mt-2 flex-1 overflow-y-auto px-2 pb-3">
        {groups.map((g, gi) => (
          <div key={g.label ?? gi} className={gi ? "mt-5" : ""}>
            {g.label ? (
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[13px]" style={{ color: "var(--ink-gray-4)" }}>
                  {g.label}
                </span>
                {g.action ? (
                  <button
                    type="button"
                    onClick={g.action.onClick}
                    title={g.action.title}
                    aria-label={g.action.title}
                    className="rounded-[var(--r-sm)] p-0.5 [transition:background-color_120ms_var(--e-out)] [@media(hover:hover)and(pointer:fine)]:hover:bg-[var(--row-hover)]"
                  >
                    <g.action.icon className="h-4 w-4" strokeWidth={1.75} style={{ color: "var(--ink-gray-4)" }} />
                  </button>
                ) : null}
              </div>
            ) : null}
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const on = item.id === active;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.id)}
                      aria-current={on ? "page" : undefined}
                      className="row flex w-full items-center gap-2.5 px-2 py-[7px] text-left"
                      data-active={on ? "true" : undefined}
                    >
                      <item.icon
                        className="h-[17px] w-[17px] shrink-0"
                        strokeWidth={1.75}
                        style={{ color: on ? "var(--ink-gray-9)" : "var(--ink-gray-4)" }}
                        aria-hidden
                      />
                      <span
                        className="min-w-0 flex-1 truncate text-[14.5px]"
                        style={{ color: on ? "var(--ink-gray-9)" : "var(--ink-gray-6)" }}
                      >
                        {item.label}
                      </span>
                      {item.count ? (
                        <span className="text-[13px] tabular-nums" style={{ color: "var(--ink-gray-4)" }}>
                          {item.count}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {footer ? <div className="px-2 pb-3">{footer}</div> : null}
    </aside>
  );
}

/** Page title row: name on the left, the one primary action on the right. */
export function DeskHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-6 pt-5">
      <h1 className="min-w-0 flex-1 truncate text-[22px] font-medium tracking-[-0.01em]" style={{ color: "var(--ink-gray-9)" }}>
        {title}
      </h1>
      {action}
    </div>
  );
}

/** Filter strip under the title. Segmented control, then quiet dropdowns. */
export function DeskToolbar({
  segments,
  activeSegment,
  onSegment,
  filters,
  right,
}: {
  segments?: string[];
  activeSegment?: string;
  onSegment?: (s: string) => void;
  filters?: { label: string; onClick?: () => void }[];
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-2 px-6 py-4">
      {segments?.length ? (
        <div className="mr-2 flex items-center rounded-[var(--r)] p-[3px]" style={{ background: "var(--row-hover)" }}>
          {segments.map((s) => {
            const on = s === activeSegment;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onSegment?.(s)}
                className="rounded-[6px] px-3 py-1.5 text-[14px] [transition:background-color_140ms_var(--e-out),color_140ms_var(--e-out)]"
                style={{
                  background: on ? "var(--rail-active)" : "transparent",
                  color: on ? "var(--ink-gray-9)" : "var(--ink-gray-5)",
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      ) : null}

      {filters?.map((f) => (
        <button
          key={f.label}
          type="button"
          onClick={f.onClick}
          className="flex items-center gap-1 rounded-[var(--r-sm)] px-2.5 py-1.5 text-[14px] [transition:background-color_120ms_var(--e-out)] [@media(hover:hover)and(pointer:fine)]:hover:bg-[var(--row-hover)]"
          style={{ color: "var(--ink-gray-5)" }}
        >
          {f.label}
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </button>
      ))}

      {right ? <div className="ml-auto flex items-center gap-3">{right}</div> : null}
    </div>
  );
}

export function GroupHeading({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 px-3 pb-1 pt-5 first:pt-0">
      <h2 className="text-[15px] font-medium" style={{ color: "var(--ink-gray-9)" }}>
        {label}
      </h2>
      {count != null ? (
        <span className="text-[14px] tabular-nums" style={{ color: "var(--ink-gray-4)" }}>
          {count}
        </span>
      ) : null}
    </div>
  );
}

/** A row: no separator, a rounded hover band, everything on one line. */
export function Row({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  const body = (
    <div className="row flex w-full items-center gap-3 px-3 py-[11px] text-left" data-active={active ? "true" : undefined}>
      {children}
    </div>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="block w-full">
      {body}
    </button>
  ) : (
    body
  );
}

export function Chip({ color, children }: { color?: string; children: React.ReactNode }) {
  return (
    <span className="chip">
      {color ? <span className="chip-dot" style={{ background: color }} aria-hidden /> : null}
      {children}
    </span>
  );
}

export const CHIP_COLORS = {
  blue: "#5b9ff5",
  green: "#4ec08a",
  amber: "#e8a33c",
  red: "#e8615c",
  purple: "#a586f0",
  gray: "#8a8a8a",
} as const;

/** The one primary action, white on dark and dark on light. */
export function PrimaryAction({
  children,
  onClick,
  icon: Icon = Plus,
  loading,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--r)] pl-3 pr-4 text-[14.5px] font-medium",
        "[transition:opacity_140ms_var(--e-out),transform_120ms_var(--e-out)]",
        "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
        "[@media(hover:hover)and(pointer:fine)]:hover:opacity-90",
      )}
      style={{ background: "var(--surface-gray-7)", color: "var(--ink-white)" }}
    >
      <Icon className={clsx("h-4 w-4", loading && "animate-spin")} strokeWidth={2} aria-hidden />
      {children}
    </button>
  );
}
