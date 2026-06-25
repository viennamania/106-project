import Link from "next/link";
import { Compass } from "lucide-react";

import type { Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

/**
 * Honest empty-state for signed-out visitors on member-centric pages
 * (growth, my-ai, …) so guests get a welcoming "start here" prompt instead of
 * mock portfolio data presented as their own.
 */
export function FanletterSignedOutGate({
  description,
  locale,
  referralCode,
  title,
}: {
  description: string;
  locale: Locale;
  referralCode: string | null;
  title: string;
}) {
  const discoveryHref = buildPathWithReferral(
    `/${locale}/fanletter/discovery`,
    referralCode,
  );
  const connectHref = buildPathWithReferral(
    `/${locale}/fanletter/connect`,
    referralCode,
  );

  return (
    <section className="mt-4 rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-[0_18px_54px_rgba(15,23,42,0.06)] sm:p-10">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-zinc-950 text-white">
        <Compass className="size-7" />
      </span>
      <h2 className="mx-auto mt-5 max-w-xl text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-zinc-600 [word-break:keep-all]">
        {description}
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
        <Link
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold !text-white transition hover:bg-zinc-800 sm:w-auto"
          href={discoveryHref}
        >
          {locale === "ko" ? "AI 스타 발견하기" : "Discover AI Stars"}
        </Link>
        <Link
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:text-black sm:w-auto"
          href={connectHref}
        >
          {locale === "ko" ? "계정 연결" : "Connect account"}
        </Link>
      </div>
    </section>
  );
}
