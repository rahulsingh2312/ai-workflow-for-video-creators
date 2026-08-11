"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { clsx } from "@/lib/clsx";

type Session = { name: string; roles: string[] } | null;

const control =
  "press flex h-8 shrink-0 items-center whitespace-nowrap rounded-md text-[13px] " +
  "[transition:background-color_160ms_var(--ease-out),border-color_160ms_var(--ease-out),color_160ms_var(--ease-out)]";

/**
 * Sign in / sign out, in the header on every page.
 *
 * The session is fetched from the client on purpose. Reading the cookie in the
 * root layout would make every marketing page dynamic, and those pages are the
 * same for everyone whether you are signed in or not.
 */
export function SessionControl({ lang }: { lang: Lang }) {
  const zh = lang === "zh";
  const t = (en: string, z: string) => (zh ? z : en);
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session>(null);
  const [known, setKnown] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/session")
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        setSession(d.session ?? null);
        setKnown(true);
      })
      .catch(() => live && setKnown(true));
    return () => {
      live = false;
    };
  }, [pathname]);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setSession(null);
      router.push(`/${lang}/login`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }, [lang, router]);

  /*
    A reserved box until the answer is in. Without it the header's right edge
    jumps once on every page load, which is the kind of movement nobody can
    name afterwards but everybody feels.
  */
  if (!known) return <span className="h-8 w-[5.25rem]" aria-hidden />;

  if (!session) {
    return (
      <Link
        href={`/${lang}/login`}
        prefetch={false}
        className={clsx(
          control,
          "group gap-1.5 bg-bone pl-3 pr-2.5 font-medium text-panel",
          "hov:bg-bone-dim",
        )}
      >
        {t("Sign in", "登录")}
        <ArrowRight
          className="size-3.5 shrink-0 [transition:transform_200ms_var(--ease-out)] group-hov:translate-x-0.5"
          strokeWidth={2}
          aria-hidden
        />
      </Link>
    );
  }

  const initials = session.name.slice(0, zh ? 1 : 2);

  return (
    <span className="flex items-center gap-1.5">
      <span
        className="hidden items-center gap-2 rounded-md border border-rule bg-panel-inset py-1 pl-1 pr-2.5 sm:flex"
        title={session.roles.join(", ")}
      >
        <span
          aria-hidden
          className="flex size-5 items-center justify-center rounded-[5px] bg-panel-raised text-[10px] font-medium uppercase leading-none text-bone-dim"
        >
          {initials}
        </span>
        <span className="text-[13px] leading-none text-bone">
          {session.name}
        </span>
      </span>
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className={clsx(
          control,
          "px-2.5 text-bone-dim disabled:opacity-50",
          "hov:bg-panel-raised",
          "hov:text-bone",
        )}
      >
        {busy ? t("Signing out", "退出中") : t("Sign out", "退出")}
      </button>
    </span>
  );
}
