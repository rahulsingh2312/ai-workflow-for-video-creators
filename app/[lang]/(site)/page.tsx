import Link from "next/link";
import { notFound } from "next/navigation";
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

export default async function Landing({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  if (!isLang(raw)) notFound();
  const lang = raw as Lang;
  const name = lang === "zh" ? brand.nameZh : brand.nameEn;

  return (
    <>
      {/* ── First viewport ─────────────────────────────────────────────────── */}
      <RouteDiagram lang={lang} />

      <Shell className="py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-16">
          <div>
            <h1 className="display max-w-[16ch] text-[clamp(2.75rem,8vw,5.75rem)] font-semibold">
              {tx(HERO.h1, lang)}
            </h1>
            <p className="measure mt-7 text-[16px] leading-relaxed text-bone-dim sm:text-[17px]">
              {tx(HERO.sub, lang).replace("{name}", name)}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href={`/${lang}/workspace`}
                prefetch={false}
                className="plate rounded-sm bg-bone px-5 py-3 text-[11px] text-panel-deep transition-colors duration-150 hover:bg-lamp-amber"
              >
                {tx(HERO.primary, lang)}
              </Link>
              <Link
                href={`/${lang}/workflow`}
                className="plate rounded-sm border border-rule-strong px-5 py-3 text-[11px] text-bone transition-colors duration-150 hover:bg-panel-raised"
              >
                {tx(HERO.secondary, lang)}
              </Link>
            </div>
          </div>

          {/* Every scheme plan carries a key. This one doubles as the colour rule. */}
          <aside className="lg:pt-3">
            <h2 className="plate border-b border-rule pb-3 text-[10px] text-bone-faint">
              {tx(HERO.keyTitle, lang)}
            </h2>
            <dl className="mt-4 space-y-4">
              {(
                [
                  ["danger", HERO.key.danger],
                  ["caution", HERO.key.caution],
                  ["clear", HERO.key.clear],
                ] as const
              ).map(([aspect, text]) => (
                <div key={aspect} className="flex items-start gap-3">
                  <dt className="pt-[3px]">
                    <Signal aspect={aspect} size="sm" />
                    <span className="sr-only">{aspect}</span>
                  </dt>
                  <dd className="text-[13px] leading-snug text-bone-dim">{tx(text, lang)}</dd>
                </div>
              ))}
              <div className="flex items-start gap-3">
                <dt className="pt-[2px]">
                  <span
                    aria-hidden
                    className="block h-3.5 w-[3px]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(180deg, var(--lamp-red) 0 3px, transparent 3px 6px)",
                    }}
                  />
                </dt>
                <dd className="text-[13px] leading-snug text-bone-dim">
                  {tx(HERO.key.boundary, lang)}
                </dd>
              </div>
            </dl>
            <p className="mt-5 border-t border-rule pt-4 text-[12px] leading-relaxed text-bone-faint">
              {tx(HERO.keyNote, lang)}
            </p>
          </aside>
        </div>
      </Shell>

      {/* ── The line ───────────────────────────────────────────────────────── */}
      <Section
        id="line"
        tone="deep"
        heading={tx(SECTIONS.line.h, lang)}
        lede={tx(SECTIONS.line.p, lang)}
      >
        <BlockExplorer lang={lang} />
      </Section>

      {/* ── The interlocking table ─────────────────────────────────────────── */}
      <Section
        id="interlocking"
        heading={tx(SECTIONS.table.h, lang)}
        lede={tx(SECTIONS.table.p, lang)}
      >
        <div className="overflow-x-auto rounded-sm border border-rule">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-rule-strong bg-panel-deep">
                <th scope="col" className="plate px-4 py-3 text-[10px] text-bone-faint">
                  {tx(SECTIONS.table.col.route, lang)}
                </th>
                <th scope="col" className="plate px-4 py-3 text-[10px] text-bone-faint">
                  {tx(SECTIONS.table.col.authority, lang)}
                </th>
                <th scope="col" className="plate px-4 py-3 text-[10px] text-bone-faint">
                  {tx(SECTIONS.table.col.fail, lang)}
                </th>
              </tr>
            </thead>
            <tbody>
              {ROUTES.map((r) => {
                const boundary = r.to === "PUBLISHED_MANUALLY";
                return (
                  <tr
                    key={`${r.from}-${r.to}`}
                    className="border-b border-rule last:border-b-0 even:bg-panel-deep/40"
                  >
                    <th scope="row" className="whitespace-nowrap px-4 py-4 align-top font-normal">
                      <span className="plate block text-[10px] text-bone">{r.from}</span>
                      <span className="mt-1 flex items-center gap-1.5">
                        <span
                          aria-hidden
                          className="inline-block h-[2px] w-4"
                          style={{
                            backgroundColor: boundary ? "transparent" : "var(--rule-strong)",
                            backgroundImage: boundary
                              ? "repeating-linear-gradient(90deg, var(--lamp-red) 0 3px, transparent 3px 6px)"
                              : undefined,
                          }}
                        />
                        <span className="plate text-[10px] text-bone-dim">{r.to}</span>
                      </span>
                    </th>
                    <td className="px-4 py-4 align-top text-[13px] text-bone-dim">
                      {tx(r.authority, lang)}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className="flex items-start gap-2.5 text-[13px] leading-relaxed text-bone-dim">
                        <Signal aspect={boundary ? "dark" : "danger"} size="xs" className="mt-[6px]" />
                        <span>{tx(r.onFail, lang)}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Eight agents, one contract ─────────────────────────────────────── */}
      <Section
        id="agents"
        tone="deep"
        heading={tx(SECTIONS.agents.h, lang)}
        lede={tx(SECTIONS.agents.p, lang)}
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-14">
          <ol className="border-t border-rule">
            {AGENTS.map((a) => (
              <li key={a.id} className="border-b border-rule">
                <Link
                  href={`/${lang}/agents#${a.id}`}
                  className="group flex items-start gap-4 py-5 transition-colors duration-150 hover:bg-panel/60 sm:gap-6"
                >
                  <span className="plate data w-8 shrink-0 pt-1 text-[10px] text-bone-faint">
                    {a.post}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="display block text-2xl font-semibold sm:text-[28px]">
                      {tx(a.name, lang)}
                    </span>
                    <span className="mt-1.5 block text-[14px] leading-snug text-bone-dim">
                      {tx(a.short, lang)}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="mt-2 hidden h-[2px] w-8 shrink-0 bg-rule-strong transition-all duration-200 group-hover:w-12 group-hover:bg-lamp-amber sm:block"
                  />
                </Link>
              </li>
            ))}
          </ol>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-sm border border-rule bg-panel p-5">
              <h3 className="plate text-[10px] text-bone-faint">
                {tx(SECTIONS.agents.contractTitle, lang)}
              </h3>
              <dl className="mt-4 space-y-2.5">
                {CONTRACT.map((f) => (
                  <div key={f.field} className="flex flex-col gap-0.5">
                    <dt className="data text-[12px] text-bone">{f.field}</dt>
                    <dd className="text-[12px] leading-snug text-bone-faint">{tx(f.note, lang)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </Section>

      {/* ── The wall of reds ───────────────────────────────────────────────── */}
      <section id="refusals" className="scroll-mt-20 border-b border-rule bg-panel-inset">
        <div
          aria-hidden
          className="h-1.5 w-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, var(--lamp-red) 0 8px, transparent 8px 16px)",
          }}
        />
        <Shell className="py-20 sm:py-28">
          <h2 className="display max-w-[19ch] text-4xl font-semibold sm:text-5xl lg:text-6xl">
            {tx(SECTIONS.refusals.h, lang)}
          </h2>
          <p className="measure mt-6 text-[15px] leading-relaxed text-bone-dim sm:text-base">
            {tx(SECTIONS.refusals.p, lang)}
          </p>

          <ul className="mt-14 grid gap-x-12 gap-y-px sm:grid-cols-2">
            {REFUSALS.map((r) => (
              <li key={r.post} className="flex items-start gap-4 border-t border-rule py-5">
                <span className="flex shrink-0 flex-col items-center gap-1.5 pt-1">
                  <Signal aspect="danger" size="md" />
                  <span className="plate data text-[9px] leading-none text-bone-faint">
                    {r.post}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block text-[17px] font-medium leading-snug text-bone">
                    {tx(r.what, lang)}
                  </span>
                  <span className="mt-1.5 block text-[13px] leading-relaxed text-bone-dim">
                    {tx(r.why, lang)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Shell>
        <div
          aria-hidden
          className="h-1.5 w-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, var(--lamp-red) 0 8px, transparent 8px 16px)",
          }}
        />
      </section>

      {/* ── The persona ────────────────────────────────────────────────────── */}
      <Section
        id="persona"
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
        <ol className="relative max-w-3xl">
          <span
            aria-hidden
            className="absolute bottom-4 left-[7px] top-4 w-[2px]"
            style={{ backgroundColor: "var(--rule)" }}
          />
          {txs(SECTIONS.provenance.chain, lang).map((step, i) => (
            <li key={step} className="relative flex items-center gap-5 py-2.5">
              <Signal aspect="clear" size="md" className="relative z-10" />
              <span className="plate data w-6 shrink-0 text-[10px] text-bone-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[15px] text-bone-dim sm:text-base">{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Close ──────────────────────────────────────────────────────────── */}
      <section className="bg-panel">
        <Shell className="py-24 sm:py-32">
          <div
            aria-hidden
            className="mb-10 flex items-center gap-3"
            title={tx(HERO.boundary, lang)}
          >
            <span className="h-[2px] flex-1" style={{ backgroundColor: "var(--rule-strong)" }} />
            <span
              className="h-10 w-[3px]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(180deg, var(--lamp-red) 0 4px, transparent 4px 8px)",
              }}
            />
            <span
              className="h-[2px] flex-1"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, var(--rule-strong) 0 5px, transparent 5px 10px)",
              }}
            />
          </div>
          <h2 className="display max-w-[18ch] text-4xl font-semibold sm:text-5xl lg:text-6xl">
            {tx(SECTIONS.close.h, lang)}
          </h2>
          <p className="measure mt-6 text-[15px] leading-relaxed text-bone-dim sm:text-base">
            {tx(SECTIONS.close.p, lang)}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href={`/${lang}/workspace`}
                prefetch={false}
              className="plate rounded-sm bg-bone px-5 py-3 text-[11px] text-panel-deep transition-colors duration-150 hover:bg-lamp-amber"
            >
              {tx(HERO.primary, lang)}
            </Link>
            <Link
              href={`/${lang}/security`}
              className="plate rounded-sm border border-rule-strong px-5 py-3 text-[11px] text-bone transition-colors duration-150 hover:bg-panel-raised"
            >
              {lang === "zh" ? "看审计与权限" : "See the audit rules"}
            </Link>
          </div>
        </Shell>
      </section>
    </>
  );
}
