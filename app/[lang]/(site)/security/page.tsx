import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PAGES, SECURITY } from "@/content/copy";
import { LANGS, isLang, tx, txs, type Lang } from "@/lib/i18n";
import { PageHeader } from "@/components/PageHeader";
import { Shell } from "@/components/Section";
import { Signal } from "@/components/Signal";
import { clsx } from "@/lib/clsx";
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
  return {
    title: plain(tx(PAGES.security.title, lang === "zh" ? "zh" : "en")),
  };
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
    <section
      className={clsx(
        "border-b border-rule",
        tone === "deep" ? "bg-panel-deep" : "bg-panel",
      )}
    >
      <Shell className="py-16 sm:py-24">
        <h2 className="display display-tight max-w-[19ch] text-[clamp(1.875rem,3.6vw,2.75rem)]">
          {heading}
        </h2>
        <div className="mt-10 sm:mt-12">{children}</div>
      </Shell>
    </section>
  );
}

function RuleList({
  items,
  aspect = "clear",
}: {
  items: string[];
  aspect?: "clear" | "danger";
}) {
  return (
    <ul className="grid max-w-5xl gap-x-12 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-3 border-t border-rule py-5"
        >
          <span className="flex h-[1.6em] shrink-0 items-center">
            <Signal aspect={aspect} size="xs" />
          </span>
          <span className="text-[14.5px] leading-relaxed text-bone-dim">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function SecurityPage({
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
        h1={tx(PAGES.security.h1, lang)}
        lede={tx(PAGES.security.lede, lang)}
      />

      <Block heading={tx(SECURITY.roles.h, lang)} tone="deep">
        <dl className="grid max-w-5xl gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
          {SECURITY.roles.items.map((r) => (
            <div key={r.role.en} className="border-t border-rule py-5">
              <dt className="text-[15px] font-medium tracking-[-0.01em] text-bone">
                {tx(r.role, lang)}
              </dt>
              <dd className="mt-2 text-[13.5px] leading-relaxed text-bone-dim">
                {tx(r.can, lang)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="lede measure mt-10 text-[16px] text-bone-faint">
          {tx(SECURITY.roles.note, lang)}
        </p>
      </Block>

      <Block heading={tx(SECURITY.audited.h, lang)}>
        <ul className="flex flex-wrap gap-2">
          {txs(SECURITY.audited.items, lang).map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 rounded-md border border-rule bg-panel-deep py-2 pl-2.5 pr-3.5 text-[13.5px] text-bone-dim"
            >
              <Signal aspect="clear" size="xs" />
              {item}
            </li>
          ))}
        </ul>
        <p className="lede measure mt-9 text-[17px] text-bone-dim">
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
        {/*
          The pipeline drawn as a line, because it is one. The steps are
          numbered because the order is load-bearing: review happens before
          chunking, and moving it would change what an agent may retrieve.
        */}
        <ol className="flex flex-wrap items-center gap-y-3">
          {txs(SECURITY.ingestion.steps, lang).map((step, i, arr) => (
            <li key={step} className="flex items-center">
              <span className="flex items-center gap-2.5 rounded-md border border-rule bg-panel py-2 pl-2.5 pr-3.5">
                <span className="mono text-[11px] text-bone-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[13.5px] text-bone-dim">{step}</span>
              </span>
              {i < arr.length - 1 ? (
                <span aria-hidden className="h-px w-3 bg-rule-strong sm:w-5" />
              ) : null}
            </li>
          ))}
        </ol>
        <p className="lede measure mt-10 text-[17px] text-bone-dim">
          {tx(SECURITY.ingestion.note, lang)}
        </p>
      </Block>

      <Block heading={tx(SECURITY.model.h, lang)}>
        <RuleList items={txs(SECURITY.model.items, lang)} />
      </Block>
    </>
  );
}
