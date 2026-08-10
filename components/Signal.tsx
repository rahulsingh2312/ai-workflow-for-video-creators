import { clsx } from "@/lib/clsx";

export type Aspect = "danger" | "caution" | "clear" | "dark";

const SIZES = {
  xs: "h-2 w-2",
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-6 w-6",
} as const;

const LIT: Record<Exclude<Aspect, "dark">, { bg: string; halo: string }> = {
  danger: { bg: "var(--lamp-red)", halo: "var(--halo-red)" },
  caution: { bg: "var(--lamp-amber)", halo: "var(--halo-amber)" },
  clear: { bg: "var(--lamp-green)", halo: "var(--halo-green)" },
};

/**
 * A colour-light signal head. Lit aspects throw a halo onto the panel around
 * them the way an incandescent lamp does; an unlit aspect is a dark recess
 * with its bezel still catching light, not an empty circle.
 */
export function Signal({
  aspect,
  size = "md",
  className,
  pulse = false,
}: {
  aspect: Aspect;
  size?: keyof typeof SIZES;
  className?: string;
  pulse?: boolean;
}) {
  const lit = aspect !== "dark" ? LIT[aspect] : null;

  return (
    <span
      aria-hidden
      className={clsx(
        "lamp inline-block shrink-0 rounded-full",
        SIZES[size],
        pulse && "signal-proving",
        className,
      )}
      style={
        lit
          ? {
              backgroundColor: lit.bg,
              boxShadow: `0 0 0 1px color-mix(in srgb, ${lit.bg} 55%, transparent), 0 0 9px 1px ${lit.halo}, 0 0 20px 3px ${lit.halo}`,
            }
          : {
              backgroundColor: "var(--panel-inset)",
              boxShadow:
                "inset 0 1px 2px rgba(0,0,0,0.45), 0 0 0 1px color-mix(in srgb, var(--rule-strong) 70%, transparent)",
            }
      }
    />
  );
}

/**
 * The full signal head on its post: a numbered plate under a lamp, which is
 * how a scheme plan identifies which signal it is talking about.
 */
export function SignalPost({
  aspect,
  post,
  className,
  pulse,
}: {
  aspect: Aspect;
  post: string;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5", className)}>
      <Signal aspect={aspect} size="sm" pulse={pulse} />
      <span className="plate data text-[10px] leading-none text-bone-faint">{post}</span>
    </span>
  );
}
