"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";
import { FOOTER } from "@/content/copy";
import { LANGS, LANG_LABEL, swapLangInPath, tx, type Lang } from "@/lib/i18n";
import { clsx } from "@/lib/clsx";

export function LangToggle({ lang }: { lang: Lang }) {
  const pathname = usePathname() ?? `/${lang}`;

  return (
    <div
      className="flex items-center rounded-sm border border-rule bg-panel-inset p-[2px]"
      role="group"
      aria-label={lang === "zh" ? "切换语言" : "Switch language"}
    >
      {LANGS.map((l) => {
        const active = l === lang;
        return (
          <Link
            key={l}
            href={swapLangInPath(pathname, l)}
            hrefLang={l === "zh" ? "zh-Hans" : "en"}
            /* The same route in the other language may be session-gated, and a
               prefetch of a redirecting route just 404s in the console. */
            prefetch={false}
            aria-current={active ? "true" : undefined}
            className={clsx(
              "plate rounded-[2px] px-2 py-1 text-[10px] transition-colors duration-150",
              active
                ? "bg-bone text-panel-deep"
                : "text-bone-dim hover:bg-panel-raised hover:text-bone",
            )}
          >
            {LANG_LABEL[l]}
          </Link>
        );
      })}
    </div>
  );
}

/*
  The document element is the source of truth for the theme: an inline script
  sets it before first paint so the page never flashes the wrong rendition.
  Reading it through an external store keeps React in step with that, instead of
  holding a second copy that starts out wrong and gets corrected after mount.
*/
const themeStore = {
  subscribe(onChange: () => void) {
    window.addEventListener("tl-theme", onChange);
    return () => window.removeEventListener("tl-theme", onChange);
  },
  get: () => document.documentElement.getAttribute("data-theme") ?? "dark",
  getServer: () => "dark",
};

/**
 * The panel light. Dark is the illuminated dispatch panel, light is the same
 * scheme plan printed on paper, so the control is a lamp switch rather than a
 * sun-and-moon icon.
 */
export function PanelLight({ lang }: { lang: Lang }) {
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.get, themeStore.getServer);
  const dark = theme !== "light";

  const toggle = useCallback(() => {
    const value = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", value);
    try {
      localStorage.setItem("tl-theme", value);
    } catch {
      /* private mode, and the choice simply does not persist */
    }
    window.dispatchEvent(new Event("tl-theme"));
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      className="group flex items-center gap-2 rounded-sm border border-rule bg-panel-inset px-2 py-1 transition-colors duration-150 hover:border-rule-strong"
    >
      <span className="plate text-[10px] text-bone-dim group-hover:text-bone">
        {tx(FOOTER.theme, lang)}
      </span>
      <span
        className="lamp inline-block h-2.5 w-2.5 rounded-full"
        style={
          dark
            ? {
                backgroundColor: "var(--lamp-amber)",
                boxShadow: "0 0 10px 2px var(--halo-amber)",
              }
            : {
                backgroundColor: "var(--panel-deep)",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4)",
              }
        }
      />
      <span className="sr-only">
        {dark ? tx(FOOTER.themeOn, lang) : tx(FOOTER.themeOff, lang)}
      </span>
    </button>
  );
}
