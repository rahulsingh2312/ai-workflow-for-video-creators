import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { clsx } from "@/lib/clsx";

/*
  The site's controls, in one place.

  Every one of them shares the same three decisions, which is what makes a
  page of mixed buttons and links look machined rather than assembled:

  1. Optical icon spacing. An icon is not a character, so the gap beside it is
     not a word space. A 14px glyph wants 6px of air, a 16px glyph wants 8px,
     and a trailing icon wants slightly less than a leading one because the
     label's own sidebearing is already doing part of the job.
  2. A press response. 140ms, scale 0.975, so the control answers contact
     before the navigation does.
  3. Colour and border move on hover; nothing moves position. A control that
     jumps when you approach it is harder to hit.
*/

const SIZE = {
  sm: "h-8 gap-1.5 rounded-md px-3 text-[13px]",
  md: "h-10 gap-2 rounded-md px-4 text-[14px]",
  lg: "h-12 gap-2 rounded-lg px-5 text-[15px]",
} as const;

const ICON = { sm: "size-3.5", md: "size-4", lg: "size-4" } as const;

const VARIANT = {
  solid:
    "bg-bone text-panel font-medium hov:bg-bone-dim",
  outline:
    "border border-rule-strong text-bone hov:border-bone-faint hov:bg-panel-raised",
  ghost:
    "text-bone-dim hov:bg-panel-raised hov:text-bone",
  quiet:
    "border border-rule bg-panel-inset text-bone-dim hov:border-rule-strong hov:text-bone",
} as const;

type Common = {
  children: React.ReactNode;
  variant?: keyof typeof VARIANT;
  size?: keyof typeof SIZE;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  className?: string;
};

function inner(
  { children, icon: Icon, iconRight: IconRight }: Common,
  size: keyof typeof SIZE,
) {
  return (
    <>
      {Icon ? <Icon className={clsx(ICON[size], "shrink-0")} strokeWidth={1.75} aria-hidden /> : null}
      {children}
      {IconRight ? (
        <IconRight
          className={clsx(ICON[size], "-mr-0.5 shrink-0")}
          strokeWidth={1.75}
          aria-hidden
        />
      ) : null}
    </>
  );
}

const base =
  "press inline-flex shrink-0 items-center justify-center whitespace-nowrap " +
  "[transition:background-color_160ms_var(--ease-out),border-color_160ms_var(--ease-out),color_160ms_var(--ease-out)] " +
  "disabled:cursor-not-allowed disabled:opacity-40";

export function ButtonLink({
  href,
  prefetch,
  variant = "outline",
  size = "md",
  className,
  ...rest
}: Common & { href: string; prefetch?: false }) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={clsx(base, SIZE[size], VARIANT[variant], className)}
    >
      {inner({ variant, size, ...rest } as Common, size)}
    </Link>
  );
}

export function Button({
  onClick,
  type = "button",
  disabled,
  title,
  variant = "outline",
  size = "md",
  className,
  ...rest
}: Common & {
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(base, SIZE[size], VARIANT[variant], className)}
    >
      {inner({ variant, size, ...rest } as Common, size)}
    </button>
  );
}

/**
 * A small caps label. Used for column heads and the name of a field, and
 * never for a sentence: at this size and tracking, uppercase stops being
 * readable after about four words.
 */
export function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={clsx("plate text-bone-faint", className)}>{children}</p>;
}

/**
 * A bordered surface. Elevation is declared once, as a border: a 1px outline
 * under a soft shadow is the ghost card, and this page has enough real
 * structure that it does not need to float anything.
 */
export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  return (
    <As className={clsx("rounded-lg border border-rule bg-panel-raised", className)}>
      {children}
    </As>
  );
}
