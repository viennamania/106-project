import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Clapperboard,
  FileText,
  MessageCircleHeart,
  Newspaper,
  Sparkles,
  UserRound,
} from "lucide-react";

import { FanletterNewsCharacterProfileImageSlider } from "@/components/fanletter-news-character-motion";
import type { FanletterNewsReportDocument } from "@/lib/content";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  getFanletterNewsCharacterStats,
  hydrateFanletterNewsCharacterStats,
  type FanletterNewsCharacterStat,
} from "@/lib/fanletter-news-character-directory";
import { getFanletterNewsCharacterVlogsHref } from "@/lib/fanletter-news-vlog-routing";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import { getFanletterNewsReportsForCharacterDirectory } from "@/lib/fanletter-news-report-service";
import {
  getFanletterNewsArticleDisplayTitle,
  getFanletterNewsReportPreviewImageUrls,
} from "@/lib/fanletter-news-related";
import {
  normalizeFanletterReturnToPath,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

type FanletterNewsCutCharactersSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        backToCuts: "4컷 피드로 돌아가기",
        browse: "캐릭터 둘러보기",
        channelCta: "IP 채널",
        emptyBody: "4컷 피드에 연결할 AI 캐릭터 뉴스가 아직 없습니다.",
        emptyTitle: "아직 볼 캐릭터가 없습니다.",
        heroBody:
          "방금 보던 4컷 흐름에서 이어지는 AI 캐릭터를 빠르게 고르세요.",
        heroEyebrow: "AIAVpark News",
        heroTitle: "AI 캐릭터",
        ipScore: "IP 지수",
        latestNews: "최신 리포트",
        metaDescription:
          "4컷 피드에서 바로 이어지는 AIAVpark News AI 캐릭터 선택 화면입니다.",
        metaTitle: "4컷 피드 AI 캐릭터",
        news: "뉴스",
        openNews: "뉴스 보기",
        publicVlogs: "원본",
        reporters: "팬 기자",
        signal: {
          fanOnly: "팬 전용",
          news: "뉴스 반응",
          reporters: "팬 기자 활발",
          source: "원본 오픈",
          vlogs: "원본 공개",
        },
        vlogsCta: "원본 브이로그",
      }
    : {
        backToCuts: "Back to 4-cut feed",
        browse: "Browse characters",
        channelCta: "IP channel",
        emptyBody: "No AI characters are ready from the 4-cut feed yet.",
        emptyTitle: "No characters yet",
        heroBody:
          "Pick the AI character you want to continue from the 4-cut feed.",
        heroEyebrow: "AIAVpark News",
        heroTitle: "AI Characters",
        ipScore: "IP score",
        latestNews: "Latest report",
        metaDescription:
          "A focused AIAVpark News AI character picker connected to the 4-cut feed.",
        metaTitle: "4-cut feed AI characters",
        news: "News",
        openNews: "Open news",
        publicVlogs: "Sources",
        reporters: "Reporters",
        signal: {
          fanOnly: "Fan-only",
          news: "News buzz",
          reporters: "Reporter active",
          source: "Source open",
          vlogs: "Source live",
        },
        vlogsCta: "Source vlogs",
      };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getCharacterIpScore(character: FanletterNewsCharacterStat) {
  return (
    character.newsCount * 12 +
    character.reporterCount * 16 +
    character.publicCount * 6 +
    character.fanOnlyCount * 8 +
    character.publicVideoCount * 18 +
    character.sourceRevealUnlockedCount * 24
  );
}

function compareCharactersByIpScore(
  left: FanletterNewsCharacterStat,
  right: FanletterNewsCharacterStat,
) {
  return (
    getCharacterIpScore(right) - getCharacterIpScore(left) ||
    right.reporterCount - left.reporterCount ||
    right.newsCount - left.newsCount ||
    (right.latestReportAt?.getTime() ?? 0) - (left.latestReportAt?.getTime() ?? 0)
  );
}

