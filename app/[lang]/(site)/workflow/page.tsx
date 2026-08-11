import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COMMON, PAGES, SECTIONS } from "@/content/copy";
import { INVALIDATIONS, ROUTES, STATES } from "@/content/states";
import { LANGS, isLang, tx, txs, type Lang } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { Shell } from "@/components/Section";
import { Signal } from "@/components/Signal";
import { Label } from "@/components/Kit";
import { plain, voiced } from "@/components/Voice";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: plain(tx(PAGES.workflow.title, lang === "zh" ? "zh" : "en")),
  };
}

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  if (!isLang(raw)) notFound();
  const lang = raw as Lang;

  return (
    <>
      <PageHeader
        h1={tx(PAGES.workflow.h1, lang)}
        lede={tx(PAGES.workflow.lede, lang)}
      />

      {/* ── Every block, in full ─────────────────────────────────────────────
          Two columns: what the state is on the left, what it has to prove and
          who owns it on the right. The left column keeps a fixed width down
          the whole list so the eye can run straight down the state names
          without re-finding the left edge on every row.
          -------------------------------------------------------------------- */}
      <Shell className="py-16 sm:py-24">
        <ol>
          {STATES.map((state) => (
            <li
              key={state.code}
              id={state.code}
              className="scroll-mt-24 border-b border-rule py-12 first:border-t sm:py-14"
            >
              <div className="grid gap-9 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-16">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Signal
                      aspect={state.beyondAuthority ? "dark" : "clear"}
                      size="sm"
                    />
                    <span className="mono text-[11.5px] text-bone-faint">
                      {state.post}
                    </span>
                    {state.beyondAuthority ? (
                      <span className="plate text-fg-red">
                        {lang === "zh" ? "边界之外" : "Beyond the boundary"}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="display mt-4 text-[clamp(1.75rem,3vw,2.375rem)]">
                    {tx(state.name, lang)}
                  </h2>
                  <p className="mono mt-2 text-[12px] text-bone-faint">
                    {state.code}
                  </p>
                  <p className="lede mt-5 max-w-[46ch] text-[16px] text-bone-dim">
                    {tx(state.meaning, lang)}
                  </p>
                </div>

                <div className="grid gap-9 sm:grid-cols-[minmax(0,1fr)_minmax(0,13rem)] sm:gap-10">
                  <div>
                    <Label>{tx(COMMON.conditions, lang)}</Label>
                    <ul className="mt-3.5 space-y-2.5">
                      {txs(state.conditions, lang).map((c) => (
                        <li
                          key={c}
                          className="flex items-start gap-3 text-[14.5px] leading-relaxed"
                        >
                          <span className="flex h-[1.6em] shrink-0 items-center">
                            <Signal
                              aspect={state.beyondAuthority ? "dark" : "clear"}
                              size="xs"
                            />
                          </span>
                          <span className="text-bone-dim">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <dl className="space-y-6 border-t border-rule pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
                    <div>
                      <dt>
                        <Label>{tx(COMMON.role, lang)}</Label>
                      </dt>
                      <dd className="mt-2 text-[14.5px] text-bone">
                        {tx(state.role, lang)}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <Label>{tx(COMMON.produces, lang)}</Label>
                      </dt>
                      <dd className="mt-2 text-[13.5px] leading-relaxed text-bone-dim">
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

      {/* ── The interlocking, in full ────────────────────────────────────── */}
      <section className="border-y border-rule bg-panel-deep">
        <Shell className="py-20 sm:py-28">
          <h2 className="display display-tight max-w-[17ch] text-[clamp(2rem,4vw,3rem)]">
            {voiced(tx(SECTIONS.table.h, lang))}
          </h2>
          <div className="mt-12 overflow-x-auto rounded-lg border border-rule">
            <table className="w-full min-w-[54rem] border-collapse">
              <thead>
                <tr className="border-b border-rule bg-panel">
                  <th scope="col" className="px-5 py-3 text-left align-bottom">
                    <Label>{tx(SECTIONS.table.col.route, lang)}</Label>
                  </th>
                  <th scope="col" className="px-5 py-3 text-left align-bottom">
                    <Label>{tx(SECTIONS.table.col.authority, lang)}</Label>
                  </th>
                  <th scope="col" className="px-5 py-3 text-left align-bottom">
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
                            <Signal
                              aspect={boundary ? "dark" : "danger"}
                              size="xs"
                            />
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
        </Shell>
      </section>

      {/* ── Clearances that get taken back ──────────────────────────────── */}
      <Shell className="py-20 sm:py-28">
        <h2 className="display display-tight max-w-[17ch] text-[clamp(2rem,4vw,3rem)]">
          {voiced(tx(PAGES.workflow.invalidationH, lang))}
        </h2>
        <p className="lede measure mt-7 text-[17px] text-bone-dim sm:text-[19px]">
          {tx(PAGES.workflow.invalidationP, lang)}
        </p>
        <dl className="mt-14">
          {INVALIDATIONS.map((rule) => (
            <div
              key={rule.trigger.en}
              className="grid gap-3 border-t border-rule py-7 last:border-b sm:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] sm:gap-12"
            >
              <dt className="flex items-start gap-3">
                <span className="flex h-[1.5em] shrink-0 items-center">
                  <Signal aspect="danger" size="sm" />
                </span>
                <span className="text-[15.5px] font-medium leading-snug tracking-[-0.01em] text-bone">
                  {tx(rule.trigger, lang)}
                </span>
              </dt>
              <dd className="text-[14.5px] leading-relaxed text-bone-dim">
                {tx(rule.effect, lang)}
              </dd>
            </div>
          ))}
        </dl>
      </Shell>
    </>
  );
}
