import Link from "next/link";
import { brand } from "@/lib/brand";
import { NAV } from "@/content/copy";
import { tx, type Lang } from "@/lib/i18n";
import { LangToggle, PanelLight } from "@/components/Toggles";
import { NavLink } from "@/components/NavLink";
import { SessionControl } from "@/components/app/SessionControl";

/** These redirect depending on session, so they are never worth prefetching. */
const AUTH_ROUTES = new Set(["/workspace", "/login"]);

export function Wordmark({ lang, large = false }: { lang: Lang; large?: boolean }) {
  const name = lang === "zh" ? brand.nameZh : brand.nameEn;
  return (
    <span className="inline-flex items-baseline gap-2">
      {brand.code ? (
        <span
          aria-hidden
          className="plate rounded-[2px] border border-rule-strong px-1.5 py-[3px] text-[10px] leading-none text-bone-dim"
        >
          {brand.code}
        </span>
      ) : null}
      <span
        className={
          large
            ? "display text-2xl font-semibold tracking-tight"
            : "display text-lg font-semibold tracking-tight"
        }
      >
        {name}
      </span>
    </span>
  );
}

export function SiteHeader({ lang }: { lang: Lang }) {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-panel/95 backdrop-blur-[2px]">
      <div className="mx-auto flex max-w-[88rem] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-10">
        <Link
          href={`/${lang}`}
          className="rounded-sm text-bone transition-opacity duration-150 hover:opacity-80"
        >
          <Wordmark lang={lang} />
        </Link>

        <nav
          aria-label={lang === "zh" ? "主导航" : "Main"}
          className="order-3 -mx-4 w-full overflow-x-auto border-t border-rule px-4 py-2 sm:order-none sm:mx-0 sm:w-auto sm:border-0 sm:px-0 sm:py-0"
        >
          <ul className="flex items-center gap-1 sm:gap-0.5">
            {NAV.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={`/${lang}${item.href}`}
                  prefetch={AUTH_ROUTES.has(item.href) ? false : undefined}
                >
                  {tx(item.label, lang)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SessionControl lang={lang} />
          <LangToggle lang={lang} />
          <PanelLight lang={lang} />
        </div>
      </div>
    </header>
  );
}
