import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Crown,
  FileText,
  Flame,
  MessageCircleHeart,
  Newspaper,
  PenLine,
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react";

import {
  FanletterNewsCharacterProfileImageSlider,
  FanletterNewsCharacterProfileMarquee,
  FanletterNewsCountUp,
  type FanletterNewsCharacterProfileMarqueeItem,
} from "@/components/fanletter-news-character-motion";
import { FanletterNsfwOptInControl } from "@/components/fanletter-nsfw-opt-in-control";
import type { FanletterNewsReportDocument } from "@/lib/content";
import {
  getFanletterNewsCharacterStats,
  hydrateFanletterNewsCharacterStats,
  type FanletterNewsCharacterStat,
} from "@/lib/fanletter-news-character-directory";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import { getFanletterNewsReportsForCharacterDirectory } from "@/lib/fanletter-news-report-service";
import {
  getFanletterNewsArticleDisplayTitle as getArticleDisplayTitle,
} from "@/lib/fanletter-news-related";
import { getFanletterNewsCharacterVlogsHref } from "@/lib/fanletter-news-vlog-routing";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  getFanletterNsfwCopy,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

type FanletterNewsCharactersSearchParams = {
  ref?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        access: {
          nsfw: "성인 팬 전용",
          paid: "팬 전용",
          public: "공개",
        },
        allNews: "뉴스 홈",
        characterCta: "IP 채널 보기",
        dek:
          "뉴스, 원본 공개 브이로그, 원본 오픈 반응으로 검증되는 AI 캐릭터 IP를 한눈에 비교합니다. 마음에 드는 캐릭터를 발견하고 채널, 원본 영상, 최신 리포트로 바로 이어가세요.",
        emptyBody:
          "콘텐츠 상세 페이지에서 AI 리포트를 생성하면 뉴스에 등장한 캐릭터 목록이 이곳에 모입니다.",
        emptyTitle: "아직 뉴스에 등장한 AI 캐릭터가 없습니다.",
        exploreVlogs: "원본 브이로그 보기",
        faceArena: "오늘의 IP 얼굴",
        faceArenaDek:
          "이름과 얼굴이 바로 기억되는 캐릭터가 더 오래 소비됩니다.",
        fanOnly: "팬 전용 뉴스",
        heroLineupDek:
          "상위 캐릭터의 얼굴, IP 지수, 현재 신호를 같은 화면에서 바로 비교합니다.",
        heroLineupTitle: "오늘의 경쟁 라인업",
        heroEyebrow: "AI Character IP Arena",
        heroQuickLinks: {
          channel: "1위 채널",
          news: "대표 뉴스",
          title: "바로 이어가기",
          vlogs: "원본 브이로그",
        },
        heroSignals: {
          reporters: "팬 기자 커버리지",
          sourceOpened: "원본 오픈 검증",
          title: "검증 신호",
          vlogs: "브이로그 운영",
        },
        ipScore: "IP 지수",
        latest: "대표 뉴스",
        leadDeck:
          "뉴스룸 반응과 브이로그 운영 신호를 기준으로 오늘 가장 돋보이는 AI 캐릭터 IP입니다.",
        navItems: ["뉴스 홈", "AI 캐릭터", "팬 기자", "원본 브이로그", "구매함"],
        news: "뉴스",
        nsfw: "NSFW",
        nsfwControl: {
          disabledBody:
            "NSFW 뉴스 캐릭터는 목록에 유지하되 대표 커버와 뉴스 미리보기를 블러 처리합니다. 켜면 선명하게 표시됩니다.",
          disabledTitle: "NSFW 캐릭터 뉴스 블러",
          enabledBody:
            "NSFW 캐릭터 뉴스가 선명하게 표시됩니다. 끄면 다시 커버와 뉴스 미리보기가 블러 처리됩니다.",
          enabledTitle: "NSFW 캐릭터 뉴스 표시 중",
          hiddenCountText: (count: string) =>
            `블러 처리된 NSFW 뉴스 ${count}개`,
        },
        openNews: "최신 뉴스 보기",
        profileRailLabel: "AI 캐릭터 프로필 순환",
        publicNews: "공개 뉴스",
        ranking: "캐릭터 IP 랭킹",
        rankingDek:
          "뉴스 등장 빈도, 팬 기자 커버리지, 공개 브이로그 운영, 팬의 원본 오픈 반응을 함께 반영한 경쟁 지표입니다.",
        rankLabel: (rank: number) => `${rank}위`,
        reportLabel: "대표 리포트",
        reporters: "팬 기자",
        spotlightFace: "캐릭터 페이스",
        signal: {
          fanOnly: "팬 전용 수요",
          news: "뉴스 반응 상승",
          reporters: "팬 기자 커버리지",
          source: "원본 오픈 검증",
          vlogs: "브이로그 운영 중",
        },
        sourceOpened: "원본 오픈",
        siteName: "FanLetter News",
        stats: {
          characters: "등장 캐릭터",
          fanOnly: "팬 전용",
          news: "전체 뉴스",
          nsfw: "NSFW",
        },
        title: "AI 캐릭터 IP 쇼케이스",
        topDesk: "IP 스포트라이트",
        videos: "원본 브이로그",
      }
    : {
        access: {
          nsfw: "Adult fan-only",
          paid: "Fan-only",
          public: "Public",
        },
        allNews: "News Home",
        characterCta: "View IP channel",
        dek:
          "Compare AI character IP proven by news coverage, source public vlogs, and source-open reactions. Find the character that stands out, then continue into the channel, source videos, and latest reports.",
        emptyBody:
          "Create AI reports from content detail pages and the characters appearing in FanLetter News will collect here.",
        emptyTitle: "No AI characters have appeared in the news yet.",
        exploreVlogs: "View source vlogs",
        faceArena: "Today's IP faces",
        faceArenaDek:
          "Characters with memorable faces and names are easier to follow.",
        fanOnly: "Fan-only news",
        heroLineupDek:
          "Compare the leading faces, IP scores, and current signals in one view.",
        heroLineupTitle: "Today's competitive lineup",
        heroEyebrow: "AI Character IP Arena",
        heroQuickLinks: {
          channel: "No. 1 channel",
          news: "Lead report",
          title: "Continue",
          vlogs: "Source vlogs",
        },
        heroSignals: {
          reporters: "Fan reporter coverage",
          sourceOpened: "Source-open proven",
          title: "Proof signals",
          vlogs: "Vlog activity",
        },
        ipScore: "IP score",
        latest: "Lead report",
        leadDeck:
          "The AI character IP standing out today by newsroom momentum and vlog activity.",
        navItems: [
          "News home",
          "AI characters",
          "Fan reporters",
          "Source vlogs",
          "Purchases",
        ],
        news: "News",
        nsfw: "NSFW",
        nsfwControl: {
          disabledBody:
            "NSFW news characters remain listed, with lead covers and news previews blurred until opt-in.",
          disabledTitle: "NSFW character news blurred",
          enabledBody:
            "NSFW character news is visible. Turn this off to blur covers and news previews again.",
          enabledTitle: "NSFW character news visible",
          hiddenCountText: (count: string) => `${count} NSFW news items blurred`,
        },
        openNews: "Read latest news",
        profileRailLabel: "AI character profile reel",
        publicNews: "Public news",
        ranking: "Character IP ranking",
        rankingDek:
          "A competition signal built from news appearances, fan reporter coverage, public vlog activity, and source-open reactions.",
        rankLabel: (rank: number) => `No. ${rank}`,
        reportLabel: "Lead report",
        reporters: "Fan reporters",
        spotlightFace: "Character face",
        signal: {
          fanOnly: "Fan-only demand",
          news: "News momentum",
          reporters: "Fan reporter coverage",
          source: "Source-open proven",
          vlogs: "Vlog active",
        },
        sourceOpened: "Source open",
        siteName: "FanLetter News",
        stats: {
          characters: "Characters",
          fanOnly: "Fan-only",
          news: "News",
          nsfw: "NSFW",
        },
        title: "AI Character IP Showcase",
        topDesk: "IP Spotlight",
        videos: "Source vlogs",
      };
}