function getCharacterSignalLabel(
  character: FanletterNewsCharacterStat,
  copy: ReturnType<typeof getCopy>,
) {
  if (character.sourceRevealUnlockedCount > 0) {
    return copy.signal.source;
  }

  if (character.reporterCount >= 3 || character.newsCount >= 8) {
    return copy.signal.reporters;
  }

  if (character.publicVideoCount > 0) {
    return copy.signal.vlogs;
  }

  if (character.fanOnlyCount > character.publicCount) {
    return copy.signal.fanOnly;
  }

  return copy.signal.news;
}

function getCharacterProfileImageUrls(character: FanletterNewsCharacterStat) {
  if (character.profileImageUrls.length > 0) {
    return character.profileImageUrls;
  }

  return character.avatarImageUrl ? [character.avatarImageUrl] : [];
}

function getUnoptimizedImageUrls(imageUrls: string[]) {
  return imageUrls.filter((imageUrl) =>
    shouldBypassFanletterImageOptimization(imageUrl),
  );
}

function getCharacterChannelHref({
  character,
  currentHref,
  locale,
  referralCode,
}: {
  character: FanletterNewsCharacterStat;
  currentHref: string;
  locale: Locale;
  referralCode: string | null;
}) {
  return setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/cuts/characters/${character.referralCode}`,
      referralCode ?? character.referralCode,
    ),
    {
      returnTo: currentHref,
    },
  );
}

function getCharacterVlogsHref({
  character,
  currentHref,
  locale,
  referralCode,
}: {
  character: FanletterNewsCharacterStat;
  currentHref: string;
  locale: Locale;
  referralCode: string | null;
}) {
  return setPathSearchParams(
    getFanletterNewsCharacterVlogsHref({
      creatorReferralCode: character.referralCode,
      locale,
      referralCode: referralCode ?? character.referralCode,
    }),
    {
      returnTo: currentHref,
    },
  );
}

function getReportHref({
  currentHref,
  locale,
  referralCode,
  report,
}: {
  currentHref: string;
  locale: Locale;
  referralCode: string | null;
  report: FanletterNewsReportDocument;
}) {
  return setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/cuts/${report.reportId}`,
      referralCode,
    ),
    {
      returnTo: currentHref,
    },
  );
}

function ReportImageFadeKeyframes() {
  return (
    <style id="fanletter-news-image-fade-keyframes">{`
      @keyframes fanletter-news-image-fade {
        0% {
          opacity: 0;
        }

        5%,
        20% {
          opacity: 1;
        }

        27%,
        100% {
          opacity: 0;
        }
      }
    `}</style>
  );
}

