import { clsx } from "@/lib/clsx";
import { voiced } from "@/components/Voice";

export function Shell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "mx-auto w-full max-w-[84rem] px-5 sm:px-8 lg:px-12",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * A hairline that only exists where a band actually changes ground. The old
 * sheet ruled a line under every section, which turned the page into a stack
 * of boxes; here the change of ground does that work and the rule is the
 * exception.
 */
export function Rule({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("h-px w-full bg-rule", className)} />;
}

/*
  Section rhythm.

  More space above a heading than below it, one measure for the lede, and no
  eyebrow: the heading carries itself. The lede is set in the serif because it
  is the page speaking in its own voice, and the body underneath returns to
  the product's.
*/
export function Section({
  id,
  heading,
  lede,
  children,
  tone = "panel",
  wide = false,
}: {
  id?: string;
  heading: string;
  lede?: string;
  children?: React.ReactNode;
  tone?: "panel" | "deep";
  /** Lets a section's content run wider than the heading's measure. */
  wide?: boolean;
}) {
  return (
    <section
      id={id}
      className={clsx(
        "scroll-mt-24 py-24 sm:py-32",
        tone === "deep" ? "border-y border-rule bg-panel-deep" : "bg-panel",
      )}
    >
      <Shell>
        <div className={wide ? undefined : "max-w-4xl"}>
          <h2 className="display display-tight max-w-[17ch] text-[clamp(2.125rem,4.4vw,3.5rem)]">
            {voiced(heading)}
          </h2>
          {lede ? (
            <p className="lede measure mt-6 text-[17px] text-bone-dim sm:mt-7 sm:text-[19px]">
              {voiced(lede)}
            </p>
          ) : null}
        </div>
        {children ? <div className="mt-14 sm:mt-20">{children}</div> : null}
      </Shell>
    </section>
  );
}
