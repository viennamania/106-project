"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ReferralAwareCta({
  children,
  className,
  locale,
}: {
  children: ReactNode;
  className?: string;
  locale: Locale;
}) {
  const router = useRouter();
  const href = `/${locale}/activate`;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const queryString =
      typeof window === "undefined" ? "" : window.location.search;

    if (!queryString) {
      return;
    }

    const searchParams = new URLSearchParams(queryString);
    const ref = searchParams.get("ref")?.trim();

    if (!ref) {
      return;
    }

    event.preventDefault();
    router.push(`/${locale}/activate?ref=${encodeURIComponent(ref)}`);
  }

  return (
    <Link className={cn(className)} href={href} onClick={handleClick}>
      {children}
    </Link>
  );
}
