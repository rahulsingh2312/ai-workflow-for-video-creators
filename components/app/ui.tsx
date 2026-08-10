"use client";

import { Signal, type Aspect } from "@/components/Signal";
import { clsx } from "@/lib/clsx";

export function Panel({
  title,
  right,
  children,
  className,
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("min-w-0 rounded-sm border border-rule bg-panel", className)}>
      {title || right ? (
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule bg-panel-deep px-4 py-2.5">
          {title ? <h3 className="plate text-[10px] text-bone-dim">{title}</h3> : null}
          {right ? <div className="ml-auto flex items-center gap-2">{right}</div> : null}
        </header>
      ) : null}
      <div className="min-w-0 overflow-x-auto p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function Pill({
  aspect = "dark",
  children,
  className,
}: {
  aspect?: Aspect;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "plate inline-flex items-center gap-1.5 rounded-sm border border-rule bg-panel-inset px-2 py-1 text-[9px] text-bone-dim",
        className,
      )}
    >
      <Signal aspect={aspect} size="xs" />
      {children}
    </span>
  );
}

export function Btn({
  onClick,
  children,
  variant = "ghost",
  disabled,
  title,
  type = "button",
}: {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        "plate rounded-sm px-3 py-2 text-[10px] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" &&
          "bg-bone text-panel-deep enabled:hover:bg-lamp-amber disabled:bg-panel-raised disabled:text-bone-faint",
        variant === "ghost" &&
          "border border-rule text-bone-dim enabled:hover:border-rule-strong enabled:hover:text-bone",
        variant === "danger" &&
          "border border-rule text-fg-red enabled:hover:border-lamp-red enabled:hover:bg-panel-raised",
      )}
    >
      {children}
    </button>
  );
}

export function KeyRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-rule py-2 last:border-b-0">
      <dt className="plate w-36 shrink-0 text-[9px] text-bone-faint">{k}</dt>
      <dd className="min-w-0 flex-1 text-[13px] leading-snug text-bone-dim">{v}</dd>
    </div>
  );
}

export const LEVEL_ASPECT: Record<string, Aspect> = {
  CRITICAL: "danger",
  HIGH: "danger",
  MEDIUM: "caution",
  LOW: "caution",
};

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-sm border border-dashed border-rule bg-panel-deep px-5 py-8">
      <Signal aspect="dark" size="md" />
      <p className="measure text-[13px] leading-relaxed text-bone-faint">{children}</p>
    </div>
  );
}
