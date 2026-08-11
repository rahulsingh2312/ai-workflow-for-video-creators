import Link from "next/link";
import { brand } from "@/lib/brand";
import { NAV } from "@/content/copy";
import { tx, type Lang } from "@/lib/i18n";
import { LangToggle, PanelLight } from "@/components/Toggles";
import { NavLink } from "@/components/NavLink";
import { SessionControl } from "@/components/app/SessionControl";
import { clsx } from "@/lib/clsx";

/** These redirect depending on session, so they are never worth prefetching. */
const AUTH_ROUTES = new Set(["/workspace", "/login"]);

/**
 * The mark: a bar, a gap, and a shorter bar. The line this product runs, and
 * the part of it that belongs to a person. It is the whole argument at 20px,
 * and it is drawn rather than typed so it holds up at any size.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className ?? "size-5"}
      fill="currentColor"
    >
      <rect x="1" y="9.25" width="13.5" height="5.5" rx="2.75" />
      <rect
        x="17.5"
        y="9.25"
        width="5.5"
        height="5.5"
        rx="2.75"
        opacity="0.4"
      />
    </svg>
  );
}

export function Wordmark({
  lang,
  large = false,
}: {
  lang: Lang;
  large?: boolean;
}) {
  const name = lang === "zh" ? brand.nameZh : brand.nameEn;
  return (
    <span
      className={clsx(
        "inline-flex items-center",
        /* The mark ends in a rounded terminal, so the wordmark sits a hair
           closer than a flat edge would want. */
        large ? "gap-[9px]" : "gap-[7px]",
      )}
    >
      <Mark className={large ? "size-6" : "size-5"} />
      <span
        className={clsx(
          "font-medium",
          large
            ? "text-[22px] tracking-[-0.025em]"
            : "text-[17px] tracking-[-0.02em]",
        )}
      >
        {name}
      </span>
    </span>
  );
}

export function SiteHeader({ lang }: { lang: Lang }) {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-panel/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 w-full max-w-[84rem] items-center gap-3 px-5 sm:h-16 sm:px-8 lg:px-12">
        <Link
          href={`/${lang}`}
          className="shrink-0 rounded-md text-bone [transition:opacity_160ms_var(--ease-out)] hov:opacity-70"
        >
          <Wordmark lang={lang} />
          <span className="sr-only">{lang === "zh" ? "首页" : "Home"}</span>
        </Link>

        {/*
          On a wide screen the nav sits between the wordmark and the controls.
          Below `sm` there is not enough width for four labels plus a language
          switch plus a session control, and a flexible nav in that space
          collapses to nothing: the links were present in the DOM and zero
          pixels wide. So the small-screen nav moves to its own row instead,
          where it can scroll sideways under its own steam.
        */}
        <Nav lang={lang} className="hidden min-w-0 flex-1 sm:block" />

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:ml-0">
          <PanelLight lang={lang} />
          <LangToggle lang={lang} />
          <span
            aria-hidden
            className="mx-0.5 hidden h-5 w-px bg-rule sm:block"
          />
          <SessionControl lang={lang} />
        </div>
      </div>

      <Nav lang={lang} className="border-t border-rule px-5 py-1.5 sm:hidden" />
    </header>
  );
}

function Nav({ lang, className }: { lang: Lang; className?: string }) {
  return (
    <nav
      aria-label={lang === "zh" ? "主导航" : "Main"}
      className={clsx(
        "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <ul className="flex items-center gap-0.5 sm:justify-center">
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
  );
}
