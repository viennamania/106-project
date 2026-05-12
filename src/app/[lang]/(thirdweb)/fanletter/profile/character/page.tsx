import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ImageIcon,
  MessageCircleHeart,
  Sparkles,
  UserRound,
} from "lucide-react";

import { CreatorContentStudioPage } from "@/components/creator-content-studio-page";
import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import { getCreatorStudioDictionary } from "@/lib/creator-studio-dictionary";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";

function resolveReturnTo(
  locale: Locale,
  value: string | string[] | undefined,
) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    !candidate ||
    !candidate.startsWith(`/${locale}/`) ||
    candidate.startsWith("//")
  ) {
    return null;
  }

  return candidate;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";

  return {
    title:
      locale === "ko"
        ? "캐릭터 변경 | FanLetter"
        : "Change Character | FanLetter",
    description:
      locale === "ko"
        ? "FanLetter AI 캐릭터 페르소나와 대표 아바타를 전용 변경 화면에서 관리하세요."
        : "Manage the FanLetter AI character persona and representative avatar in a dedicated change screen.",
  };
}

export default async function LocalizedFanletterCharacterPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ ref?: string | string[]; returnTo?: string | string[] }>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const dictionary = getCreatorStudioDictionary(getDictionary(locale));
  const referralCode = normalizeReferralCode(
    Array.isArray(query.ref) ? query.ref[0] : query.ref,
  );
  const fallbackReturnTo = buildPathWithReferral(
    `/${locale}/fanletter/profile`,
    referralCode,
  );
  const returnToHref = resolveReturnTo(locale, query.returnTo) ?? fallbackReturnTo;
  const fanletterHomeHref = buildPathWithReferral(
    `/${locale}/fanletter`,
    referralCode,
  );
  const fanletterStudioHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/studio`, referralCode),
    { returnTo: returnToHref },
  );
  const fanletterProfileHref = setPathSearchParams(fallbackReturnTo, {
    returnTo: returnToHref,
  });
  const fanletterCharacterHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/profile/character`, referralCode),
    { returnTo: returnToHref },
  );
  const fanletterCreateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create`, referralCode),
    { returnTo: returnToHref },
  );
  const pageCopy =
    locale === "ko"
      ? {
          back: "이전으로",
          body:
            "FanLetter 캐릭터 정체성은 콘텐츠의 중심 자산입니다. 변경이 필요할 때만 이 전용 화면에서 현재 캐릭터, 새 페르소나, 아바타 세트를 확인한 뒤 저장합니다.",
          create: "브이로그 만들기",
          eyebrow: "FanLetter Character",
          home: "FanLetter 홈",
          steps: [
            {
              body: "현재 적용된 페르소나와 대표 아바타를 먼저 확인합니다.",
              icon: UserRound,
              title: "현재 캐릭터 확인",
            },
            {
              body: "새 분위기와 외형 기준을 정하고 후보를 비교합니다.",
              icon: Sparkles,
              title: "새 페르소나 선택",
            },
            {
              body: "표정 아바타 세트를 다시 만들고 대표 이미지를 저장합니다.",
              icon: ImageIcon,
              title: "아바타 세트 저장",
            },
          ],
          title: "캐릭터 정체성 변경",
        }
      : {
          back: "Back",
          body:
            "The FanLetter character identity is the core asset of the content channel. Change it only from this dedicated screen after reviewing the current character, new persona, and avatar set.",
          create: "Create vlog",
          eyebrow: "FanLetter Character",
          home: "FanLetter home",
          steps: [
            {
              body: "Review the current persona and representative avatar first.",
              icon: UserRound,
              title: "Review current character",
            },
            {
              body: "Choose a new mood and appearance direction, then compare candidates.",
              icon: Sparkles,
              title: "Choose new persona",
            },
            {
              body: "Regenerate expression avatars and save the representative image.",
              icon: ImageIcon,
              title: "Save avatar set",
            },
          ],
          title: "Change character identity",
        };

  return (
    <main className="min-h-screen bg-[#030504] text-white">
      <section className="px-4 pb-12 pt-[calc(env(safe-area-inset-top)+16px)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/[0.06] text-white transition hover:bg-white/10"
              href={returnToHref}
            >
              <ArrowLeft className="size-5" />
              <span className="sr-only">{pageCopy.back}</span>
            </Link>
            <Link className="flex min-w-0 items-center gap-2" href={fanletterHomeHref}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <MessageCircleHeart className="size-5" />
              </span>
              <span className="truncate text-xl font-semibold tracking-normal">
                FanLetter
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <FanletterGlobalLanguageSwitcher
                className="hidden lg:inline-flex"
                locale={locale}
              />
              <FanletterAccountStatusLink
                locale={locale}
                referralCode={referralCode}
              />
            </div>
          </header>

          <div className="mt-4 flex lg:hidden">
            <FanletterGlobalLanguageSwitcher compact locale={locale} />
          </div>

          <section className="grid gap-6 pb-8 pt-10 lg:grid-cols-[minmax(0,0.98fr)_minmax(22rem,0.72fr)] lg:items-end lg:pb-10 lg:pt-18">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#44f26e]">
                {pageCopy.eyebrow}
              </p>
              <h1 className="mt-4 max-w-4xl text-[2.35rem] font-semibold leading-[1.04] tracking-normal [word-break:keep-all] sm:text-[3.85rem] lg:text-[4.05rem]">
                {pageCopy.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/68 [word-break:keep-all] sm:text-lg">
                {pageCopy.body}
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold !text-black transition hover:bg-[#67ff88]"
                  href={fanletterCreateHref}
                >
                  {pageCopy.create}
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/16 px-5 text-sm font-semibold !text-white transition hover:bg-white/10"
                  href={fanletterHomeHref}
                >
                  {pageCopy.home}
                </Link>
              </div>
            </div>

            <aside className="grid gap-2 rounded-lg border border-white/12 bg-white/[0.055] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.3)] backdrop-blur-md sm:p-5">
              {pageCopy.steps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div
                    className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-white/10 bg-black/18 p-3"
                    key={step.title}
                  >
                    <span className="flex size-10 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/38">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <h2 className="mt-1 text-base font-semibold text-white">
                        {step.title}
                      </h2>
                      <p className="mt-1 text-xs font-medium leading-5 text-white/52">
                        {step.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </aside>
          </section>

          <section className="mt-2">
            <CreatorContentStudioPage
              characterHrefOverride={fanletterCharacterHref}
              dictionary={dictionary}
              homeHrefOverride={fanletterHomeHref}
              locale={locale}
              newPostHrefOverride={fanletterCreateHref}
              postsManagerHrefOverride={fanletterStudioHref}
              profileHrefOverride={fanletterProfileHref}
              referralCode={referralCode}
              returnToHref={returnToHref}
              salesManagerHrefOverride={fanletterStudioHref}
              shell="embedded"
              studioHomeHrefOverride={fanletterStudioHref}
              surface="fanletter"
              view="character"
            />
          </section>
        </div>
      </section>
    </main>
  );
}
