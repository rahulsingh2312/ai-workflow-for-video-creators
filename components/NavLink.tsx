"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/clsx";

/**
 * A nav item.
 *
 * The active one is filled and the rest are not, which is the whole signal.
 * There is no indicator dot: a header that lights four lamps to tell you
 * which of four links you are on has spent colour on something the type was
 * already saying. Nothing moves on hover, only the ground under it, because a
 * link that shifts as the cursor arrives is a link that is harder to hit.
 */
export function NavLink({
  href,
  children,
  prefetch,
}: {
  href: string;
  children: React.ReactNode;
  /** Auth-gated routes always redirect, so prefetching them just 404s. */
  prefetch?: false;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      prefetch={prefetch}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex h-8 items-center whitespace-nowrap rounded-md px-3 text-[13.5px]",
        "[transition:background-color_160ms_var(--ease-out),color_160ms_var(--ease-out)]",
        active
          ? "bg-panel-raised font-medium text-bone"
          : "text-bone-dim hov:bg-panel-raised hov:text-bone",
      )}
    >
      {children}
    </Link>
  );
}
