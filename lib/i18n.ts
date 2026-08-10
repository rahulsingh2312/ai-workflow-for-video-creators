export const LANGS = ["en", "zh"] as const;
export type Lang = (typeof LANGS)[number];

/** A string that exists in both languages. Kept adjacent so they stay in sync. */
export type L = { en: string; zh: string };

/** A list that exists in both languages. */
export type LL = { en: string[]; zh: string[] };

export function tx(value: L, lang: Lang): string {
  return value[lang];
}

export function txs(value: LL, lang: Lang): string[] {
  return value[lang];
}

export function isLang(v: string): v is Lang {
  return (LANGS as readonly string[]).includes(v);
}

export const LANG_LABEL: Record<Lang, string> = {
  en: "EN",
  zh: "中文",
};

/** Swap the language segment of a pathname, keeping the rest of the route. */
export function swapLangInPath(pathname: string, next: Lang): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return `/${next}`;
  if (isLang(parts[0])) {
    parts[0] = next;
    return `/${parts.join("/")}`;
  }
  return `/${next}/${parts.join("/")}`;
}
