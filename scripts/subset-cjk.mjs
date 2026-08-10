#!/usr/bin/env node
/**
 * Subsets Noto Sans SC down to exactly the characters this site uses.
 *
 * The full variable face is 17MB, which is not a thing to send anyone over a
 * phone connection. Every Chinese string on this site lives in source, so the
 * glyph set is knowable at build time: scan the source, keep those glyphs,
 * throw the other 20,000 away.
 *
 * Run it after changing any Chinese copy:  npm run font:subset
 * Needs Python's fonttools with brotli:    pip install "fonttools[woff]"
 */

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "assets", "NotoSansSC.ttf");
const OUT_DIR = join(root, "app", "fonts");
const OUT = join(OUT_DIR, "NotoSansSC-subset.woff2");

const SCAN_DIRS = ["app", "components", "content", "lib"];
const SCAN_EXT = new Set([".ts", ".tsx", ".css", ".mjs"]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "fonts" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (SCAN_EXT.has(extname(entry))) files.push(full);
  }
  return files;
}

const chars = new Set();

// Always keep these, whatever the copy happens to contain today: digits and
// basic Latin appear inside Chinese sentences constantly, and the punctuation
// set is small enough that pinning it costs nothing.
for (const c of "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,:;!?()[]{}%/-_+=*#@&'\"") {
  chars.add(c);
}
// No em dash. It is banned from every string on this site, so the font that
// ships has no glyph for one either.
for (const c of "，。、；：？！（）《》「」【】…·～“”‘’％／　") chars.add(c);

let scanned = 0;
for (const dir of SCAN_DIRS) {
  let files;
  try {
    files = walk(join(root, dir));
  } catch {
    continue;
  }
  for (const file of files) {
    scanned++;
    for (const ch of readFileSync(file, "utf8")) {
      const cp = ch.codePointAt(0);
      // CJK ideographs, CJK punctuation, fullwidth forms, extension A.
      if (
        (cp >= 0x2e80 && cp <= 0x9fff) ||
        (cp >= 0x3400 && cp <= 0x4dbf) ||
        (cp >= 0xf900 && cp <= 0xfaff) ||
        (cp >= 0xfe30 && cp <= 0xfe4f) ||
        (cp >= 0xff00 && cp <= 0xffef)
      ) {
        chars.add(ch);
      }
    }
  }
}

const text = [...chars].sort().join("");
mkdirSync(OUT_DIR, { recursive: true });

const textFile = join(OUT_DIR, ".subset-charset.txt");
writeFileSync(textFile, text, "utf8");

execFileSync(
  "pyftsubset",
  [
    SRC,
    `--text-file=${textFile}`,
    "--output-file=" + OUT,
    "--flavor=woff2",
    "--layout-features=kern,liga,locl,palt",
    "--no-hinting",
    // The weight axis survives by default, which the display voice needs: the
    // Chinese headline runs at 800 and body at 400 out of the same file.
  ],
  { stdio: "inherit" },
);

const bytes = statSync(OUT).size;
console.log(
  `subset-cjk: ${chars.size} glyphs from ${scanned} source files -> ${(bytes / 1024).toFixed(0)}KB`,
);
