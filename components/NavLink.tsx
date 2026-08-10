"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/clsx";

/**
 * A route indicator. The active link lights its lamp; the others sit dark on
 * the plate. Nothing here moves on hover except colour, because a signage
 * plate that jumps when you look at it is a broken signage plate.
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
        "plate group relative flex items-center gap-2 whitespace-nowrap rounded-sm px-2.5 py-1.5 text-[11px] transition-colors duration-150",
        active ? "text-bone" : "text-bone-dim hover:text-bone",
      )}
    >
      <span
        aria-hidden
        className={clsx(
          "lamp inline-block h-1.5 w-1.5 rounded-full",
          !active && "group-hover:opacity-70",
        )}
        style={
          active
            ? {
                backgroundColor: "var(--lamp-green)",
                boxShadow: "0 0 8px 1px var(--halo-green)",
              }
            : { backgroundColor: "var(--rule-strong)" }
        }
      />
      {children}
    </Link>
  );
}
