import Link from "next/link";
import { brand } from "@/lib/brand";
import { FOOTER, NAV } from "@/content/copy";
import { tx, type Lang } from "@/lib/i18n";
import { Wordmark } from "@/components/SiteHeader";

/**
 * The title block. Every drawing has one in the corner: what the sheet is,
 * what it was drawn from, and what it deliberately does not show. It is the
 * honest place to put the things this product has not decided yet.
 */
function TitleBlockRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-rule py-3 sm:flex-row sm:gap-4">
      <dt className="plate w-40 shrink-0 text-[10px] text-bone-faint">{label}</dt>
      <dd className="text-[13px] leading-relaxed text-bone-dim">{children}</dd>
    </div>
  );
}

export function SiteFooter({ lang }: { lang: Lang }) {
  const zh = lang === "zh";

  return (
    <footer className="border-t border-rule-strong bg-panel-deep">
      <div className="mx-auto max-w-[88rem] px-4 py-12 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6 pb-8">
          <div>
            <Wordmark lang={lang} large />
            <p className="mt-2 max-w-md text-[13px] leading-relaxed text-bone-dim">
              {zh ? brand.taglineZh : brand.taglineEn}
            </p>
          </div>
          <nav aria-label={zh ? "页脚导航" : "Footer"}>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={`/${lang}${item.href}`}
                    prefetch={item.href === "/workspace" || item.href === "/login" ? false : undefined}
                    className="plate text-[11px] text-bone-dim underline-offset-4 transition-colors duration-150 hover:text-bone hover:underline"
                  >
                    {tx(item.label, lang)}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="/spec.md"
                  className="plate text-[11px] text-bone-dim underline-offset-4 transition-colors duration-150 hover:text-bone hover:underline"
                >
                  {tx(FOOTER.spec, lang)}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <dl className="border-b border-rule">
          <TitleBlockRow label={zh ? "依据" : "Drawn from"}>
            {tx(FOOTER.builtFrom, lang)}
          </TitleBlockRow>
          <TitleBlockRow label={zh ? "未标注" : "Not shown"}>
            {tx(FOOTER.honest, lang)}
          </TitleBlockRow>
          <TitleBlockRow label={zh ? "工作台" : "Workspace"}>
            {tx(FOOTER.demoNote, lang)}
          </TitleBlockRow>
          <TitleBlockRow label={zh ? "名称" : "Name"}>
            {zh
              ? `产品名尚未确定。“${brand.nameZh}”是占位名，改一个文件即可全站替换。`
              : `The product name is not settled. "${brand.nameEn}" is a placeholder, and changing one config file changes it everywhere.`}
          </TitleBlockRow>
        </dl>

      </div>
    </footer>
  );
}
