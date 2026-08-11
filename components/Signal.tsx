import { clsx } from "@/lib/clsx";

export type Aspect = "danger" | "caution" | "clear" | "dark";

/*
  A state mark.

  Three states are lit and one is not, and the difference between them is
  legible before you read a word: a lit mark is a solid disc sitting in a ring
  of its own colour, an unlit one is an empty ring. No glow. A glow is a claim
  about light, and this page is a record, not a lamp.
*/

const SIZE = {
  xs: "size-1.5",
  sm: "size-2",
  md: "size-2.5",
  lg: "size-3.5",
} as const;

/* The ring grows with the mark so the proportion stays constant. */
const RING = { xs: 2.5, sm: 3, md: 3.5, lg: 5 } as const;

const LIT: Record<Exclude<Aspect, "dark">, { dot: string; wash: string }> = {
  danger: { dot: "var(--lamp-red)", wash: "var(--wash-red)" },
  caution: { dot: "var(--lamp-amber)", wash: "var(--wash-amber)" },
  clear: { dot: "var(--lamp-green)", wash: "var(--wash-green)" },
};

export function Signal({
  aspect,
  size = "md",
  className,
  pulse = false,
}: {
  aspect: Aspect;
  size?: keyof typeof SIZE;
  className?: string;
  pulse?: boolean;
}) {
  const lit = aspect !== "dark" ? LIT[aspect] : null;

  return (
    <span
      aria-hidden
      className={clsx(
        "lamp block shrink-0 rounded-full",
        SIZE[size],
        className,
      )}
      style={
        lit
          ? {
              backgroundColor: lit.dot,
              boxShadow: `0 0 0 ${RING[size]}px ${lit.wash}`,
              opacity: pulse ? 0.75 : 1,
            }
          : {
              backgroundColor: "transparent",
              boxShadow: "inset 0 0 0 1.5px var(--rule-strong)",
            }
      }
    />
  );
}

/*
  A mark that has to line up with the first line of the text beside it.

  The wrapper is one line-height tall and centres the mark inside it, so the
  alignment holds at any type size and in any language without a hand-tuned
  top margin. Chinese sets looser, so the box follows the line-height that
  language actually uses.
*/
export function SignalLead({
  aspect,
  size = "xs",
  className,
}: {
  aspect: Aspect;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={clsx(
        "flex h-[calc(1em*var(--lead,1.5))] shrink-0 items-center",
        className,
      )}
    >
      <Signal aspect={aspect} size={size} />
    </span>
  );
}

/**
 * A state mark with its reference beside it: which state this is, in the
 * schema's own words, so a reader can match what they see here to what they
 * see in the workspace.
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
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <Signal aspect={aspect} size="sm" pulse={pulse} />
      <span className="mono text-[11px] leading-none text-bone-faint">
        {post}
      </span>
    </span>
  );
}
