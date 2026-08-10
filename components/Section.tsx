import { clsx } from "@/lib/clsx";

export function Shell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-10", className)}>{children}</div>
  );
}

/**
 * Section rhythm: more space above a heading than below it, one measure for
 * the lede, and no eyebrow label above the heading. The heading carries itself.
 */
export function Section({
  id,
  heading,
  lede,
  children,
  tone = "panel",
}: {
  id?: string;
  heading: string;
  lede?: string;
  children?: React.ReactNode;
  tone?: "panel" | "deep";
}) {
  return (
    <section
      id={id}
      className={clsx(
        "scroll-mt-20 border-b border-rule py-20 sm:py-28",
        tone === "deep" ? "bg-panel-deep" : "bg-panel",
      )}
    >
      <Shell>
        <h2 className="display max-w-[19ch] text-4xl font-semibold sm:text-5xl lg:text-6xl">
          {heading}
        </h2>
        {lede ? (
          <p className="measure mt-6 text-[15px] leading-relaxed text-bone-dim sm:text-base">
            {lede}
          </p>
        ) : null}
        {children ? <div className="mt-12 sm:mt-16">{children}</div> : null}
      </Shell>
    </section>
  );
}
