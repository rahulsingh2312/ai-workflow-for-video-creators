import Link from "next/link";
import { brand } from "@/lib/brand";
import { FOOTER, NAV } from "@/content/copy";
import { tx, type Lang } from "@/lib/i18n";
import { Wordmark } from "@/components/SiteHeader";
import { Shell } from "@/components/Section";
import { Label } from "@/components/Kit";

/**
 * The colophon.
 *
 * Every drawing has one in the corner: what the sheet is, what it was drawn
 * from, and what it deliberately does not show. It is the honest place to put
 * the things this product has not decided yet, and on a site whose argument is
 * "we keep receipts", leaving it out would be the one real lie on the page.
 */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 border-t border-rule py-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8">
      <dt>
        <Label>{label}</Label>
      </dt>
      <dd className="max-w-[68ch] text-[14px] leading-relaxed text-bone-dim">
        {children}
      </dd>
    </div>
  );
}

const footerLink =
  "text-[13.5px] text-bone-dim underline-offset-4 " +
  "[transition:color_160ms_var(--ease-out)] " +
  "hov:text-bone " +
  "hov:underline";

export function SiteFooter({ lang }: { lang: Lang }) {
  const zh = lang === "zh";

  return (
    <footer className="border-t border-rule bg-panel-deep">
      <Shell className="py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-8 pb-12">
          <div>
            <Wordmark lang={lang} large />
            <p className="lede mt-3 max-w-md text-[16px] text-bone-dim">
              {zh ? brand.taglineZh : brand.taglineEn}
            </p>
          </div>
          <nav aria-label={zh ? "页脚导航" : "Footer"}>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={`/${lang}${item.href}`}
                    prefetch={
                      item.href === "/workspace" || item.href === "/login"
                        ? false
                        : undefined
                    }
                    className={footerLink}
                  >
                    {tx(item.label, lang)}
                  </Link>
                </li>
              ))}
              <li>
                <a href="/spec.md" className={footerLink}>
                  {tx(FOOTER.spec, lang)}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <dl className="border-b border-rule">
          <Row label={zh ? "依据" : "Drawn from"}>
            {tx(FOOTER.builtFrom, lang)}
          </Row>
          <Row label={zh ? "未标注" : "Not shown"}>
            {tx(FOOTER.honest, lang)}
          </Row>
          <Row label={zh ? "工作台" : "Workspace"}>
            {tx(FOOTER.demoNote, lang)}
          </Row>
          <Row label={zh ? "名称" : "Name"}>
            {zh
              ? `产品名尚未确定。“${brand.nameZh}”是占位名，改一个文件即可全站替换。`
              : `The product name is not settled. "${brand.nameEn}" is a placeholder, and changing one config file changes it everywhere.`}
          </Row>
        </dl>
      </Shell>
    </footer>
  );
}