function CharacterAvatar({
  character,
  className,
  eager = false,
  sizes,
}: {
  character: FanletterNewsCharacterStat;
  className: string;
  eager?: boolean;
  sizes: string;
}) {
  const imageUrls = getCharacterProfileImageUrls(character);

  return (
    <div className={`relative overflow-hidden bg-[#111510] ${className}`}>
      {imageUrls.length > 0 ? (
        <FanletterNewsCharacterProfileImageSlider
          alt={character.name}
          autoRotate={false}
          imageClassName="h-full w-full object-cover"
          imageUrls={imageUrls}
          loading={eager ? "eager" : undefined}
          sizes={sizes}
          unoptimizedImageUrls={getUnoptimizedImageUrls(imageUrls)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[#44f26e]">
          <UserRound className="size-8" />
        </div>
      )}
    </div>
  );
}

function CharacterMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2">
      <p className="truncate text-[0.58rem] font-black uppercase tracking-[0.1em] text-white/36">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function CharacterCard({
  character,
  copy,
  currentHref,
  index,
  locale,
  referralCode,
}: {
  character: FanletterNewsCharacterStat;
  copy: ReturnType<typeof getCopy>;
  currentHref: string;
  index: number;
  locale: Locale;
  referralCode: string | null;
}) {
  const score = getCharacterIpScore(character);
  const channelHref = getCharacterChannelHref({
    character,
    currentHref,
    locale,
    referralCode,
  });
  const vlogsHref = getCharacterVlogsHref({
    character,
    currentHref,
    locale,
    referralCode,
  });
  const report = character.representativeReport;
  const reportImageUrls = getFanletterNewsReportPreviewImageUrls(report);
  const reportTitle = getFanletterNewsArticleDisplayTitle(report.title);
  const reportHref = getReportHref({
    currentHref,
    locale,
    referralCode,
    report,
  });
  const isLead = index === 0;

  return (
    <article
      className={
        isLead
          ? "overflow-hidden rounded-[1.35rem] border border-[#44f26e]/34 bg-[#06140a] shadow-[0_22px_70px_rgba(0,0,0,0.34)]"
          : "overflow-hidden rounded-[1.1rem] border border-white/10 bg-white/[0.055]"
      }
    >
      <Link
        className={`grid min-w-0 gap-3 !text-white ${
          isLead
            ? "grid-cols-[7.25rem_minmax(0,1fr)] p-3"
            : "grid-cols-[5.25rem_minmax(0,1fr)] p-2.5"
        }`}
        href={channelHref}
      >
        <div className="relative">
          <CharacterAvatar
            character={character}
            className={
              isLead
                ? "aspect-[4/5] rounded-2xl border border-white/12"
                : "aspect-square rounded-2xl border border-white/10"
            }
            eager={isLead}
            sizes={isLead ? "7.25rem" : "5.25rem"}
          />
          <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-[0.6rem] font-black text-[#111510]">
            {formatNumber(index + 1, locale)}
          </span>
        </div>
        <div className="min-w-0 self-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e]/12 px-2 py-1 text-[0.62rem] font-black text-[#9bffad]">
            <Sparkles className="size-3" />
            {getCharacterSignalLabel(character, copy)}
          </p>
          <h2
            className={`mt-2 truncate font-black tracking-normal ${
              isLead ? "text-3xl" : "text-xl"
            }`}
          >
            {character.name}
          </h2>
          <p className="mt-1 truncate text-[0.68rem] font-black uppercase tracking-[0.1em] text-white/42">
            @{character.referralCode}
          </p>
          <p className="mt-3 text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#44f26e]">
            {copy.ipScore}
          </p>
          <p className="text-2xl font-black leading-none text-white">
            {formatNumber(score, locale)}
          </p>
        </div>
      </Link>

      <div className="grid grid-cols-3 gap-2 px-3 pb-3">
        <CharacterMetric
          label={copy.news}
          value={formatNumber(character.newsCount, locale)}
        />
        <CharacterMetric
          label={copy.publicVlogs}
          value={formatNumber(character.publicVideoCount, locale)}
        />
        <CharacterMetric
          label={copy.reporters}
          value={formatNumber(character.reporterCount, locale)}
        />
      </div>

      <div className="border-t border-white/10 px-3 py-3">
        <Link
          className="grid grid-cols-[5.75rem_minmax(0,1fr)_auto] items-stretch gap-3 rounded-2xl border border-white/10 bg-black/24 p-2 !text-white transition hover:border-[#44f26e]/38 hover:bg-[#12301a]/42"
          href={reportHref}
        >
          <div className="relative aspect-[9/14] overflow-hidden rounded-xl bg-white/8">
            {reportImageUrls.length > 0 ? (
              <FanletterNewsCharacterProfileImageSlider
                alt={reportTitle}
                imageClassName="h-full w-full object-cover"
                imageUrls={reportImageUrls}
                intervalMs={2200}
                loading={isLead ? "eager" : undefined}
                pauseOnInteraction={false}
                sizes="5.75rem"
                transitionMode="css"
                unoptimizedImageUrls={getUnoptimizedImageUrls(reportImageUrls)}
              />
            ) : (
              <FileText className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-[#44f26e]" />
            )}
          </div>
          <div className="min-w-0 self-center py-2">
            <p className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
              {copy.latestNews}
            </p>
            <p className="mt-1 line-clamp-3 text-base font-black leading-tight [word-break:keep-all]">
              {reportTitle}
            </p>
          </div>
          <ChevronRight className="self-center size-4 text-white/44" />
        </Link>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[#44f26e] px-3 text-xs font-black !text-black"
            href={channelHref}
          >
            <MessageCircleHeart className="size-4" />
            {copy.channelCta}
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3 text-xs font-black !text-white"
            href={vlogsHref}
          >
            <Clapperboard className="size-4 text-[#44f26e]" />
            {copy.vlogsCta}
          </Link>
        </div>
      </div>
    </article>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const copy = getCopy(locale);

  return {
    title: `${copy.metaTitle} | AIAVpark News`,
    description: copy.metaDescription,
  };
}

export default async function LocalizedFanletterNewsCutCharactersPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsCutCharactersSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const cutsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/cuts`,
    referralCode,
  );
  const returnHref =
    normalizeFanletterReturnToPath(query.returnTo, locale) ?? cutsHref;
  const currentHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/cuts/characters`, referralCode),
    {
      returnTo: returnHref,
    },
  );
  const cookieStore = await cookies();
  const nsfwOptInEnabled = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );
  const allReports = await getFanletterNewsReportsForCharacterDirectory({ locale });
  const reports = nsfwOptInEnabled
    ? allReports
    : allReports.filter((report) => report.contentMaturityRating !== "nsfw");
  const hydratedCharacters = await hydrateFanletterNewsCharacterStats(
    getFanletterNewsCharacterStats(reports, reports.length, {
      sort: "discovery",
    }),
    { sort: "discovery" },
  );
  const characters = [...hydratedCharacters]
    .sort(compareCharactersByIpScore)
    .slice(0, 24);

  return (
    <main className="min-h-screen bg-[#050706] text-white">
      <ReportImageFadeKeyframes />
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-black shadow-[0_0_56px_rgba(0,0,0,0.42)] sm:border-x sm:border-white/10">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/78 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 text-xs font-black !text-white"
              href={returnHref}
            >
              <ArrowLeft className="size-4" />
              {copy.backToCuts}
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-black">
              <Sparkles className="size-3.5" />
              {copy.browse}
            </span>
          </div>
        </header>

        <section className="px-4 pb-[calc(6.8rem+env(safe-area-inset-bottom))] pt-5">
          <div className="rounded-[1.5rem] border border-[#44f26e]/20 bg-[#07110a] p-4">
            <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
              {copy.heroEyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-black leading-none tracking-normal">
              {copy.heroTitle}
            </h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/62 [word-break:keep-all]">
              {copy.heroBody}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <CharacterMetric
                label={copy.browse}
                value={formatNumber(characters.length, locale)}
              />
              <CharacterMetric
                label={copy.news}
                value={formatNumber(reports.length, locale)}
              />
              <CharacterMetric
                label={copy.publicVlogs}
                value={formatNumber(
                  characters.reduce(
                    (total, character) => total + character.publicVideoCount,
                    0,
                  ),
                  locale,
                )}
              />
            </div>
          </div>

          {characters.length > 0 ? (
            <div className="mt-4 space-y-3">
              {characters.map((character, index) => (
                <CharacterCard
                  character={character}
                  copy={copy}
                  currentHref={currentHref}
                  index={index}
                  key={character.referralCode}
                  locale={locale}
                  referralCode={referralCode}
                />
              ))}
            </div>
          ) : (
            <section className="mt-4 rounded-[1.25rem] border border-white/12 bg-white/[0.06] p-6 text-center">
              <Newspaper className="mx-auto size-10 text-[#44f26e]" />
              <h2 className="mt-3 text-xl font-black">{copy.emptyTitle}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
                {copy.emptyBody}
              </p>
            </section>
          )}
        </section>

        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] border-t border-white/10 bg-black/76 px-4 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-3 backdrop-blur-xl">
          <Link
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-black"
            href={returnHref}
          >
            <ArrowLeft className="size-4" />
            {copy.backToCuts}
          </Link>
        </div>
      </div>
    </main>
  );
}
