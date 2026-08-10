"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { Signal } from "@/components/Signal";

type Session = { name: string; roles: string[] } | null;

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

  /* Nothing until the answer is in, so the control never flips under the cursor. */
  if (!known) return <span className="w-[4.5rem]" aria-hidden />;

  if (!session) {
    return (
      <Link
        href={`/${lang}/login`}
        prefetch={false}
        className="plate flex items-center gap-2 rounded-sm border border-rule bg-panel-inset px-2.5 py-1 text-[10px] text-bone-dim transition-colors duration-150 hover:border-rule-strong hover:text-bone"
      >
        <Signal aspect="dark" size="xs" />
        {t("Sign in", "登录")}
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span
        className="plate hidden items-center gap-2 rounded-sm border border-rule bg-panel-inset px-2.5 py-1 text-[10px] text-bone-dim sm:flex"
        title={session.roles.join(", ")}
      >
        <Signal aspect="clear" size="xs" />
        {session.name}
      </span>
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="plate rounded-sm border border-rule bg-panel-inset px-2.5 py-1 text-[10px] text-bone-dim transition-colors duration-150 hover:border-rule-strong hover:text-bone disabled:opacity-50"
      >
        {busy ? t("Signing out", "退出中") : t("Sign out", "退出")}
      </button>
    </span>
  );
}
