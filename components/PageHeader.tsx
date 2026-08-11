import { Shell } from "@/components/Section";
import { voiced } from "@/components/Voice";

/**
 * The top of an interior page. One heading and one sentence, with room around
 * them. There is no label above the heading: a page whose title needs a label
 * to explain it has the wrong title.
 */
export function PageHeader({ h1, lede }: { h1: string; lede: string }) {
  return (
    <header className="border-b border-rule bg-panel-deep">
      <Shell className="pb-16 pt-20 sm:pb-24 sm:pt-28">
        <h1 className="display display-tight max-w-[16ch] text-[clamp(2.5rem,6.2vw,4.5rem)]">
          {voiced(h1)}
        </h1>
        <p className="lede measure mt-7 text-[18px] text-bone-dim sm:text-[20px]">
          {voiced(lede)}
        </p>
      </Shell>
    </header>
  );
}
