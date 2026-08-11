"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { LANGS, LANG_LABEL, swapLangInPath, type Lang } from "@/lib/i18n";
import { clsx } from "@/lib/clsx";

/**
 * Language. A segmented control, because there are exactly two and both of
 * them are first-class: a dropdown would imply one is the default and the
 * other is a translation.
 */
export function LangToggle({ lang }: { lang: Lang }) {
  const pathname = usePathname() ?? `/${lang}`;

  return (
    <div
      className="flex h-8 items-center rounded-md border border-rule bg-panel-inset p-[3px]"
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
              "flex h-full items-center rounded-[5px] px-2 text-[12px] leading-none",
              "[transition:background-color_160ms_var(--ease-out),color_160ms_var(--ease-out)]",
              active
                ? "bg-panel-raised font-medium text-bone"
                : "text-bone-faint hov:text-bone",
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
 * Ink or paper.
 *
 * Icon-only, because the label was never telling anyone anything the icon did
 * not. The two glyphs cross-fade in place rather than swapping: the crossfade
 * is masked with a small blur, which is what stops two overlapping shapes
 * from reading as two objects during the 200ms they share the box.
 */
export function PanelLight({ lang }: { lang: Lang }) {
  const theme = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.get,
    themeStore.getServer,
  );
  const dark = theme !== "light";

  const toggle = useCallback(() => {
    const value =
      document.documentElement.getAttribute("data-theme") === "light"
        ? "dark"
        : "light";
    document.documentElement.setAttribute("data-theme", value);
    try {
      localStorage.setItem("tl-theme", value);
    } catch {
      /* private mode, and the choice simply does not persist */
    }
    window.dispatchEvent(new Event("tl-theme"));
  }, []);

  const label = dark
    ? lang === "zh"
      ? "切换到浅色"
      : "Switch to light"
    : lang === "zh"
      ? "切换到深色"
      : "Switch to dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={clsx(
        "press relative flex size-8 items-center justify-center rounded-md text-bone-dim",
        "[transition:background-color_160ms_var(--ease-out),color_160ms_var(--ease-out)]",
        "hov:bg-panel-raised",
        "hov:text-bone",
      )}
    >
      <Glyph icon={Sun} shown={!dark} />
      <Glyph icon={Moon} shown={dark} />
    </button>
  );
}

function Glyph({ icon: Icon, shown }: { icon: typeof Sun; shown: boolean }) {
  return (
    <Icon
      aria-hidden
      strokeWidth={1.75}
      className={clsx(
        "absolute size-4",
        "[transition:opacity_200ms_var(--ease-out),transform_200ms_var(--ease-out),filter_200ms_var(--ease-out)]",
        shown
          ? "scale-100 opacity-100 blur-0"
          : "scale-[0.85] opacity-0 blur-[2px]",
      )}
    />
  );
}
