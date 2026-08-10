import type { Metadata } from "next";
import { Archivo, Big_Shoulders, Inter } from "next/font/google";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import "../globals.css";
import { brand } from "@/lib/brand";
import { LANGS, isLang, type Lang } from "@/lib/i18n";

/*
  Archivo carries the width axis, which is the whole reason it is here: one
  design narrowed for a signage plate and set normal for reading, the way
  DIN 1451 uses Engschrift and Mittelschrift. Big Shoulders is the display
  voice, drawn for civic wayfinding, with an optical size axis.
*/
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  axes: ["wdth"],
  display: "swap",
});

const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  variable: "--font-big-shoulders",
  axes: ["opsz"],
  display: "swap",
});

/* Inter is what Frappe's desk is set in, and the workspace follows it. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
      className={`${archivo.variable} ${bigShoulders.variable} ${inter.variable} ${notoSC.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        {/*
          THESIS: this product's value is what it refuses to do, so the page is a
          signalling diagram, not a hero over three feature cards.
          OWN-WORLD: vitreous enamel grey-green panel (light rendition: the same
          scheme plan printed on drafting paper), bone engraved track lines,
          Archivo's width axis as DIN-style signage lettering, Big Shoulders as
          display. Exactly three saturated colours exist, all signal aspects:
          red at danger, amber proving, green cleared. Nothing else is coloured.
          STORY: the visitor reads the eleven states as a signalled line, watches
          a route prove itself condition by condition, and understands the
          missing publish button as a boundary marker rather than a gap.
          FIRST VIEWPORT: full-bleed schematic of eleven blocks with numbered
          signal posts, headline set low and left over it, a route-call control,
          and the boundary marker standing before PUBLISHED_MANUALLY.
          FORM: signalling scheme plan plus interlocking table, candidate 5 of 7,
          seed key 07e3c3c2.
          FINISH: unreviewed and undocumented is unfinished; this build ends with
          the finish review, the verdict, and DESIGN.md
        */}
        {children}
      </body>
    </html>
  );
}
