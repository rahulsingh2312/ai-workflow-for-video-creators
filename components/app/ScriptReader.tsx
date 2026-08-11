"use client";

import { Fragment, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { clsx } from "@/lib/clsx";

/*
  THE SCRIPT, READ THE WAY IT IS ARGUED.

  The generator writes a section head in 【brackets】 and drops a source id in
  [square brackets] after any sentence that leans on one. Rendering that as one
  undifferentiated block of pre-wrapped text throws away the two things a
  reviewer is actually looking for: where the structure is, and which sentences
  have a receipt behind them.

  So the body is parsed rather than printed. Section heads become headings, and
  every source marker becomes a citation chip carrying the trust level of the
  source it points at. That marker is the whole product argument made visible
  in the artefact itself, which is a better place for it than a paragraph on
  the marketing site.
*/

export type SourceRow = {
  id: string;
  label_en?: string;
  label_zh?: string;
  url?: string | null;
  publisher?: string | null;
  trust?: string;
};

/** Trust maps onto the same three state colours the rest of the product uses. */
const TRUST: Record<string, { dot: string; ink: string; ground: string }> = {
  high: {
    dot: "var(--ink-green-2)",
    ink: "var(--ink-green-3)",
    ground: "var(--surface-green-2)",
  },
  medium: {
    dot: "var(--ink-amber-2)",
    ink: "var(--ink-amber-3)",
    ground: "var(--surface-amber-2)",
  },
  low: {
    dot: "var(--ink-red-3)",
    ink: "var(--ink-red-4)",
    ground: "var(--surface-red-2)",
  },
};

const SECTION = /^【(.+?)】$/;
const MARKER = /\[([a-z0-9_]+)\]/gi;

type Block =
  | { kind: "head"; text: string }
  | { kind: "para"; text: string };

function parse(body: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of body.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    const head = line.match(SECTION);
    if (head) blocks.push({ kind: "head", text: head[1] });
    else blocks.push({ kind: "para", text: line });
  }
  return blocks;
}

export function ScriptReader({
  body,
  sources,
  lang,
}: {
  body: string;
  sources: SourceRow[];
  lang: Lang;
}) {
  const zh = lang === "zh";
  const t = (en: string, z: string) => (zh ? z : en);
  const [open, setOpen] = useState<string | null>(null);

  const byId = useMemo(() => {
    const m = new Map<string, SourceRow>();
    for (const s of sources ?? []) m.set(s.id, s);
    return m;
  }, [sources]);

  const blocks = useMemo(() => parse(body ?? ""), [body]);

  /* How many sentences in this draft actually carry a reference. */
  const cited = useMemo(() => {
    const ids = new Set<string>();
    for (const m of (body ?? "").matchAll(MARKER)) ids.add(m[1]);
    return [...ids].filter((id) => byId.has(id));
  }, [body, byId]);

  return (
    <div>
      {cited.length ? (
        <div
          className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--r)] px-3 py-2.5"
          style={{ background: "var(--surface-gray-1)" }}
        >
          <span className="t-xs" style={{ color: "var(--ink-gray-5)" }}>
            {t("Sources referenced in this draft", "本稿引用的来源")}
          </span>
          {cited.map((id) => {
            const s = byId.get(id)!;
            return <Cite key={id} id={id} source={s} lang={lang} inline={false} />;
          })}
        </div>
      ) : null}

      <div className="script-body">
        {blocks.map((b, i) =>
          b.kind === "head" ? (
            <h4
              key={i}
              className="t-sm mb-2 mt-6 font-medium first:mt-0"
              style={{ color: "var(--ink-gray-5)" }}
            >
              {b.text}
            </h4>
          ) : (
            <p
              key={i}
              className="mb-4 text-[15px] leading-[1.95]"
              style={{ color: "var(--ink-gray-8)" }}
            >
              <Marked
                text={b.text}
                byId={byId}
                lang={lang}
                open={open}
                setOpen={setOpen}
              />
            </p>
          ),
        )}
      </div>
    </div>
  );
}

/** Splits a paragraph on source markers and renders each one as a chip. */
function Marked({
  text,
  byId,
  lang,
  open,
  setOpen,
}: {
  text: string;
  byId: Map<string, SourceRow>;
  lang: Lang;
  open: string | null;
  setOpen: (v: string | null) => void;
}) {
  const out: React.ReactNode[] = [];
  let cursor = 0;
  let n = 0;

  for (const m of text.matchAll(MARKER)) {
    const at = m.index;
    const source = byId.get(m[1]);
    if (at > cursor) out.push(text.slice(cursor, at));
    /* An unknown id is left as written rather than silently deleted: a marker
       pointing at nothing is exactly the kind of thing a reviewer must see. */
    out.push(
      source ? (
        <Cite
          key={`${at}-${n++}`}
          id={m[1]}
          source={source}
          lang={lang}
          inline
          open={open === `${at}`}
          onToggle={() => setOpen(open === `${at}` ? null : `${at}`)}
        />
      ) : (
        <span
          key={`${at}-${n++}`}
          title="This marker does not match an approved source"
          className="mono mx-0.5 rounded-[3px] px-1 text-[11px]"
          style={{ background: "var(--surface-red-2)", color: "var(--ink-red-4)" }}
        >
          {m[1]}
        </span>
      ),
    );
    cursor = at + m[0].length;
  }
  if (cursor < text.length) out.push(text.slice(cursor));

  return (
    <>
      {out.map((node, i) => (
        <Fragment key={i}>{node}</Fragment>
      ))}
    </>
  );
}

/**
 * A citation. Inline it is a small chip that sits on the baseline without
 * disturbing the line it is in; expanded it shows what the source actually is
 * and where it came from.
 */
function Cite({
  id,
  source,
  lang,
  inline,
  open,
  onToggle,
}: {
  id: string;
  source: SourceRow;
  lang: Lang;
  inline: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const zh = lang === "zh";
  const label = (zh ? source.label_zh : source.label_en) || id;
  const tone = TRUST[source.trust ?? "medium"] ?? TRUST.medium;

  const chip = (
    <span
      className={clsx(
        "mono inline-flex max-w-[14rem] items-center gap-1 truncate rounded-[4px] align-baseline text-[11px] leading-none",
        inline ? "mx-1 px-1.5 py-[3px]" : "px-1.5 py-1",
      )}
      style={{ background: tone.ground, color: tone.ink }}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: tone.dot }}
      />
      <span className="truncate">{inline ? id : label}</span>
    </span>
  );

  if (!inline) return chip;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        title={label}
        className="press align-baseline"
      >
        {chip}
      </button>
      {open ? (
        <span
          role="dialog"
          className="app-rise absolute left-0 top-full z-20 mt-1 block w-[19rem] rounded-[var(--r)] p-3 text-left"
          style={{
            background: "var(--surface-modal)",
            boxShadow: "0 0 0 1px var(--outline-gray-2), var(--sh-lg)",
          }}
        >
          <span className="block text-[13.5px] font-medium leading-snug">
            {label}
          </span>
          <span
            className="mt-1 block text-[12.5px]"
            style={{ color: "var(--ink-gray-5)" }}
          >
            {source.publisher ? `${source.publisher} · ` : ""}
            {zh
              ? { high: "可信度高", medium: "可信度中", low: "可信度低" }[
                  source.trust ?? "medium"
                ]
              : `${source.trust ?? "medium"} trust`}
          </span>
          {source.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] underline underline-offset-2"
              style={{ color: "var(--ink-blue-3)" }}
            >
              <ExternalLink className="size-3 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="truncate">{source.url.replace(/^https?:\/\//, "")}</span>
            </a>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
