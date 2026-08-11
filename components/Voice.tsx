import { Fragment } from "react";

/*
  Emphasis belongs to the sentence, not to the component that happens to be
  rendering it. Copy files mark the emphasised span with *asterisks* and this
  turns it into an <em>, which the stylesheet sets in Newsreader italic.

  In Chinese the same marker resolves to a change of colour and weight rather
  than a slant, because a synthesised oblique on Han characters is a defect,
  not emphasis. That switch lives in globals.css under :lang(zh), so a
  translator only ever has to think about which words matter.
*/

const MARKED = /\*([^*]+)\*/g;

export function voiced(text: string) {
  if (!text.includes("*")) return text;

  const out: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(MARKED)) {
    const at = match.index;
    if (at > cursor) out.push(text.slice(cursor, at));
    out.push(<em key={at}>{match[1]}</em>);
    cursor = at + match[0].length;
  }
  if (cursor < text.length) out.push(text.slice(cursor));

  return out.map((node, i) => <Fragment key={i}>{node}</Fragment>);
}

/** The same thing as an element, for places that want to pass children. */
export function Voiced({ text }: { text: string }) {
  return <>{voiced(text)}</>;
}

/** Strips the markers, for `title`, `alt`, and metadata. */
export function plain(text: string) {
  return text.replace(MARKED, "$1");
}
