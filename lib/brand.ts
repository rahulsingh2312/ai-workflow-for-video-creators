/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BRAND CONFIG. This is the one file to edit when the product gets its real
 * name. Every surface on the site reads from here: the wordmark, the page
 * titles, the metadata, the demo workspace chrome, the copy interpolations.
 *
 * Nothing else in the codebase hardcodes the product name. Grep for the
 * string and you should only find it in this file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const brand = {
  /** English product name. Appears in the wordmark and all English copy. */
  nameEn: "Throughline",

  /** Chinese product name. Appears in the wordmark and all Chinese copy. */
  nameZh: "主线",

  /**
   * Short signal-post code stamped on the wordmark plate. Two to four
   * characters reads best. Set to "" to drop the plate entirely.
   */
  code: "TL",

  /**
   * Who makes it. Left blank on purpose: no company has been named, and the
   * site refuses to invent one. Fill it in and the footer picks it up.
   */
  company: "",

  /**
   * Where a visitor can reach a human. Blank until a real address exists.
   * The contact block reads honestly when this is empty rather than showing
   * a dead mailto.
   */
  contactEmail: "",

  /** Used for <title> and OG metadata. */
  taglineEn: "A workspace that will not publish for you",
  taglineZh: "一个不会替你发布的工作台",
} as const;

export type Brand = typeof brand;
