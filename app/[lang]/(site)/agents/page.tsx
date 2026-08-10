import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AGENTS, CONTRACT } from "@/content/agents";
import { PAGES, SECTIONS } from "@/content/copy";
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
  return { title: tx(PAGES.agents.title, lang === "zh" ? "zh" : "en") };
}

function FieldList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <h3 className="plate text-[10px] text-bone-faint">{label}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-[14px] leading-snug">
            <span
              aria-hidden
              className="mt-[9px] h-[2px] w-2.5 shrink-0"
              style={{ backgroundColor: "var(--rule-strong)" }}
            />
            <span className="text-bone-dim">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function AgentsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  if (!isLang(raw)) notFound();
  const lang = raw as Lang;
  const labels = PAGES.agents.labels;

  return (
    <>
      <PageHeader
        post="SHEET 2 OF 4"
        h1={tx(PAGES.agents.h1, lang)}
        lede={tx(PAGES.agents.lede, lang)}
      />

      {/* The contract they all share, stated once, before any of them. */}
      <section className="border-b border-rule bg-panel">
        <Shell className="py-14 sm:py-16">
          <h2 className="plate text-[10px] text-bone-faint">
            {tx(SECTIONS.agents.contractTitle, lang)}
          </h2>
          <p className="measure mt-4 text-[14px] leading-relaxed text-bone-dim">
            {tx(SECTIONS.agents.p, lang)}
          </p>
          <dl className="mt-8 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {CONTRACT.map((f) => (
              <div key={f.field} className="border-t border-rule pt-3">
                <dt className="data text-[13px] text-bone">{f.field}</dt>
                <dd className="mt-1 text-[12px] leading-snug text-bone-faint">
                  {tx(f.note, lang)}
                </dd>
              </div>
            ))}
          </dl>
        </Shell>
      </section>

      <Shell className="py-12 sm:py-16">
        <ol>
          {AGENTS.map((a) => (
            <li
              key={a.id}
              id={a.id}
              className="scroll-mt-24 border-b border-rule py-12 last:border-b-0 sm:py-16"
            >
              <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-14">
                <div className="lg:sticky lg:top-24 lg:self-start">
                  <div className="flex items-center gap-3">
                    <Signal aspect="clear" size="md" />
                    <span className="plate data text-[10px] text-bone-faint">{a.post}</span>
                    <span className="plate data text-[10px] text-bone-faint">§{a.ref}</span>
                  </div>
                  <h2 className="display mt-4 text-3xl font-semibold sm:text-4xl">
                    {tx(a.name, lang)}
                  </h2>
                  <div className="mt-5">
                    <h3 className="plate text-[10px] text-bone-faint">{tx(labels.purpose, lang)}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-bone-dim">
                      {tx(a.purpose, lang)}
                    </p>
                  </div>
                  {a.trigger ? (
                    <div className="mt-5">
                      <h3 className="plate text-[10px] text-bone-faint">
                        {tx(labels.trigger, lang)}
                      </h3>
                      <p className="mt-2 text-[14px] leading-relaxed text-bone-dim">
                        {tx(a.trigger, lang)}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-8 sm:grid-cols-2">
                  <FieldList label={tx(labels.inputs, lang)} items={txs(a.inputs, lang)} />
                  <FieldList label={tx(labels.work, lang)} items={txs(a.work, lang)} />
                  <FieldList label={tx(labels.output, lang)} items={txs(a.output, lang)} />
                  <div className="space-y-6">
                    {a.human ? (
                      <div>
                        <h3 className="plate text-[10px] text-bone-faint">
                          {tx(labels.human, lang)}
                        </h3>
                        <p className="mt-3 text-[14px] leading-relaxed text-bone-dim">
                          {tx(a.human, lang)}
                        </p>
                      </div>
                    ) : null}
                    {a.hardRule ? (
                      <div className="rounded-sm border border-rule bg-panel-deep p-4">
                        <h3 className="plate flex items-center gap-2 text-[10px] text-bone-faint">
                          <Signal aspect="danger" size="xs" />
                          {tx(labels.hard, lang)}
                        </h3>
                        <p className="mt-2.5 text-[13px] leading-relaxed text-bone">
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
