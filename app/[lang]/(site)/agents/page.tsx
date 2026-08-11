import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AGENTS, CONTRACT } from "@/content/agents";
import { PAGES, SECTIONS } from "@/content/copy";
import { LANGS, isLang, tx, txs, type Lang } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { Shell } from "@/components/Section";
import { Signal } from "@/components/Signal";
import { Label } from "@/components/Kit";
import { plain } from "@/components/Voice";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return { title: plain(tx(PAGES.agents.title, lang === "zh" ? "zh" : "en")) };
}

/**
 * A list of short items under a heading. The bullet is a hairline rule rather
 * than a disc: these are field names, not sentences, and a rule sets a left
 * edge for the column without adding another round shape to a page that
 * reserves circles for state.
 */
function FieldList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <Label>{label}</Label>
      <ul className="mt-3.5 space-y-2.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-3 text-[14px] leading-relaxed"
          >
            <span className="flex h-[1.6em] shrink-0 items-center">
              <span aria-hidden className="block h-px w-2.5 bg-rule-strong" />
            </span>
            <span className="text-bone-dim">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  if (!isLang(raw)) notFound();
  const lang = raw as Lang;
  const labels = PAGES.agents.labels;

  return (
    <>
      <PageHeader
        h1={tx(PAGES.agents.h1, lang)}
        lede={tx(PAGES.agents.lede, lang)}
      />

      {/* ── The contract they all share, stated once, before any of them ─── */}
      <section className="border-b border-rule bg-panel">
        <Shell className="py-16 sm:py-20">
          <h2 className="display text-[clamp(1.5rem,2.6vw,2rem)]">
            {tx(SECTIONS.agents.contractTitle, lang)}
          </h2>
          <p className="lede measure mt-4 text-[16px] text-bone-dim">
            {tx(SECTIONS.agents.p, lang)}
          </p>
          <dl className="mt-10 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {CONTRACT.map((f) => (
              <div key={f.field} className="border-t border-rule pt-3.5">
                <dt className="mono text-[13px] text-bone">{f.field}</dt>
                <dd className="mt-1.5 text-[12.5px] leading-relaxed text-bone-faint">
                  {tx(f.note, lang)}
                </dd>
              </div>
            ))}
          </dl>
        </Shell>
      </section>

      {/* ── The eight, in full ──────────────────────────────────────────── */}
      <Shell className="py-16 sm:py-20">
        <ol>
          {AGENTS.map((a) => (
            <li
              key={a.id}
              id={a.id}
              className="scroll-mt-24 border-b border-rule py-14 last:border-b-0 sm:py-16"
            >
              <div className="grid gap-10 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:gap-16">
                <div className="lg:sticky lg:top-24 lg:self-start">
                  <div className="flex items-center gap-2.5">
                    <Signal aspect="clear" size="sm" />
                    <span className="mono text-[11.5px] text-bone-faint">
                      {a.post}
                    </span>
                    <span aria-hidden className="h-3 w-px bg-rule" />
                    <span className="mono text-[11.5px] text-bone-faint">
                      §{a.ref}
                    </span>
                  </div>
                  <h2 className="display mt-4 text-[clamp(1.875rem,3.2vw,2.5rem)]">
                    {tx(a.name, lang)}
                  </h2>
                  <div className="mt-6">
                    <Label>{tx(labels.purpose, lang)}</Label>
                    <p className="mt-2.5 text-[14.5px] leading-relaxed text-bone-dim">
                      {tx(a.purpose, lang)}
                    </p>
                  </div>
                  {a.trigger ? (
                    <div className="mt-6">
                      <Label>{tx(labels.trigger, lang)}</Label>
                      <p className="mt-2.5 text-[14.5px] leading-relaxed text-bone-dim">
                        {tx(a.trigger, lang)}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
                  <FieldList
                    label={tx(labels.inputs, lang)}
                    items={txs(a.inputs, lang)}
                  />
                  <FieldList
                    label={tx(labels.work, lang)}
                    items={txs(a.work, lang)}
                  />
                  <FieldList
                    label={tx(labels.output, lang)}
                    items={txs(a.output, lang)}
                  />
                  <div className="space-y-7">
                    {a.human ? (
                      <div>
                        <Label>{tx(labels.human, lang)}</Label>
                        <p className="mt-3 text-[14px] leading-relaxed text-bone-dim">
                          {tx(a.human, lang)}
                        </p>
                      </div>
                    ) : null}
                    {a.hardRule ? (
                      /*
                        The one place an agent refuses. It gets a ground of its
                        own rather than a coloured left border, because the
                        refusal is the content here, not an annotation on it.
                      */
                      <div className="rounded-lg border border-rule bg-panel-deep p-4">
                        <div className="flex items-center gap-2">
                          <Signal aspect="danger" size="xs" />
                          <Label>{tx(labels.hard, lang)}</Label>
                        </div>
                        <p className="mt-3 text-[13.5px] leading-relaxed text-bone">
                          {tx(a.hardRule, lang)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Shell>
    </>
  );
}
