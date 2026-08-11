import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import "../globals.css";
import { brand } from "@/lib/brand";
import { LANGS, isLang, type Lang } from "@/lib/i18n";

/*
  THREE VOICES, AND EACH ONE HAS A JOB.

  Geist speaks in the product's own voice: headlines, controls, interface. It
  is a neo-grotesque with flat terminals and a tall x-height, which is what
  lets a 72px headline and a 12px button label look like the same person
  talking.

  Newsreader is the editorial voice, and it exists here almost entirely for
  its italic. The italic is a true cursive cut, not a slanted roman, so it
  reads as a change of register rather than a change of angle: the site uses
  it wherever the page says something in its own words instead of the
  product's. Its optical-size axis means the same face can carry a 64px
  headline accent and a 15px aside without either one looking stretched.

  Geist Mono carries measurement: state enums, version numbers, timestamps,
  confidence scores, source IDs. Nothing decorative is ever set in it.
*/
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

/* Noto Sans SC, cut down to the glyphs this site actually sets. */
const notoSC = localFont({
  src: "../fonts/NotoSansSC-subset.woff2",
  variable: "--font-noto-sc",
  display: "swap",
  weight: "300 900",
});

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const zh = lang === "zh";
  const name = zh ? brand.nameZh : brand.nameEn;
  return {
    title: {
      default: `${name} · ${zh ? brand.taglineZh : brand.taglineEn}`,
      template: `%s · ${name}`,
    },
    description: zh
      ? "把选题带到锁定、核过事实的脚本，交给视频团队，再把人工发布需要的物料摆齐。没有发布按钮。"
      : "Carries a topic to a locked, fact-checked script, hands it to your video team, and lays out what your operator needs to publish by hand. No publish button.",
    other: { "color-scheme": "dark light" },
  };
}

/*
  Reads the stored panel-light preference before first paint so the page never
  flashes the wrong rendition. Defaults to the panel (dark), because the scene
  this product lives in is a controller's desk with the diagram lit.
*/
const themeScript = `(function(){try{var t=localStorage.getItem('tl-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const l = lang as Lang;

  return (
    <html
      lang={l === "zh" ? "zh-Hans" : "en"}
      data-theme="dark"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${newsreader.variable} ${notoSC.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        {/*
          THESIS: this product's value is what it refuses to do, and refusal is
          only credible when the record behind it is legible. So the site is
          built as a record: ink on a quiet ground, every claim carrying its
          reference, nothing decorative competing with the evidence.

          OWN-WORLD: near-black ink and warm paper. Geist for the product's
          voice, Newsreader italic wherever the page speaks in its own, Geist
          Mono for anything measured. Exactly three saturated colours exist and
          all three carry state: red at a stop, amber under review, green
          cleared. If it is coloured, it means something.

          STORY: the visitor sees the eleven states as a single line, watches a
          task prove itself condition by condition, and reads the missing
          publish button as the edge of the system's authority.

          FIRST VIEWPORT: one sentence set large, the line running beneath it,
          and the boundary standing where the product stops and a person starts.

          FINISH: unreviewed and undocumented is unfinished.
        */}
        {children}
      </body>
    </html>
  );
}
