import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COMMON, PAGES, SECTIONS } from "@/content/copy";
import { INVALIDATIONS, ROUTES, STATES } from "@/content/states";
import { LANGS, isLang, tx, txs, type Lang } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { Shell } from "@/components/Section";
import { Signal } from "@/components/Signal";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return { title: tx(PAGES.workflow.title, lang === "zh" ? "zh" : "en") };
}

export default async function WorkflowPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  if (!isLang(raw)) notFound();
  const lang = raw as Lang;

  return (
    <>
      <PageHeader
        post="SHEET 1 OF 4"
        h1={tx(PAGES.workflow.h1, lang)}
        lede={tx(PAGES.workflow.lede, lang)}
      />

      {/* Every block, in full. */}
      <Shell className="py-16 sm:py-20">
        <ol className="border-t border-rule">
          {STATES.map((state) => (
            <li
              key={state.code}
              id={state.code}
              className="scroll-mt-24 border-b border-rule py-10 sm:py-12"
            >
              <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-14">
                <div>
                  <div className="flex items-center gap-3">
                    <Signal aspect={state.beyondAuthority ? "dark" : "clear"} size="md" />
                    <span className="plate data text-[10px] text-bone-faint">{state.post}</span>
                    {state.beyondAuthority ? (
                      <span className="plate text-[9px] text-fg-red">
                        {lang === "zh" ? "边界之外" : "Beyond the boundary"}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="display mt-4 text-3xl font-semibold sm:text-4xl">
                    {tx(state.name, lang)}
                  </h2>
                  <p className="plate mt-2 text-[10px] text-bone-dim">{state.code}</p>
                  <p className="mt-4 text-[14px] leading-relaxed text-bone-dim">
                    {tx(state.meaning, lang)}
                  </p>
                </div>

                <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,13rem)]">
                  <div>
                    <h3 className="plate text-[10px] text-bone-faint">
                      {tx(COMMON.conditions, lang)}
                    </h3>
                    <ul className="mt-3 space-y-2.5">
                      {txs(state.conditions, lang).map((c) => (
                        <li key={c} className="flex items-start gap-2.5 text-[14px] leading-snug">
                          <Signal
                            aspect={state.beyondAuthority ? "dark" : "clear"}
                            size="xs"
                            className="mt-[7px]"
                          />
                          <span className="text-bone-dim">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <dl className="space-y-5 border-t border-rule pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                    <div>
                      <dt className="plate text-[10px] text-bone-faint">{tx(COMMON.role, lang)}</dt>
                      <dd className="mt-1.5 text-[14px] text-bone">{tx(state.role, lang)}</dd>
                    </div>
                    <div>
                      <dt className="plate text-[10px] text-bone-faint">
                        {tx(COMMON.produces, lang)}
                      </dt>
                      <dd className="mt-1.5 text-[13px] leading-snug text-bone-dim">
                        {tx(state.produces, lang)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Shell>

      {/* The interlocking table again, in full, because this is the page for it. */}
      <section className="border-y border-rule bg-panel-deep">
        <Shell className="py-16 sm:py-20">
          <h2 className="display max-w-[19ch] text-3xl font-semibold sm:text-4xl lg:text-5xl">
            {tx(SECTIONS.table.h, lang)}
          </h2>
          <div className="mt-10 overflow-x-auto rounded-sm border border-rule">
            <table className="w-full min-w-[52rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-rule-strong bg-panel">
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
                    <tr key={`${r.from}-${r.to}`} className="border-b border-rule last:border-b-0">
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
                          <Signal
                            aspect={boundary ? "dark" : "danger"}
                            size="xs"
                            className="mt-[6px]"
                          />
                          <span>{tx(r.onFail, lang)}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Shell>
      </section>

      {/* Clearances that get taken back. */}
      <Shell className="py-16 sm:py-24">
        <h2 className="display max-w-[19ch] text-3xl font-semibold sm:text-4xl lg:text-5xl">
          {tx(PAGES.workflow.invalidationH, lang)}
        </h2>
        <p className="measure mt-6 text-[15px] leading-relaxed text-bone-dim">
          {tx(PAGES.workflow.invalidationP, lang)}
        </p>
        <dl className="mt-12 border-t border-rule">
          {INVALIDATIONS.map((rule) => (
            <div
              key={rule.trigger.en}
              className="grid gap-3 border-b border-rule py-6 sm:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] sm:gap-10"
            >
              <dt className="flex items-start gap-3">
                <Signal aspect="danger" size="sm" className="mt-[5px]" />
                <span className="text-[15px] font-medium leading-snug text-bone">
                  {tx(rule.trigger, lang)}
                </span>
              </dt>
              <dd className="text-[14px] leading-relaxed text-bone-dim">{tx(rule.effect, lang)}</dd>
            </div>
          ))}
        </dl>
      </Shell>
    </>
  );
}
