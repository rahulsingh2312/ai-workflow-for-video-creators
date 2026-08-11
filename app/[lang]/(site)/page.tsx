import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { AGENTS, CONTRACT } from "@/content/agents";
import { HERO, SECTIONS } from "@/content/copy";
import { REFUSALS } from "@/content/refusals";
import { ROUTES } from "@/content/states";
import { brand } from "@/lib/brand";
import { isLang, tx, txs, type Lang } from "@/lib/i18n";
import { BlockExplorer } from "@/components/BlockExplorer";
import { PersonaThread } from "@/components/PersonaThread";
import { RouteDiagram } from "@/components/RouteDiagram";
import { Section, Shell } from "@/components/Section";
import { Signal } from "@/components/Signal";
import { ButtonLink, Label } from "@/components/Kit";
import { voiced } from "@/components/Voice";

export default async function Landing({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  if (!isLang(raw)) notFound();
  const lang = raw as Lang;
  const name = lang === "zh" ? brand.nameZh : brand.nameEn;

  return (
    <>
      {/* ── First viewport ─────────────────────────────────────────────────
          The sentence first, the diagram second. A reader who meets the
          schematic before they know what it is has to work out what they are
          looking at, and most of them will not bother.
          ------------------------------------------------------------------ */}
      <Shell className="pb-20 pt-16 sm:pb-28 sm:pt-24">
        <div className="rise">
          <h1 className="display display-tight max-w-[15ch] text-[clamp(2.75rem,7.2vw,5.5rem)]">
            {voiced(tx(HERO.h1, lang))}
          </h1>
          <p className="lede measure mt-8 text-[19px] text-bone-dim sm:text-[21px]">
            {tx(HERO.sub, lang).replace("{name}", name)}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <ButtonLink
              href={`/${lang}/workspace`}
              prefetch={false}
              variant="solid"
              size="lg"
              iconRight={ArrowRight}
            >
              {tx(HERO.primary, lang)}
            </ButtonLink>
            <ButtonLink href={`/${lang}/workflow`} variant="outline" size="lg">
              {tx(HERO.secondary, lang)}
            </ButtonLink>
          </div>
        </div>

        <figure className="mt-16 sm:mt-20">
          <RouteDiagram lang={lang} />

          {/*
            The figure caption carries the colour rule. It belongs under the
            drawing it governs rather than in a legend box off to one side,
            which is only ever read by people who already understood.
          */}
          <figcaption className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["danger", HERO.key.danger],
                ["caution", HERO.key.caution],
                ["clear", HERO.key.clear],
              ] as const
            ).map(([aspect, text]) => (
              <p key={aspect} className="flex items-start gap-2.5">
                <span className="flex h-[1.55em] shrink-0 items-center">
                  <Signal aspect={aspect} size="xs" />
                </span>
                <span className="text-[12.5px] leading-relaxed text-bone-faint">
                  {tx(text, lang)}
                </span>
              </p>
            ))}
            <p className="flex items-start gap-2.5">
              <span className="flex h-[1.55em] shrink-0 items-center">
                <span
                  aria-hidden
                  className="block h-3.5 w-px shrink-0"
                  style={{
                    background:
                      "repeating-linear-gradient(180deg, var(--lamp-red) 0 3px, transparent 3px 6px)",
                  }}
                />
              </span>
              <span className="text-[12.5px] leading-relaxed text-bone-faint">
                {tx(HERO.key.boundary, lang)}
              </span>
            </p>
          </figcaption>
        </figure>
      </Shell>

      {/* ── The line ───────────────────────────────────────────────────────── */}
      <Section
        id="line"
        tone="deep"
        wide
        heading={tx(SECTIONS.line.h, lang)}
        lede={tx(SECTIONS.line.p, lang)}
      >
        <BlockExplorer lang={lang} />
      </Section>

      {/* ── The interlocking table ─────────────────────────────────────────── */}
      <Section
        id="interlocking"
        wide
        heading={tx(SECTIONS.table.h, lang)}
        lede={tx(SECTIONS.table.p, lang)}
      >
        <RouteTable lang={lang} />
      </Section>

      {/* ── Eight agents, one contract ─────────────────────────────────────── */}
      <Section
        id="agents"
        tone="deep"
        wide
        heading={tx(SECTIONS.agents.h, lang)}
        lede={tx(SECTIONS.agents.p, lang)}
      >
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] lg:gap-16">
          <ol className="-mt-2">
            {AGENTS.map((a) => (
              <li key={a.id} className="border-b border-rule last:border-b-0">
                <Link
                  href={`/${lang}/agents#${a.id}`}
                  className="group flex items-center gap-5 py-6 [transition:padding_260ms_var(--ease-out)] hov:pl-2"
                >
                  <span className="mono w-7 shrink-0 self-start pt-2 text-[11px] text-bone-faint">
                    {a.post}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[21px] font-medium tracking-[-0.02em] text-bone sm:text-[23px]">
                      {tx(a.name, lang)}
                    </span>
                    <span className="mt-1.5 block text-[14.5px] leading-relaxed text-bone-dim">
                      {tx(a.short, lang)}
                    </span>
                  </span>
                  <ArrowUpRight
                    className="size-4 shrink-0 self-start text-bone-faint opacity-0 [transition:opacity_200ms_var(--ease-out),transform_200ms_var(--ease-out)] group-hover:opacity-100 sm:mt-2 group-hov:-translate-y-0.5"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ol>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-lg border border-rule bg-panel p-5">
              <Label>{tx(SECTIONS.agents.contractTitle, lang)}</Label>
              <dl className="mt-4 space-y-3">
                {CONTRACT.map((f) => (
                  <div key={f.field}>
                    <dt className="mono text-[12px] text-bone">{f.field}</dt>
                    <dd className="mt-0.5 text-[12.5px] leading-snug text-bone-faint">
                      {tx(f.note, lang)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      </Section>

      {/* ── The wall of reds ───────────────────────────────────────────────── */}
      <section
        id="refusals"
        className="scroll-mt-24 border-y border-rule bg-panel-inset"
      >
        <Shell className="py-24 sm:py-32">
          <div className="max-w-4xl">
            <h2 className="display display-tight max-w-[17ch] text-[clamp(2.125rem,4.4vw,3.5rem)]">
              {voiced(tx(SECTIONS.refusals.h, lang))}
            </h2>
            <p className="lede measure mt-6 text-[17px] text-bone-dim sm:mt-7 sm:text-[19px]">
              {tx(SECTIONS.refusals.p, lang)}
            </p>
          </div>

          <ul className="mt-14 grid gap-x-12 sm:mt-20 sm:grid-cols-2">
            {REFUSALS.map((r) => (
              <li
                key={r.post}
                className="flex items-start gap-4 border-t border-rule py-6"
              >
                <span className="flex h-[1.5em] shrink-0 items-center pt-px">
                  <Signal aspect="danger" size="sm" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[16.5px] font-medium leading-snug tracking-[-0.01em] text-bone">
                    {tx(r.what, lang)}
                  </span>
                  <span className="mt-2 block text-[14px] leading-relaxed text-bone-dim">
                    {tx(r.why, lang)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Shell>
      </section>

      {/* ── The persona ────────────────────────────────────────────────────── */}
      <Section
        id="persona"
        wide
        heading={tx(SECTIONS.persona.h, lang)}
        lede={tx(SECTIONS.persona.p, lang)}
      >
        <PersonaThread lang={lang} />
      </Section>

      {/* ── The paper trail ────────────────────────────────────────────────── */}
      <Section
        id="provenance"
        tone="deep"
        heading={tx(SECTIONS.provenance.h, lang)}
        lede={tx(SECTIONS.provenance.p, lang)}
      >
        <ol className="relative max-w-2xl">
          {/* One continuous line behind the marks: the trail is the point. */}
          <span
            aria-hidden
            className="absolute bottom-5 left-[4.5px] top-5 w-px bg-rule-strong"
          />
          {txs(SECTIONS.provenance.chain, lang).map((step, i) => (
            <li key={step} className="relative flex items-center gap-5 py-2.5">
              <span className="relative z-10 rounded-full bg-panel-deep p-0.5">
                <Signal aspect="clear" size="sm" />
              </span>
              <span className="mono w-6 shrink-0 text-[11px] text-bone-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[15px] text-bone-dim sm:text-[16px]">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Close ──────────────────────────────────────────────────────────── */}
      <section className="bg-panel">
        <Shell className="py-28 sm:py-36">
          <h2 className="display display-tight max-w-[16ch] text-[clamp(2.25rem,5.4vw,4.25rem)]">
            {voiced(tx(SECTIONS.close.h, lang))}
          </h2>
          <p className="lede measure mt-7 text-[18px] text-bone-dim sm:text-[20px]">
            {tx(SECTIONS.close.p, lang)}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <ButtonLink
              href={`/${lang}/workspace`}
              prefetch={false}
              variant="solid"
              size="lg"
              iconRight={ArrowRight}
            >
              {tx(HERO.primary, lang)}
            </ButtonLink>
            <ButtonLink href={`/${lang}/security`} variant="outline" size="lg">
              {lang === "zh" ? "看审计与权限" : "See the audit rules"}
            </ButtonLink>
          </div>
        </Shell>
      </section>
    </>
  );
}

/**
 * The interlocking, as a table.
 *
 * Rows are read left to right: the move, who may call it, and what happens
 * when a condition will not prove. The last column is the interesting one, so
 * it gets the width and the state mark; the first is an identifier, so it is
 * set in mono and stays narrow.
 */
function RouteTable({ lang }: { lang: Lang }) {
  const head = "px-5 py-3 text-left align-bottom";
  return (
    <div className="overflow-x-auto rounded-lg border border-rule">
      <table className="w-full min-w-[54rem] border-collapse">
        <thead>
          <tr className="border-b border-rule bg-panel-deep">
            <th scope="col" className={head}>
              <Label>{tx(SECTIONS.table.col.route, lang)}</Label>
            </th>
            <th scope="col" className={head}>
              <Label>{tx(SECTIONS.table.col.authority, lang)}</Label>
            </th>
            <th scope="col" className={head}>
              <Label>{tx(SECTIONS.table.col.fail, lang)}</Label>
            </th>
          </tr>
        </thead>
        <tbody>
          {ROUTES.map((r) => {
            const boundary = r.to === "PUBLISHED_MANUALLY";
            return (
              <tr
                key={`${r.from}-${r.to}`}
                className="border-b border-rule last:border-b-0"
              >
                <th
                  scope="row"
                  className="whitespace-nowrap px-5 py-5 text-left align-top font-normal"
                >
                  <span className="mono block text-[12px] text-bone">
                    {r.from}
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-px w-4 shrink-0"
                      style={{
                        background: boundary
                          ? "repeating-linear-gradient(90deg, var(--lamp-red) 0 3px, transparent 3px 6px)"
                          : "var(--rule-strong)",
                      }}
                    />
                    <span className="mono text-[12px] text-bone-dim">
                      {r.to}
                    </span>
                  </span>
                </th>
                <td className="px-5 py-5 align-top text-[13.5px] leading-relaxed text-bone-dim">
                  {tx(r.authority, lang)}
                </td>
                <td className="px-5 py-5 align-top">
                  <span className="flex items-start gap-3 text-[13.5px] leading-relaxed text-bone-dim">
                    <span className="flex h-[1.6em] shrink-0 items-center">
                      <Signal aspect={boundary ? "dark" : "danger"} size="xs" />
                    </span>
                    <span>{tx(r.onFail, lang)}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
