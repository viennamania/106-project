"use client";

import Link from "next/link";
import { Coins, House, LayoutGrid, PenSquare, UserRound } from "lucide-react";

import { getContentCopy } from "@/lib/content-copy";
import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { cn } from "@/lib/utils";

type CreatorStudioMobileNavItem = "hub" | "new" | "posts" | "profile" | "sales";

export function CreatorStudioMobileNav({
  active,
  locale,
  referralCode = null,
  returnToHref = null,
}: {
  active: CreatorStudioMobileNavItem;
  locale: Locale;
  referralCode?: string | null;
  returnToHref?: string | null;
}) {
  const contentCopy = getContentCopy(locale);
  const studioHomeHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio`, referralCode),
    { returnTo: returnToHref },
  );
  const newPostHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/new`, referralCode),
    { returnTo: returnToHref },
  );
  const postsManagerHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/posts`, referralCode),
    { returnTo: returnToHref },
  );
  const salesManagerHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/sales`, referralCode),
    { returnTo: returnToHref },
  );
  const profileHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/profile`, referralCode),
    { returnTo: returnToHref },
  );
  const items = [
    {
      href: studioHomeHref,
      icon: <House className="size-5" />,
      key: "hub" as const,
      label: locale === "ko" ? "홈" : "Home",
    },
    {
      href: postsManagerHref,
      icon: <LayoutGrid className="size-5" />,
      key: "posts" as const,
      label: locale === "ko" ? "게시물" : "Posts",
    },
    {
      href: newPostHref,
      icon: <PenSquare className="size-5" />,
      key: "new" as const,
      label: locale === "ko" ? "작성" : "Create",
    },
    {
      href: salesManagerHref,
      icon: <Coins className="size-5" />,
      key: "sales" as const,
      label: locale === "ko" ? "판매" : "Sales",
    },
    {
      href: profileHref,
      icon: <UserRound className="size-5" />,
      key: "profile" as const,
      label: locale === "ko" ? "설정" : "Profile",
    },
  ];

  return (
    <nav
      aria-label={contentCopy.page.studioTitle}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/94 px-3 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 shadow-[0_-18px_45px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:hidden"
    >
      <div className="mx-auto grid max-w-[470px] grid-cols-5 items-end gap-1">
        {items.map((item) => {
          const isActive = active === item.key;
          const isCreate = item.key === "new";

          return (
            <Link
              className={cn(
                "flex h-14 min-w-0 flex-col items-center justify-end gap-1 rounded-2xl px-1 pb-1 text-[0.7rem] font-semibold text-slate-600 transition",
                isActive && "text-slate-950",
                isCreate && "relative -mt-3 text-slate-950",
              )}
              href={item.href}
              key={item.key}
            >
              <span
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-full",
                  isActive && !isCreate && "bg-slate-100 text-slate-950",
                  isCreate &&
                    "size-12 bg-slate-950 text-white shadow-[0_16px_32px_rgba(15,23,42,0.24)]",
                )}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
