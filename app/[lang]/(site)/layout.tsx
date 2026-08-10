import { notFound } from "next/navigation";
import { isLang, type Lang } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

/** The marketing surface. Keeps the header, the footer, and The Interlocking. */
export default async function SiteLayout({
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
    <div className="min-h-dvh bg-panel text-bone">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-lamp-amber focus:px-4 focus:py-2 focus:font-medium focus:text-panel-deep"
      >
        {l === "zh" ? "跳到正文" : "Skip to content"}
      </a>
      <SiteHeader lang={l} />
      <main id="main">{children}</main>
      <SiteFooter lang={l} />
    </div>
  );
}
