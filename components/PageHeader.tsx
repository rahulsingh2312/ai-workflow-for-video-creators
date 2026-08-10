import { Shell } from "@/components/Section";

export function PageHeader({
  h1,
  lede,
  post,
}: {
  h1: string;
  lede: string;
  /** Sheet reference, the way a drawing names which sheet you are holding. */
  post: string;
}) {
  return (
    <div className="border-b border-rule bg-panel-deep">
      <Shell className="py-16 sm:py-24">
        <p className="plate data text-[10px] text-bone-faint">{post}</p>
        <h1 className="display mt-4 max-w-[17ch] text-[clamp(2.5rem,6.5vw,4.75rem)] font-semibold">
          {h1}
        </h1>
        <p className="measure mt-6 text-[15px] leading-relaxed text-bone-dim sm:text-base">{lede}</p>
      </Shell>
    </div>
  );
}
