import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PAGES, SECURITY } from "@/content/copy";
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
  return { title: tx(PAGES.security.title, lang === "zh" ? "zh" : "en") };
}

function Block({
  heading,
  children,
  tone = "panel",
}: {
  heading: string;
  children: React.ReactNode;
  tone?: "panel" | "deep";
}) {
  return (
    <section className={tone === "deep" ? "border-b border-rule bg-panel-deep" : "border-b border-rule bg-panel"}>
      <Shell className="py-14 sm:py-20">
        <h2 className="display max-w-[20ch] text-3xl font-semibold sm:text-4xl lg:text-[2.75rem]">
          {heading}
        </h2>
        <div className="mt-8">{children}</div>
      </Shell>
    </section>
  );
}

function RuleList({ items, aspect = "clear" }: { items: string[]; aspect?: "clear" | "danger" }) {
  return (
    <ul className="grid max-w-4xl gap-x-10 gap-y-4 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 border-t border-rule pt-4">
          <Signal aspect={aspect} size="xs" className="mt-[7px]" />
          <span className="text-[14px] leading-relaxed text-bone-dim">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function SecurityPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  if (!isLang(raw)) notFound();
  const lang = raw as Lang;

  return (
    <>
      <PageHeader
        post="SHEET 3 OF 4"
        h1={tx(PAGES.security.h1, lang)}
        lede={tx(PAGES.security.lede, lang)}
      />

      <Block heading={tx(SECURITY.roles.h, lang)} tone="deep">
        <dl className="grid max-w-5xl gap-x-12 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {SECURITY.roles.items.map((r) => (
            <div key={r.role.en} className="border-t border-rule pt-4">
              <dt className="plate text-[11px] text-bone">{tx(r.role, lang)}</dt>
              <dd className="mt-2 text-[13px] leading-relaxed text-bone-dim">{tx(r.can, lang)}</dd>
            </div>
          ))}
        </dl>
        <p className="measure mt-10 text-[14px] leading-relaxed text-bone-faint">
          {tx(SECURITY.roles.note, lang)}
        </p>
      </Block>

      <Block heading={tx(SECURITY.audited.h, lang)}>
        <ul className="flex flex-wrap gap-2">
          {txs(SECURITY.audited.items, lang).map((item) => (
            <li
              key={item}
              className="plate flex items-center gap-2 rounded-sm border border-rule bg-panel-deep px-3 py-2 text-[11px] text-bone-dim"
            >
              <Signal aspect="clear" size="xs" />
              {item}
            </li>
          ))}
        </ul>
        <p className="measure mt-8 text-[15px] leading-relaxed text-bone-dim">
          {tx(SECURITY.audited.note, lang)}
        </p>
      </Block>

      <Block heading={tx(SECURITY.isolation.h, lang)} tone="deep">
        <RuleList items={txs(SECURITY.isolation.items, lang)} />
      </Block>

      <Block heading={tx(SECURITY.failure.h, lang)}>
        <RuleList items={txs(SECURITY.failure.items, lang)} aspect="danger" />
      </Block>

      <Block heading={tx(SECURITY.ingestion.h, lang)} tone="deep">
        {/* The pipeline drawn as a line, because it is one. */}
        <ol className="flex flex-wrap items-center gap-y-4">
          {txs(SECURITY.ingestion.steps, lang).map((step, i, arr) => (
            <li key={step} className="flex items-center">
              <span className="flex items-center gap-2.5 rounded-sm border border-rule bg-panel px-3 py-2">
                <span className="plate data text-[9px] text-bone-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[13px] text-bone-dim">{step}</span>
              </span>
              {i < arr.length - 1 ? (
                <span
                  aria-hidden
                  className="h-[2px] w-4 sm:w-6"
                  style={{ backgroundColor: "var(--rule-strong)" }}
                />
              ) : null}
            </li>
          ))}
        </ol>
        <p className="measure mt-10 text-[15px] leading-relaxed text-bone-dim">
          {tx(SECURITY.ingestion.note, lang)}
        </p>
      </Block>

      <Block heading={tx(SECURITY.model.h, lang)}>
        <RuleList items={txs(SECURITY.model.items, lang)} />
      </Block>
    </>
  );
}