function formatDate(value: Date | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(value);
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getReportHref(
  report: FanletterNewsReportDocument,
  referralCode: string | null,
) {
  return buildPathWithReferral(
    `/${report.locale}/fanletter/news/${report.reportId}`,
    referralCode,
  );
}

function getCharacterChannelHref({
  characterReferralCode,
  locale,
  referralCode,
}: {
  characterReferralCode: string;
  locale: Locale;
  referralCode: string | null;
}) {
  return buildPathWithReferral(
    `/${locale}/fanletter/news/characters/${characterReferralCode}`,
    referralCode ?? characterReferralCode,
  );
}

function getCharacterVlogsHref({
  characterReferralCode,
  locale,
  referralCode,
}: {
  characterReferralCode: string;
  locale: Locale;
  referralCode: string | null;
}) {
  return getFanletterNewsCharacterVlogsHref({
    creatorReferralCode: characterReferralCode,
    locale,
    referralCode: referralCode ?? characterReferralCode,
  });
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
    (right.latestReportAt?.getTime() ?? 0) -
      (left.latestReportAt?.getTime() ?? 0)
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

function getUnoptimizedCharacterProfileImageUrls(imageUrls: string[]) {
  return imageUrls.filter((imageUrl) =>
    shouldBypassFanletterImageOptimization(imageUrl),
  );
}

function getAccessLabel(
  report: FanletterNewsReportDocument,
  copy: ReturnType<typeof getCopy>,
) {
  if (report.contentMaturityRating === "nsfw") {
    return copy.access.nsfw;
  }

  return report.priceType === "paid" ? copy.access.paid : copy.access.public;
}

function isNsfwReport(report: FanletterNewsReportDocument) {
  return report.contentMaturityRating === "nsfw";
}

function shouldBlurReport(
  report: FanletterNewsReportDocument,
  nsfwOptInEnabled: boolean,
) {
  return isNsfwReport(report) && !nsfwOptInEnabled;
}

function NewsCharactersMasthead({
  charactersHref,
  copy,
  newsHomeHref,
  purchasesHref,
}: {
  charactersHref: string;
  copy: ReturnType<typeof getCopy>;
  newsHomeHref: string;
  purchasesHref: string;
}) {
  const navHrefs = [
    newsHomeHref,
    charactersHref,
    `${newsHomeHref}#fan-reporters`,
    `${newsHomeHref}#latest-news`,
    purchasesHref,
  ];

  return (
    <header className="border-b border-black/16 bg-white text-[#111510]">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 border-b-2 border-[#111510] pb-3">
          <Link
            className="inline-flex items-center text-[2.25rem] font-black leading-none tracking-normal !text-[#111510] sm:text-[4.5rem]"
            href={newsHomeHref}
          >
            {copy.siteName}
          </Link>
          <span className="hidden shrink-0 border border-black/16 px-3 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e] sm:inline-flex">
            {copy.heroEyebrow}
          </span>
        </div>
        <nav
          aria-label={copy.siteName}
          className="flex gap-5 overflow-x-auto border-b border-black/10 py-3"
        >
          {copy.navItems.map((item, index) => (
            <Link
              className={`shrink-0 text-[0.76rem] font-black uppercase tracking-[0.12em] transition ${
                index === 1 ? "text-[#16702e]" : "text-black/58 hover:text-[#16702e]"
              }`}
              href={navHrefs[index] ?? newsHomeHref}
              key={item}
            >
              {item}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function NewsCharacterImage({
  blurred,
  eager = false,
  report,
  sizes,
}: {
  blurred: boolean;
  eager?: boolean;
  report: FanletterNewsReportDocument;
  sizes: string;
}) {
  const nsfwCopy = getFanletterNsfwCopy(report.locale);

  return (
    <div className="relative h-full min-h-[13rem] overflow-hidden bg-[#111510]">
      {report.coverImageUrl ? (
        <Image
          alt=""
          aria-hidden="true"
          className={
            blurred
              ? "scale-[1.06] object-cover blur-md brightness-[0.68] saturate-[0.86]"
              : "object-cover"
          }
          fill
          loading={eager ? "eager" : undefined}
          sizes={sizes}
          src={report.coverImageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(
            report.coverImageUrl,
          )}
        />
      ) : (
        <div className="flex h-full min-h-[13rem] w-full items-center justify-center bg-[linear-gradient(145deg,#07100b,#111510_52%,#24372a)] text-[#44f26e]">
          <Newspaper className="size-14" />
        </div>
      )}
      {blurred ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/34 p-3 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-black/62 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white">
            <AlertTriangle className="size-3.5 text-rose-300" />
            {nsfwCopy.badge}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function NewsCharacterAvatar({
  character,
  className = "size-16",
  sizes = "4rem",
}: {
  character: FanletterNewsCharacterStat;
  className?: string;
  sizes?: string;
}) {
  const imageUrls = getCharacterProfileImageUrls(character);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-black/10 bg-[#111510] ${className}`}
    >
      {imageUrls.length > 0 ? (
        <FanletterNewsCharacterProfileImageSlider
          alt={character.name}
          imageClassName="h-full w-full object-cover"
          imageUrls={imageUrls}
          sizes={sizes}
          unoptimizedImageUrls={getUnoptimizedCharacterProfileImageUrls(
            imageUrls,
          )}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/72">
          <UserRound className="size-8" />
        </div>
      )}
    </div>
  );
}

function NewsCharacterPortrait({
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
          imageClassName="h-full w-full object-cover"
          imageUrls={imageUrls}
          loading={eager ? "eager" : undefined}
          sizes={sizes}
          unoptimizedImageUrls={getUnoptimizedCharacterProfileImageUrls(
            imageUrls,
          )}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/72">
          <UserRound className="size-12" />
        </div>
      )}
    </div>
  );
}

function CharacterPodiumCard({
  character,
  copy,
  locale,
  rank,
  referralCode,
}: {
  character: FanletterNewsCharacterStat;
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  rank: number;
  referralCode: string | null;
}) {
  const channelHref = getCharacterChannelHref({
    characterReferralCode: character.referralCode,
    locale,
    referralCode,
  });
  const accentClass =
    rank === 1
      ? "border-[#44f26e]/70 bg-[#44f26e]/12"
      : rank === 2
        ? "border-[#b88cff]/42 bg-[#f1e8ff]/10"
        : "border-[#ffcf4a]/38 bg-[#ffcf4a]/10";
  const isLeadRank = rank === 1;
  const layoutClass = isLeadRank
    ? "sm:grid-cols-1"
    : "sm:grid-cols-1 lg:grid-cols-[5.5rem_1fr]";
  const portraitClass = isLeadRank
    ? "aspect-[4/5] w-full border border-white/16"
    : "aspect-[4/5] w-full border border-white/16 lg:aspect-square";
  const portraitSizes = isLeadRank
    ? "(max-width: 640px) 5.5rem, 12rem"
    : "(max-width: 640px) 5.5rem, (max-width: 1024px) 12rem, 5.5rem";
  const titleClass = isLeadRank
    ? "text-xl sm:text-2xl"
    : "text-xl sm:text-2xl lg:text-xl xl:text-2xl";

  return (
    <Link
      className={`group grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 border p-3 transition hover:-translate-y-0.5 hover:bg-white/[0.11] ${layoutClass} ${accentClass}`}
      href={channelHref}
    >
      <div className="relative">
        <NewsCharacterPortrait
          character={character}
          className={portraitClass}
          eager={rank === 1}
          sizes={portraitSizes}
        />
        <span className="absolute left-2 top-2 bg-white px-2 py-1 text-[0.62rem] font-black text-[#111510] shadow-[0_8px_20px_rgba(0,0,0,0.22)]">
          {copy.rankLabel(rank)}
        </span>
      </div>
      <div className="min-w-0 self-end">
        <p className={`truncate font-black leading-tight text-white ${titleClass}`}>
          {character.name}
        </p>
        <p className="mt-1 truncate text-[0.62rem] font-black uppercase tracking-[0.1em] text-white/44">
          @{character.referralCode}
        </p>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
              {copy.ipScore}
            </p>
            <FanletterNewsCountUp
              className="mt-0.5 block text-2xl font-black leading-none text-white"
              locale={locale}
              value={getCharacterIpScore(character)}
            />
          </div>
          <span className="max-w-[7.5rem] truncate border border-white/14 bg-black/24 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.08em] text-white/58">
            {getCharacterSignalLabel(character, copy)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function CharacterHeroArenaPanel({
  characters,
  copy,
  locale,
  newsHomeHref,
  referralCode,
  topCharacters,
}: {
  characters: FanletterNewsCharacterStat[];
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  newsHomeHref: string;
  referralCode: string | null;
  topCharacters: FanletterNewsCharacterStat[];
}) {
  const leadCharacter = topCharacters[0];

  if (!leadCharacter) {
    return null;
  }

  const leadChannelHref = getCharacterChannelHref({
    characterReferralCode: leadCharacter.referralCode,
    locale,
    referralCode,
  });
  const leadVlogsHref = getCharacterVlogsHref({
    characterReferralCode: leadCharacter.referralCode,
    locale,
    referralCode,
  });
  const signalStats = [
    {
      icon: <PenLine className="size-4" />,
      label: copy.heroSignals.reporters,
      value: characters.reduce(
        (total, character) => total + character.reporterCount,
        0,
      ),
    },
    {
      icon: <CheckCircle2 className="size-4" />,
      label: copy.heroSignals.sourceOpened,
      value: characters.reduce(
        (total, character) => total + character.sourceRevealUnlockedCount,
        0,
      ),
    },
    {
      icon: <Clapperboard className="size-4" />,
      label: copy.heroSignals.vlogs,
      value: characters.reduce(
        (total, character) => total + character.publicVideoCount,
        0,
      ),
    },
  ];
  const quickLinks = [
    {
      href: leadChannelHref,
      icon: <MessageCircleHeart className="size-4" />,
      label: copy.heroQuickLinks.channel,
    },
    {
      href: leadVlogsHref,
      icon: <Clapperboard className="size-4" />,
      label: copy.heroQuickLinks.vlogs,
    },
    {
      href: getReportHref(leadCharacter.representativeReport, referralCode),
      icon: <Newspaper className="size-4" />,
      label: copy.heroQuickLinks.news,
    },
  ];

  return (
    <section className="mt-6 hidden gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 border border-white/12 bg-white/[0.045] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#44f26e]">
              {copy.heroLineupTitle}
            </p>
            <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-white/52">
              {copy.heroLineupDek}
            </p>
          </div>
          <Trophy className="size-5 shrink-0 text-[#ffcf4a]" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {topCharacters.map((character, index) => {
            const channelHref = getCharacterChannelHref({
              characterReferralCode: character.referralCode,
              locale,
              referralCode,
            });

            return (
              <Link
                className="group relative block min-w-0 overflow-hidden border border-white/12 bg-[#07100b] transition hover:-translate-y-0.5 hover:border-[#44f26e]/70"
                href={channelHref}
                key={character.referralCode}
              >
                <NewsCharacterPortrait
                  character={character}
                  className="h-56 w-full xl:h-64"
                  eager={index === 0}
                  sizes="(max-width: 1280px) 14rem, 18rem"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/16 to-transparent" />
                <span className="absolute left-2 top-2 bg-white px-2 py-1 text-[0.58rem] font-black text-[#111510]">
                  {copy.rankLabel(index + 1)}
                </span>
                <div className="absolute inset-x-0 bottom-0 min-w-0 p-3">
                  <p className="truncate text-lg font-black leading-tight text-white">
                    {character.name}
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[0.54rem] font-black uppercase tracking-[0.1em] text-[#44f26e]">
                        {copy.ipScore}
                      </p>
                      <FanletterNewsCountUp
                        className="mt-0.5 block text-xl font-black leading-none text-white"
                        durationMs={760}
                        locale={locale}
                        value={getCharacterIpScore(character)}
                      />
                    </div>
                    <span className="max-w-[6.75rem] truncate border border-white/14 bg-white/[0.08] px-2 py-1 text-[0.56rem] font-black uppercase tracking-[0.08em] text-white/62">
                      {getCharacterSignalLabel(character, copy)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex min-w-0 flex-col border border-[#44f26e]/24 bg-[#44f26e]/[0.08] p-4">
        <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#44f26e]">
          {copy.heroSignals.title}
        </p>
        <div className="mt-3 grid gap-2">
          {signalStats.map((stat) => (
            <div
              className="flex items-center justify-between gap-3 border border-white/12 bg-black/16 px-3 py-2.5"
              key={stat.label}
            >
              <div className="min-w-0">
                <p className="truncate text-[0.58rem] font-black uppercase tracking-[0.08em] text-white/52">
                  {stat.label}
                </p>
                <FanletterNewsCountUp
                  className="mt-1 block text-2xl font-black leading-none text-white"
                  durationMs={760}
                  locale={locale}
                  value={stat.value}
                />
              </div>
              <span className="shrink-0 text-[#44f26e]">{stat.icon}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-4">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-white/48">
            {copy.heroQuickLinks.title}
          </p>
          <div className="mt-2 grid gap-2">
            {quickLinks.map((link) => (
              <Link
                className="inline-flex h-10 min-w-0 items-center justify-between gap-2 border border-white/12 bg-[#07100b] px-3 text-xs font-black !text-white transition hover:border-[#44f26e]/70 hover:bg-[#0d1c11]"
                href={link.href}
                key={link.label}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-[#44f26e]">{link.icon}</span>
                  <span className="truncate">{link.label}</span>
                </span>
                <ArrowRight className="size-3.5 shrink-0 text-white/46" />
              </Link>
            ))}
          </div>
          <Link
            className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 border border-[#44f26e]/34 bg-[#44f26e] px-3 text-xs font-black !text-black transition hover:bg-[#69ff8c]"
            href={newsHomeHref}
          >
            {copy.allNews}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function CharacterLead({
  character,
  copy,
  locale,
  nsfwOptInEnabled,
  referralCode,
}: {
  character: FanletterNewsCharacterStat;
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
}) {
  const report = character.representativeReport;
  const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
  const reportHref = getReportHref(report, referralCode);
  const channelHref = getCharacterChannelHref({
    characterReferralCode: character.referralCode,
    locale,
    referralCode,
  });
  const vlogsHref = getCharacterVlogsHref({
    characterReferralCode: character.referralCode,
    locale,
    referralCode,
  });
  const ipScore = getCharacterIpScore(character);
  const signalLabel = getCharacterSignalLabel(character, copy);
  const latestReportAt = formatDate(character.latestReportAt, locale);

  return (
    <section className="grid overflow-hidden border-y-2 border-[#111510] bg-[#111510] text-white lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
      <Link className="group relative block min-h-[30rem]" href={channelHref}>
        <NewsCharacterImage
          blurred={shouldBlur}
          eager
          report={report}
          sizes="(max-width: 1024px) 100vw, 44rem"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/28 to-black/12" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2 sm:left-5 sm:top-5">
          <span className="inline-flex items-center gap-1.5 bg-[#44f26e] px-3 py-1.5 text-xs font-black text-black">
            <Crown className="size-3.5" />
            {copy.rankLabel(1)}
          </span>
          <span className="inline-flex items-center gap-1.5 border border-white/20 bg-black/42 px-3 py-1.5 text-xs font-black text-white backdrop-blur">
            <Flame className="size-3.5 text-[#ffcf4a]" />
            {signalLabel}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <div className="grid min-w-0 gap-4 sm:grid-cols-[10.5rem_minmax(0,1fr)] sm:items-end">
            <div className="relative w-32 sm:w-full">
              <NewsCharacterPortrait
                character={character}
                className="aspect-[4/5] w-full border-2 border-white/40 shadow-[0_18px_48px_rgba(0,0,0,0.42)]"
                eager
                sizes="(max-width: 640px) 8rem, 10.5rem"
              />
              <span className="absolute inset-x-2 bottom-2 bg-white px-2 py-1 text-center text-[0.6rem] font-black uppercase tracking-[0.08em] text-[#111510]">
                {copy.spotlightFace}
              </span>
            </div>
            <div className="min-w-0">
              <NewsCharacterAvatar
                character={character}
                className="mb-3 size-14 border-2 border-white/30 sm:hidden"
                sizes="3.5rem"
              />
              <span className="inline-flex bg-white px-2.5 py-1 text-xs font-black text-[#111510]">
                {copy.topDesk}
              </span>
              <h2 className="mt-3 break-words text-[2.6rem] font-black leading-[1.02] [word-break:keep-all] sm:text-[4rem]">
                {character.name}
              </h2>
              <p className="mt-2 line-clamp-2 max-w-2xl text-sm font-semibold leading-6 text-white/72 sm:text-base">
                {copy.leadDeck}
              </p>
            </div>
          </div>
        </div>
      </Link>
      <div className="flex flex-col justify-between bg-[#151a13] p-5 sm:p-6 lg:p-7">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
            @{character.referralCode}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1.05fr_1fr]">
            <div className="border border-[#44f26e]/40 bg-[#44f26e]/10 p-4">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#8dffa8]">
                {copy.ipScore}
              </p>
              <FanletterNewsCountUp
                className="mt-2 block text-4xl font-black leading-none text-white"
                locale={locale}
                value={ipScore}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: copy.news, value: character.newsCount },
                { label: copy.reporters, value: character.reporterCount },
                { label: copy.videos, value: character.publicVideoCount },
                { label: copy.fanOnly, value: character.fanOnlyCount },
                {
                  label: copy.sourceOpened,
                  value: character.sourceRevealUnlockedCount,
                },
              ].map((stat) => (
                <div
                  className="border border-white/12 bg-white/[0.06] p-3"
                  key={stat.label}
                >
                  <FanletterNewsCountUp
                    className="block text-xl font-black"
                    durationMs={760}
                    locale={locale}
                    value={stat.value}
                  />
                  <p className="mt-1 truncate text-[0.55rem] font-black uppercase tracking-[0.08em] text-white/46">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <Link className="mt-5 block" href={reportHref}>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-white/42">
              {copy.reportLabel}
            </p>
            <h3
              className={`mt-2 break-words text-2xl font-black leading-tight [word-break:keep-all] hover:text-[#44f26e] ${
                shouldBlur ? "select-none blur-[2px]" : ""
              }`}
            >
              {getArticleDisplayTitle(report.title)}
            </h3>
            <p
              className={`mt-3 line-clamp-3 text-sm font-semibold leading-6 text-white/68 ${
                shouldBlur ? "select-none blur-[2px]" : ""
              }`}
            >
              {report.dek}
            </p>
          </Link>
        </div>
        <div className="mt-5">
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-white/58">
            <span>{getAccessLabel(report, copy)}</span>
            {latestReportAt ? <span>{latestReportAt}</span> : null}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 bg-[#44f26e] px-3 text-sm font-black !text-black transition hover:bg-[#69ff8c]"
              href={channelHref}
            >
              <MessageCircleHeart className="size-4" />
              {copy.characterCta}
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 border border-[#44f26e]/40 bg-[#44f26e]/10 px-3 text-sm font-black !text-white transition hover:bg-[#44f26e]/18"
              href={vlogsHref}
            >
              <Clapperboard className="size-4 text-[#44f26e]" />
              {copy.exploreVlogs}
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 border border-white/18 px-3 text-sm font-black !text-white transition hover:border-white/40"
              href={reportHref}
            >
              {copy.openNews}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function CharacterCard({
  character,
  copy,
  locale,
  nsfwOptInEnabled,
  rank,
  referralCode,
}: {
  character: FanletterNewsCharacterStat;
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  nsfwOptInEnabled: boolean;
  rank: number;
  referralCode: string | null;
}) {
  const report = character.representativeReport;
  const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
  const reportHref = getReportHref(report, referralCode);
  const channelHref = getCharacterChannelHref({
    characterReferralCode: character.referralCode,
    locale,
    referralCode,
  });
  const vlogsHref = getCharacterVlogsHref({
    characterReferralCode: character.referralCode,
    locale,
    referralCode,
  });
  const ipScore = getCharacterIpScore(character);
  const signalLabel = getCharacterSignalLabel(character, copy);
  const latestReportAt = formatDate(character.latestReportAt, locale);

  return (
    <article className="group grid min-w-0 overflow-hidden rounded-lg border border-black/12 bg-white shadow-[0_16px_42px_rgba(17,21,16,0.08)] transition hover:-translate-y-0.5 hover:border-[#19b84b]/60 hover:shadow-[0_22px_58px_rgba(17,21,16,0.13)] sm:grid-rows-[auto_minmax(0,1fr)]">
      <Link className="relative block" href={channelHref}>
        <NewsCharacterImage
          blurred={shouldBlur}
          report={report}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 24rem"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/12 to-transparent" />
        <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 text-[0.66rem] font-black text-[#111510]">
            <Trophy className="size-3.5 text-[#16702e]" />
            {copy.rankLabel(rank)}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-[#44f26e] px-2.5 py-1 text-[0.66rem] font-black text-black">
            {copy.ipScore}{" "}
            <FanletterNewsCountUp
              durationMs={760}
              locale={locale}
              value={ipScore}
            />
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
          <NewsCharacterAvatar
            character={character}
            className="size-20 border-2 border-white/42 shadow-[0_14px_34px_rgba(0,0,0,0.38)]"
            sizes="5rem"
          />
          <div className="min-w-0 pb-1 text-white">
            <p className="truncate text-[0.66rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
              @{character.referralCode}
            </p>
            <h2 className="mt-1 truncate text-2xl font-black tracking-normal">
              {character.name}
            </h2>
          </div>
        </div>
      </Link>
      <div className="flex min-w-0 flex-col p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.64rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
            {signalLabel}
          </p>
          <span className="shrink-0 border border-black/10 bg-[#f9f2ff] px-2 py-1 text-[0.62rem] font-black text-[#7a2fb3]">
            {copy.latest}
          </span>
        </div>
        <Link
          className={`mt-3 line-clamp-2 break-words text-lg font-black leading-6 [word-break:keep-all] hover:text-[#16702e] ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
          href={reportHref}
        >
          {getArticleDisplayTitle(report.title)}
        </Link>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { label: copy.publicNews, value: character.publicCount },
            { label: copy.fanOnly, value: character.fanOnlyCount },
            { label: copy.news, value: character.newsCount },
            { label: copy.reporters, value: character.reporterCount },
          ].map((stat) => (
            <div className="bg-[#f5f6f2] p-2" key={stat.label}>
              <FanletterNewsCountUp
                className="block text-lg font-black leading-none"
                durationMs={720}
                locale={locale}
                value={stat.value}
              />
              <p className="mt-1 truncate text-[0.54rem] font-black uppercase tracking-[0.08em] text-black/42">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            {
              icon: <Clapperboard className="size-4" />,
              label: copy.videos,
              value: character.publicVideoCount,
            },
            {
              icon: <CheckCircle2 className="size-4" />,
              label: copy.sourceOpened,
              value: character.sourceRevealUnlockedCount,
            },
          ].map((stat) => (
            <div
              className="flex min-w-0 items-center justify-between gap-2 border border-black/10 bg-white px-2.5 py-2"
              key={stat.label}
            >
              <span className="shrink-0 text-[#16702e]">{stat.icon}</span>
              <span className="min-w-0 flex-1 truncate text-[0.58rem] font-black uppercase tracking-[0.08em] text-black/45">
                {stat.label}
              </span>
              <FanletterNewsCountUp
                className="shrink-0 text-base font-black leading-none"
                durationMs={720}
                locale={locale}
                value={stat.value}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/10 pt-3">
          <div className="min-w-0 text-[0.66rem] font-bold text-black/42">
            {latestReportAt ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-3.5 text-[#16702e]" />
                {latestReportAt}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              className="text-xs font-black text-[#16702e] hover:underline"
              href={vlogsHref}
            >
              {copy.exploreVlogs}
            </Link>
            <Link
              className="text-xs font-black text-[#111510] hover:text-[#16702e]"
              href={channelHref}
            >
              {copy.characterCta}
            </Link>
          </div>
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
    title: `${copy.title} | FanLetter News`,
    description: copy.dek,
  };
}

export default async function LocalizedFanletterNewsCharactersPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsCharactersSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const cookieStore = await cookies();
  const nsfwOptInEnabled = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const charactersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    referralCode,
  );
  const purchasesHref = buildPathWithReferral(
    `/${locale}/fanletter/news/purchases`,
    referralCode,
  );
  const reports = await getFanletterNewsReportsForCharacterDirectory({ locale });
  const hydratedCharacters = await hydrateFanletterNewsCharacterStats(
    getFanletterNewsCharacterStats(reports, reports.length, {
      sort: "discovery",
    }),
    { sort: "discovery" },
  );
  const characters = [...hydratedCharacters].sort(compareCharactersByIpScore);
  const [leadCharacter, ...restCharacters] = characters;
  const nsfwNewsCount = reports.filter(isNsfwReport).length;
  const shouldShowNsfwControl = nsfwNewsCount > 0 || nsfwOptInEnabled;
  const stats = [
    {
      icon: <UserRound className="size-4" />,
      label: copy.stats.characters,
      value: characters.length,
    },
    {
      icon: <FileText className="size-4" />,
      label: copy.stats.news,
      value: reports.length,
    },
    {
      icon: <PenLine className="size-4" />,
      label: copy.stats.fanOnly,
      value: characters.reduce(
        (total, character) => total + character.fanOnlyCount,
        0,
      ),
    },
    {
      icon: <AlertTriangle className="size-4" />,
      label: copy.stats.nsfw,
      value: nsfwNewsCount,
    },
  ];
  const topCharacters = characters.slice(0, 3);
  const profileMarqueeItems: FanletterNewsCharacterProfileMarqueeItem[] =
    characters.slice(0, 10).map((character, index) => {
      const imageUrls = getCharacterProfileImageUrls(character);

      return {
        href: getCharacterChannelHref({
          characterReferralCode: character.referralCode,
          locale,
          referralCode,
        }),
        imageUrl: imageUrls[0] ?? null,
        imageUrls,
        name: character.name,
        rankLabel: copy.rankLabel(index + 1),
        score: getCharacterIpScore(character),
        signalLabel: getCharacterSignalLabel(character, copy),
        unoptimizedImageUrls: getUnoptimizedCharacterProfileImageUrls(
          imageUrls,
        ),
      };
    });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fafaf7_0%,#eef5ee_48%,#f8f3fb_100%)] pb-[calc(6rem+env(safe-area-inset-bottom))] text-[#111510] md:pb-0">
      <NewsCharactersMasthead
        charactersHref={charactersHref}
        copy={copy}
        newsHomeHref={newsHomeHref}
        purchasesHref={purchasesHref}
      />

      <section className="border-b border-black/20 bg-[#111510] text-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_27rem] lg:px-8 lg:py-10">
          <div>
            <p className="inline-flex items-center gap-2 bg-[#44f26e] px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-black">
              <Trophy className="size-4" />
              {copy.heroEyebrow}
            </p>
            <h1 className="mt-5 max-w-4xl break-words text-[2.45rem] font-black leading-[1.02] [word-break:keep-all] sm:text-[4rem] lg:text-[4.6rem]">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/68 sm:text-lg sm:leading-8">
              {copy.dek}
            </p>
            <div className="mt-6 hidden grid-cols-2 gap-2 sm:grid sm:grid-cols-4">
              {stats.map((stat) => (
                <div className="border border-white/12 bg-white/[0.06] p-3" key={stat.label}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[0.56rem] font-black uppercase tracking-[0.1em] text-white/42">
                      {stat.label}
                    </p>
                    <span className="text-[#44f26e]">{stat.icon}</span>
                  </div>
                  <FanletterNewsCountUp
                    className="mt-2 block text-2xl font-black leading-none"
                    locale={locale}
                    value={stat.value}
                  />
                </div>
              ))}
            </div>
            <FanletterNewsCharacterProfileMarquee
              ariaLabel={copy.profileRailLabel}
              items={profileMarqueeItems}
              locale={locale}
              scoreLabel={copy.ipScore}
            />
            <CharacterHeroArenaPanel
              characters={characters}
              copy={copy}
              locale={locale}
              newsHomeHref={newsHomeHref}
              referralCode={referralCode}
              topCharacters={topCharacters}
            />
          </div>

          <aside className="border-t border-white/12 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#44f26e]">
                  {copy.faceArena}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
                  {copy.faceArenaDek}
                </p>
              </div>
              <Sparkles className="size-5 shrink-0 text-[#ffcf4a]" />
            </div>
            <div className="mt-4 grid gap-2">
              {topCharacters.slice(0, 1).map((character, index) => (
                <CharacterPodiumCard
                  character={character}
                  copy={copy}
                  key={character.referralCode}
                  locale={locale}
                  rank={index + 1}
                  referralCode={referralCode}
                />
              ))}
            </div>
            <div className="mt-4 border border-white/12 bg-white/[0.04] p-3">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#b88cff]">
                {copy.ranking}
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-white/52">
                {copy.rankingDek}
              </p>
            </div>
          </aside>
          <div className="grid grid-cols-2 gap-2 sm:hidden">
            {stats.map((stat) => (
              <div className="border border-white/12 bg-white/[0.06] p-3" key={stat.label}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[0.56rem] font-black uppercase tracking-[0.1em] text-white/42">
                    {stat.label}
                  </p>
                  <span className="text-[#44f26e]">{stat.icon}</span>
                </div>
                <FanletterNewsCountUp
                  className="mt-2 block text-2xl font-black leading-none"
                  locale={locale}
                  value={stat.value}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        {shouldShowNsfwControl ? (
          <div className="mt-5">
            <FanletterNsfwOptInControl
              compact
              disabledBody={copy.nsfwControl.disabledBody}
              disabledTitle={copy.nsfwControl.disabledTitle}
              enabled={nsfwOptInEnabled}
              enabledBody={copy.nsfwControl.enabledBody}
              enabledTitle={copy.nsfwControl.enabledTitle}
              hiddenCount={nsfwNewsCount}
              hiddenCountText={copy.nsfwControl.hiddenCountText(
                formatNumber(nsfwNewsCount, locale),
              )}
              locale={locale}
              tone={nsfwOptInEnabled ? "dark" : "light"}
            />
          </div>
        ) : null}

        {leadCharacter ? (
          <div className="mt-7 space-y-7">
            <CharacterLead
              character={leadCharacter}
              copy={copy}
              locale={locale}
              nsfwOptInEnabled={nsfwOptInEnabled}
              referralCode={referralCode}
            />

            {restCharacters.length > 0 ? (
              <section>
                <div className="mb-4 flex items-end justify-between gap-3 border-b-2 border-[#111510] pb-3">
                  <div>
                    <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
                      Character Index
                    </p>
                    <h2 className="mt-1 text-xl font-black tracking-normal">
                      {copy.title}
                    </h2>
                  </div>
                  <Sparkles className="size-5 text-[#16702e]" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {restCharacters.map((character, index) => (
                    <CharacterCard
                      character={character}
                      copy={copy}
                      key={character.referralCode}
                      locale={locale}
                      nsfwOptInEnabled={nsfwOptInEnabled}
                      rank={index + 2}
                      referralCode={referralCode}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <section className="mt-7 border border-black/12 bg-white p-8 text-center">
            <Newspaper className="mx-auto size-12 text-[#16702e]" />
            <h2 className="mt-4 text-2xl font-black">{copy.emptyTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-black/58">
              {copy.emptyBody}
            </p>
            <Link
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 border border-black/14 px-4 text-sm font-black text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
              href={newsHomeHref}
            >
              {copy.allNews}
              <ArrowRight className="size-4" />
            </Link>
          </section>
        )}
      </section>
    </main>
  );
}
