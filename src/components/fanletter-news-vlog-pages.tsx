import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clapperboard,
  Coins,
  ExternalLink,
  Heart,
  LockKeyhole,
  MessageCircleHeart,
  Newspaper,
  PlayCircle,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import { FanletterChannelShareButton } from "@/components/fanletter-channel-share-button";
import { FanletterNewsWalletConnect } from "@/components/fanletter-news-wallet-connect";
import { FanletterNsfwOptInControl } from "@/components/fanletter-nsfw-opt-in-control";
import {
  FanletterPaidUnlockPanel,
  FanletterPaidUnlockTrigger,
} from "@/components/fanletter-paid-unlock-panel";
import { FanletterResponsiveMediaFrame } from "@/components/fanletter-responsive-media-frame";
import {
  CONTENT_PAID_USDT_AMOUNT,
  type FanletterNewsReportDocument,
} from "@/lib/content";
import {
  type FanletterCreatorVlogsPageData,
  type FanletterFeedPageData,
  type FanletterFeedSort,
  type FanletterPublicContentDetail,
  type FanletterPublicContentItem,
} from "@/lib/fanletter-content-service";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import { getFanletterNewsArticleDisplayTitle } from "@/lib/fanletter-news-related";
import {
  createFanletterNewsSourceRevealState,
  FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD,
  type FanletterNewsSourceRevealState,
} from "@/lib/fanletter-news-source-reveal";
import {
  getFanletterNewsCharacterVlogsHref,
  getFanletterNewsVlogsHref,
  getFanletterNewsVlogHref,
} from "@/lib/fanletter-news-vlog-routing";
import {
  getFanletterNsfwCopy,
} from "@/lib/fanletter-nsfw";
import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { cn } from "@/lib/utils";
import { buildWalletUnlockHref } from "@/lib/wallet-unlock";

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        access: {
          fanOnly: "팬 전용",
          nsfw: "성인 팬 전용",
          paid: "팬 전용",
          public: "공개 브이로그",
        },
        bodyTitle: "브이로그 본문",
        character: "AI 캐릭터",
        characterChannel: "캐릭터 채널",
        contentReports: "이 브이로그에서 생성된 뉴스",
        contentReportsEmpty: "아직 이 브이로그에서 생성된 뉴스가 없습니다.",
        cta: {
          archive: "공개 브이로그",
          character: "캐릭터 뉴스 홈",
          newsHome: "뉴스 홈",
          original: "원본 일반 페이지",
          purchases: "구매함",
          reportSource: "리포트 소재로 선택",
          readNews: "뉴스 읽기",
          viewInNews: "브이로그 보기",
          wallet: "지갑",
        },
        detail: {
          backToArchive: "공개 브이로그 목록",
          eyebrow: "AIAVpark News Vlog",
          generalStatus: "일반",
          lockedBody:
            "팬 전용 원본 브이로그는 결제 후 뉴스 서비스 안에서 바로 열람할 수 있습니다.",
          lockedMeta: "전체 영상 · 본문 · 추가 미디어",
          lockedTitle: "팬 전용 브이로그 잠금 해제",
          meta: "뉴스 서비스 안에서 원본 브이로그를 이어봅니다.",
          ownerAccess: "작성자 열람",
          paidAccessibleBody:
            "결제가 완료된 팬 전용 브이로그입니다. 뉴스 전용 화면에서 원본 영상을 이어봅니다.",
          paidLockedBody:
            "팬 전용 유료 브이로그입니다. 결제 전에는 티저와 공개 가능한 정보만 표시됩니다.",
          paidStatus: (amount: string) => `${amount} USDT 유료`,
          pinRequired: "PIN 확인 후 재생",
          paidUnlockCta: "결제하고 원본 보기",
          paidUnlockTeaserEyebrow: "팬 전용 티저 컷",
          paidUnlockTeaserTitle: "결제 전, 분위기를 먼저 확인하세요",
          publicBody:
            "공개 브이로그입니다. 뉴스 서비스 안에서 바로 볼 수 있습니다.",
          purchased: "구매 완료",
          titleSuffix: "브이로그",
          unpaid: "결제 필요",
          viewable: "열람 가능",
        },
        empty: "아직 공개 브이로그가 없습니다.",
        footerCta: "뉴스 홈으로 돌아가기",
        latest: "최신순",
        archive: {
          allCount: (count: string) => `브이로그 ${count}개`,
          description:
            "AI 캐릭터의 공개 브이로그와 팬 전용 티저를 둘러보고, 관련 리포트와 캐릭터 채널로 바로 이어갑니다.",
          eyebrow: "AIAVpark Vlog Archive",
          fanOnlyTitle: "팬 전용 브이로그 티저",
          publicTitle: "공개 브이로그",
          searchPlaceholder: "캐릭터, 제목, 키워드 검색",
          searchSubmit: "검색",
          title: "브이로그 아카이브",
        },
        list: {
          allCount: (count: string) => `공개 브이로그 ${count}개`,
          audience: {
            fanBody:
              "무료 원본 영상으로 캐릭터의 말투, 분위기, 다음 요청 포인트를 확인합니다.",
            fanCta: "브이로그 보기",
            fanRequestCta: "팬 요청 남기기",
            fanTitle: "일반 팬",
            reporterBody:
              "영상 장면과 팬 오픈 반응을 보고 새 리포트 소재로 바로 연결합니다.",
            reporterCta: "리포트 소재 찾기",
            reporterTitle: "팬 리포터",
          },
          description: (name: string) =>
            `${name}의 무료 원본 브이로그를 모았습니다. 팬은 캐릭터 분위기를 확인하고, 리포터는 리포트 소재가 될 장면을 찾을 수 있습니다.`,
          eyebrow: "AI 캐릭터 원본 브이로그",
          title: (name: string) => `${name} 공개 브이로그`,
        },
        navItems: ["뉴스 홈", "AI 캐릭터", "원본 브이로그", "구매함"],
        popular: "인기순",
        comments: "댓글순",
        saves: "저장순",
        relatedVlogs: "같은 캐릭터의 다른 공개 브이로그",
        relatedVlogsEmpty: "이어볼 공개 브이로그가 아직 없습니다.",
        reportUnit: "뉴스",
        siteEdition: "AI 캐릭터와 팬 리포트를 다루는 AIAVpark 온라인 뉴스",
        siteName: "AIAVpark News",
        sort: "정렬",
        source: "원본",
        sourceReveal: {
          bodyLocked: (remaining: string) =>
            `팬 리포트 기준 ${remaining}명 남음`,
          bodyReady: "팬들이 열어낸 원본",
          complete: "오픈 완료",
          detailBody:
            "여러 티저 컷으로 분위기를 먼저 확인하고, 팬 리포트에서 모인 오픈 진행률을 이어서 확인하세요.",
          detailEyebrow: "AIAVpark 팬 오픈",
          detailMeta: "티저 컷 먼저 공개",
          detailNote:
            "보고싶어요 참여는 팬 기자가 작성한 뉴스 리포트에서 진행됩니다.",
          detailTitle: "팬 리포트에서 모인 관심으로 원본 브이로그가 열립니다",
          eyebrow: "팬 오픈 진행",
          label: "원본 오픈",
          sceneLabel: "티저",
          remaining: (count: string) => `${count}명 남음`,
          requested: "참여 완료",
        },
        stats: {
          comments: "댓글",
          likes: "좋아요",
          reports: "리포트",
          saves: "저장",
        },
      }
    : {
        access: {
          fanOnly: "Fan-only",
          nsfw: "Adult fan-only",
          paid: "Fan-only",
          public: "Public vlog",
        },
        bodyTitle: "Vlog body",
        character: "AI character",
        characterChannel: "Character channel",
        contentReports: "News generated from this vlog",
        contentReportsEmpty: "No news has been generated from this vlog yet.",
        cta: {
          archive: "Public vlogs",
          character: "Character news home",
          newsHome: "News home",
          original: "Original AIAVpark page",
          purchases: "Purchases",
          reportSource: "Use as report source",
          readNews: "Read news",
          viewInNews: "Watch vlog",
          wallet: "Wallet",
        },
        detail: {
          backToArchive: "Public vlog archive",
          eyebrow: "AIAVpark News Vlog",
          generalStatus: "General",
          lockedBody:
            "Unlock the fan-only source vlog and continue watching inside AIAVpark News.",
          lockedMeta: "Full video · body · extra media",
          lockedTitle: "Unlock fan-only vlog",
          meta: "Continue the source vlog inside the News service.",
          ownerAccess: "Creator access",
          paidAccessibleBody:
            "This fan-only vlog has been purchased. Continue watching the source video inside News.",
          paidLockedBody:
            "This is a fan-only paid vlog. Before payment, only teaser and public context are shown.",
          paidStatus: (amount: string) => `${amount} USDT paid`,
          pinRequired: "PIN required to play",
          paidUnlockCta: "Pay and watch source",
          paidUnlockTeaserEyebrow: "Fan-only teaser cuts",
          paidUnlockTeaserTitle: "Preview the mood before unlocking",
          publicBody:
            "This is a public vlog and can be watched directly inside News.",
          purchased: "Purchased",
          titleSuffix: "vlog",
          unpaid: "Payment needed",
          viewable: "Viewable",
        },
        empty: "No public vlogs have been published yet.",
        footerCta: "Back to news home",
        latest: "Latest",
        archive: {
          allCount: (count: string) => `${count} vlogs`,
          description:
            "Browse AI character public vlogs and fan-only teasers, then continue into related reports and character channels.",
          eyebrow: "AIAVpark Vlog Archive",
          fanOnlyTitle: "Fan-only vlog teasers",
          publicTitle: "Public vlogs",
          searchPlaceholder: "Search character, title, or keyword",
          searchSubmit: "Search",
          title: "Vlog Archive",
        },
        list: {
          allCount: (count: string) => `${count} public vlogs`,
          audience: {
            fanBody:
              "Watch free source videos to understand the character voice, mood, and next request points.",
            fanCta: "Watch vlogs",
            fanRequestCta: "Leave request",
            fanTitle: "General fans",
            reporterBody:
              "Review scenes and source-open reactions, then continue into a new report source.",
            reporterCta: "Find report source",
            reporterTitle: "Fan reporters",
          },
          description: (name: string) =>
            `Browse ${name}'s free source vlogs. Fans can understand the character mood, while reporters can find scenes for new reports.`,
          eyebrow: "AI character source vlogs",
          title: (name: string) => `${name} public vlogs`,
        },
        navItems: ["News home", "AI characters", "Source vlogs", "Purchases"],
        popular: "Popular",
        comments: "Comments",
        saves: "Saves",
        relatedVlogs: "More public vlogs from this character",
        relatedVlogsEmpty: "No other public vlogs are ready yet.",
        reportUnit: "news",
        siteEdition: "AIAVpark online news for AI characters and fan reports",
        siteName: "AIAVpark News",
        sort: "Sort",
        source: "Source",
        sourceReveal: {
          bodyLocked: (remaining: string) =>
            `${remaining} fan${remaining === "1" ? "" : "s"} left from reports`,
          bodyReady: "Source opened by fans",
          complete: "Opened",
          detailBody:
            "Preview the mood through several teaser cuts, then keep track of open progress gathered from fan reports.",
          detailEyebrow: "AIAVpark fan open",
          detailMeta: "Teaser cuts first",
          detailNote:
            "Want-to-watch participation happens from fan reporter news reports.",
          detailTitle: "Fan report interest opens the source vlog",
          eyebrow: "Fan open progress",
          label: "Source open",
          sceneLabel: "Teaser",
          remaining: (count: string) =>
            `${count} fan${count === "1" ? "" : "s"} left`,
          requested: "Joined",
        },
        stats: {
          comments: "Comments",
          likes: "Likes",
          reports: "Reports",
          saves: "Saves",
        },
      };
}

function formatDate(value: Date | string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(value instanceof Date ? value : new Date(value));
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getAccessLabel(
  item: Pick<FanletterPublicContentItem, "contentMaturityRating" | "priceType">,
  copy: ReturnType<typeof getCopy>,
) {
  if (item.contentMaturityRating === "nsfw") {
    return copy.access.nsfw;
  }

  return item.priceType === "paid" ? copy.access.paid : copy.access.public;
}

function getFanletterNewsReportSourceHref({
  contentId,
  locale,
  referralCode,
}: {
  contentId: string;
  locale: Locale;
  referralCode: string | null;
}) {
  return setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/reports/new`, referralCode),
    {
      contentId,
      reportStatus: "all",
      sourceReveal: "all",
      sourceSort: "latest",
    },
  );
}

function getCharacterAvatarUrl(
  data: Pick<FanletterCreatorVlogsPageData, "profile">,
) {
  return (
    data.profile.character?.avatarImageSet[0]?.url ??
    data.profile.avatarImageUrl ??
    null
  );
}

function NewsShellHeader({
  copy,
  homeHref,
  locale,
  navLinks,
  referralCode,
  walletHref,
}: {
  copy: ReturnType<typeof getCopy>;
  homeHref: string;
  locale: Locale;
  navLinks: Array<{ href: string; label: string }>;
  referralCode: string | null;
  walletHref: string;
}) {
  const today = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
  }).format(new Date());

  return (
    <header className="border-b border-black/14 bg-white text-[#111510] shadow-[0_8px_28px_rgba(17,21,16,0.05)]">
      <div className="border-b border-black/10 bg-[#eef1ec]">
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-4 px-4 py-1.5 text-[0.68rem] font-bold text-black/52 sm:px-6 sm:py-2 lg:px-8">
          <span>{today}</span>
          <span className="hidden sm:inline">{copy.siteEdition}</span>
        </div>
      </div>
      <div className="mx-auto flex max-w-[92rem] flex-col px-4 pt-3 sm:px-6 sm:pt-4 lg:px-8">
        <div className="flex items-end justify-between gap-4 border-b-2 border-[#111510] pb-2.5 sm:pb-3">
          <Link
            className="inline-flex min-w-0 items-center gap-3 break-words text-2xl font-black leading-none tracking-normal !text-[#111510] sm:text-[4rem]"
            href={homeHref}
          >
            {copy.siteName}
          </Link>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="hidden border border-black/14 px-3 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e] sm:inline-flex">
              Vlog Edition
            </span>
            <FanletterNewsWalletConnect
              className="max-w-[7.75rem] sm:max-w-[12rem]"
              locale={locale}
              referralCode={referralCode}
              walletHref={walletHref}
            />
          </div>
        </div>
        <nav
          aria-label={copy.siteName}
          className="flex gap-2 overflow-x-auto border-b border-black/10 py-2.5 text-sm font-bold text-black/62 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {navLinks.map((item) => (
            <Link
              className="shrink-0 border border-black/10 bg-white px-3 py-1.5 transition hover:border-[#19b84b] hover:bg-[#ecfff0] hover:text-[#126c2c]"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function MetricPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-black text-black/58">
      <span className="text-[#16702e]">{icon}</span>
      <span className="text-[#111510]">{value}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function getSourceRevealCardState(item: FanletterPublicContentItem) {
  const threshold = FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD;
  const count = Math.max(0, Math.floor(item.social.sourceRevealCount));
  const clampedCount = Math.min(count, threshold);
  const remaining = Math.max(0, threshold - count);

  return {
    clampedCount,
    count,
    percent:
      threshold > 0
        ? Math.min(100, Math.max(0, (clampedCount / threshold) * 100))
        : 100,
    remaining,
    requestedByViewer: item.social.sourceRevealRequestedByViewer,
    threshold,
    unlocked: count >= threshold,
  };
}

function SourceRevealProgressBar({
  className,
  percent,
  unlocked,
}: {
  className?: string;
  percent: number;
  unlocked: boolean;
}) {
  return (
    <div
      className={cn(
        "h-2 overflow-hidden rounded-full bg-black/10",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          unlocked
            ? "bg-[#44f26e]"
            : "bg-[linear-gradient(90deg,#44f26e,#b5ff4d)]",
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function getUniqueImageUrls(urls: Array<string | null | undefined>) {
  return urls.filter(
    (url, index, array): url is string =>
      typeof url === "string" && url.length > 0 && array.indexOf(url) === index,
  );
}

function NewsVlogSourceRevealTeaser({
  blurred,
  content,
  locale,
  sourceReveal,
}: {
  blurred: boolean;
  content: FanletterPublicContentDetail;
  locale: Locale;
  sourceReveal: FanletterNewsSourceRevealState;
}) {
  const copy = getCopy(locale);
  const countLabel = formatNumber(
    Math.min(sourceReveal.count, sourceReveal.threshold),
    locale,
  );
  const thresholdLabel = formatNumber(sourceReveal.threshold, locale);
  const remainingLabel = formatNumber(
    Math.max(0, sourceReveal.threshold - sourceReveal.count),
    locale,
  );
  const progressPercent =
    sourceReveal.threshold > 0
      ? Math.min(
          100,
          Math.max(0, (sourceReveal.count / sourceReveal.threshold) * 100),
        )
      : 100;
  const teaserImages = getUniqueImageUrls([
    content.coverImageUrl,
    ...content.coverImageCandidates.map((candidate) => candidate.url),
    ...content.contentImageUrls,
  ]).slice(0, 4);

  return (
    <div className="relative overflow-hidden bg-[#07100b] text-white">
      {content.coverImageUrl ? (
        <Image
          alt=""
          aria-hidden="true"
          className={cn(
            "object-cover opacity-44",
            blurred && "scale-[1.04] blur-sm brightness-[0.74] saturate-[0.9]",
          )}
          fill
          loading="eager"
          sizes="(max-width: 768px) 100vw, 70vw"
          src={content.coverImageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(content.coverImageUrl)}
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,16,11,0.72),rgba(7,16,11,0.88)_42%,rgba(0,0,0,0.96))]" />

      <div className="relative grid gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)] lg:items-center lg:p-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-[#44f26e] px-3 py-1.5 text-[0.64rem] font-black uppercase tracking-[0.14em] text-black">
              {copy.sourceReveal.detailEyebrow}
            </span>
            <span className="inline-flex rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-[0.64rem] font-black uppercase tracking-[0.14em] text-white/72">
              {copy.sourceReveal.detailMeta}
            </span>
          </div>
          <h2 className="mt-4 max-w-2xl break-words text-2xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-4xl">
            {copy.sourceReveal.detailTitle}
          </h2>
          <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-white/68 sm:text-base sm:leading-7">
            {copy.sourceReveal.detailBody}
          </p>

          <div className="mt-5 grid grid-cols-4 gap-1.5 sm:gap-2">
            {(teaserImages.length > 0 ? teaserImages : [content.coverImageUrl]).map(
              (imageUrl, index) => (
                <div
                  className={cn(
                    "relative aspect-[4/5] overflow-hidden rounded-lg border bg-black shadow-[0_14px_34px_rgba(0,0,0,0.28)]",
                    index === 0
                      ? "border-[#44f26e]/70"
                      : "border-white/14",
                  )}
                  key={`${imageUrl ?? "fallback"}-${index}`}
                >
                  {imageUrl ? (
                    <Image
                      alt=""
                      aria-hidden="true"
                      className={cn(
                        "object-cover",
                        blurred &&
                          "scale-[1.04] blur-sm brightness-[0.74] saturate-[0.9]",
                      )}
                      fill
                      loading={index === 0 ? "eager" : undefined}
                      sizes="(max-width: 640px) 42vw, 12rem"
                      src={imageUrl}
                      unoptimized={shouldBypassFanletterImageOptimization(imageUrl)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#44f26e]">
                      <Clapperboard className="size-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-transparent to-black/8" />
                  <span className="absolute bottom-2 left-2 rounded-full bg-black/68 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-white/82">
                    {copy.sourceReveal.sceneLabel}{" "}
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/14 bg-black/56 p-3 shadow-[0_18px_44px_rgba(0,0,0,0.3)] backdrop-blur sm:p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[0.64rem] font-black uppercase tracking-[0.16em] text-[#9bffad]">
                {copy.sourceReveal.eyebrow}
              </p>
              <p className="mt-1 text-sm font-black text-white/72">
                {copy.sourceReveal.bodyLocked(remainingLabel)}
              </p>
            </div>
            <p className="text-3xl font-black leading-none text-white">
              {countLabel}/{thresholdLabel}
            </p>
          </div>
          <SourceRevealProgressBar
            className="mt-4 bg-white/16"
            percent={progressPercent}
            unlocked={sourceReveal.unlocked}
          />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/8 px-3 py-2">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-white/42">
                {copy.sourceReveal.label}
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {countLabel}/{thresholdLabel}
              </p>
            </div>
            <div className="rounded-lg border border-[#44f26e]/18 bg-[#44f26e]/10 px-3 py-2">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#9bffad]">
                {sourceReveal.unlocked
                  ? copy.sourceReveal.complete
                  : copy.sourceReveal.eyebrow}
              </p>
              <p className="mt-1 text-sm font-black leading-5 text-white">
                {sourceReveal.unlocked
                  ? copy.sourceReveal.bodyReady
                  : copy.sourceReveal.bodyLocked(remainingLabel)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-white/52">
            {copy.sourceReveal.detailNote}
          </p>
        </div>
      </div>
    </div>
  );
}

function NewsVlogPaidUnlockTeaser({
  blurred,
  content,
  locale,
  paidUnlockAmount,
  paidUnlockHref,
  showPaidUnlockCta,
}: {
  blurred: boolean;
  content: FanletterPublicContentDetail;
  locale: Locale;
  paidUnlockAmount: string;
  paidUnlockHref: string;
  showPaidUnlockCta: boolean;
}) {
  const copy = getCopy(locale);
  const nsfwCopy = getFanletterNsfwCopy(locale);
  const teaserImages = getUniqueImageUrls([
    content.coverImageUrl,
    ...content.coverImageCandidates.map((candidate) => candidate.url),
    ...content.contentImageUrls,
  ]).slice(0, 4);

  return (
    <div className="relative overflow-hidden bg-[#07100b] text-white">
      {content.coverImageUrl ? (
        <Image
          alt=""
          aria-hidden="true"
          className={cn(
            "object-cover opacity-44",
            blurred && "scale-[1.04] blur-sm brightness-[0.74] saturate-[0.9]",
          )}
          fill
          loading="eager"
          sizes="(max-width: 768px) 100vw, 70vw"
          src={content.coverImageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(content.coverImageUrl)}
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,16,11,0.68),rgba(7,16,11,0.84)_42%,rgba(0,0,0,0.94))]" />

      <div className="relative grid gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)] lg:items-center lg:p-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-[#44f26e] px-3 py-1.5 text-[0.64rem] font-black uppercase tracking-[0.14em] text-black">
              {copy.detail.paidUnlockTeaserEyebrow}
            </span>
            <span className="inline-flex rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-[0.64rem] font-black uppercase tracking-[0.14em] text-white/72">
              {paidUnlockAmount} USDT
            </span>
            {content.contentMaturityRating === "nsfw" ? (
              <span className="inline-flex rounded-full bg-rose-500 px-3 py-1.5 text-[0.64rem] font-black uppercase tracking-[0.14em] text-white">
                {nsfwCopy.badge}
              </span>
            ) : null}
          </div>
          <h2 className="mt-4 max-w-2xl break-words text-2xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-4xl">
            {copy.detail.paidUnlockTeaserTitle}
          </h2>
          <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-white/68 sm:text-base sm:leading-7">
            {content.summary || copy.detail.lockedBody}
          </p>

          <div className="mt-5 grid grid-cols-4 gap-1.5 sm:gap-2">
            {(teaserImages.length > 0 ? teaserImages : [content.coverImageUrl]).map(
              (imageUrl, index) => (
                <div
                  className={cn(
                    "relative aspect-[4/5] overflow-hidden rounded-lg border bg-black shadow-[0_14px_34px_rgba(0,0,0,0.28)]",
                    index === 0
                      ? "border-[#44f26e]/70"
                      : "border-white/14",
                  )}
                  key={`${imageUrl ?? "fallback"}-${index}`}
                >
                  {imageUrl ? (
                    <Image
                      alt=""
                      aria-hidden="true"
                      className={cn(
                        "object-cover",
                        blurred &&
                          "scale-[1.04] blur-sm brightness-[0.74] saturate-[0.9]",
                      )}
                      fill
                      loading={index === 0 ? "eager" : undefined}
                      sizes="(max-width: 640px) 42vw, 12rem"
                      src={imageUrl}
                      unoptimized={shouldBypassFanletterImageOptimization(imageUrl)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#44f26e]">
                      <Clapperboard className="size-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-transparent to-black/8" />
                  <span className="absolute bottom-2 left-2 rounded-full bg-black/68 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-white/82">
                    {copy.sourceReveal.sceneLabel}{" "}
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/14 bg-black/56 p-3 shadow-[0_18px_44px_rgba(0,0,0,0.3)] backdrop-blur sm:p-4">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-[#44f26e] px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.14em] text-black">
              {paidUnlockAmount} USDT
            </span>
            <span className="inline-flex rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.14em] text-white/72">
              {copy.detail.lockedMeta}
            </span>
          </div>
          <h3 className="mt-4 text-2xl font-black leading-tight">
            {copy.detail.lockedTitle}
          </h3>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/68">
            {copy.detail.lockedBody}
          </p>
          {showPaidUnlockCta ? (
            <FanletterPaidUnlockTrigger
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-black transition hover:bg-[#69ff8c]"
              href={paidUnlockHref}
            >
              <Coins className="size-4" />
              <span>{copy.detail.paidUnlockCta}</span>
            </FanletterPaidUnlockTrigger>
          ) : (
            <p className="mt-4 rounded-lg border border-white/14 bg-white/10 px-3 py-2 text-sm font-semibold leading-6 text-white/72">
              {nsfwCopy.disabledBody}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function NewsVlogCard({
  copy,
  href,
  item,
  locale,
  nsfwOptInEnabled,
  reportHref,
}: {
  copy: ReturnType<typeof getCopy>;
  href: string;
  item: FanletterPublicContentItem;
  locale: Locale;
  nsfwOptInEnabled: boolean;
  reportHref?: string | null;
}) {
  const blurred = item.contentMaturityRating === "nsfw" && !nsfwOptInEnabled;
  const publishedAt = formatDate(item.publishedAt, locale);
  const sourceReveal = getSourceRevealCardState(item);
  const countLabel = formatNumber(sourceReveal.clampedCount, locale);
  const thresholdLabel = formatNumber(sourceReveal.threshold, locale);
  const remainingLabel = formatNumber(sourceReveal.remaining, locale);
  const sourceRevealStatus = sourceReveal.unlocked
    ? copy.sourceReveal.complete
    : sourceReveal.requestedByViewer
      ? copy.sourceReveal.requested
      : copy.sourceReveal.remaining(remainingLabel);

  return (
    <article className="group grid min-w-0 overflow-hidden border border-black/12 bg-white shadow-[0_14px_40px_rgba(17,21,16,0.06)] transition hover:-translate-y-0.5 hover:border-[#19b84b] hover:shadow-[0_18px_48px_rgba(17,21,16,0.1)]">
      <Link className="relative block aspect-[16/10] bg-[#111510]" href={href}>
        {item.coverImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className={cn(
              "object-cover transition duration-300 group-hover:scale-[1.03]",
              blurred && "scale-[1.04] blur-md brightness-[0.68] saturate-[0.84]",
            )}
            fill
            sizes="(max-width: 768px) 100vw, 28rem"
            src={item.coverImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(item.coverImageUrl)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/72">
            <Clapperboard className="size-10 text-[#44f26e]" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="rounded-full bg-[#44f26e] px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.1em] text-black">
            {getAccessLabel(item, copy)}
          </span>
          {item.newsReportCount > 0 ? (
            <span className="rounded-full bg-black/68 px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.1em] text-white backdrop-blur">
              {formatNumber(item.newsReportCount, locale)} {copy.reportUnit}
            </span>
          ) : null}
        </div>
        <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/16 bg-black/72 p-3 text-white shadow-[0_14px_36px_rgba(0,0,0,0.28)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
                  sourceReveal.unlocked
                    ? "bg-[#44f26e] text-black"
                    : "bg-[#44f26e]/14 text-[#44f26e]",
                )}
              >
                {sourceReveal.unlocked ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <Users className="size-4" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
                  {copy.sourceReveal.eyebrow}
                </span>
                <span className="mt-0.5 block truncate text-xs font-black text-white">
                  {sourceRevealStatus}
                </span>
              </span>
            </span>
            <span className="shrink-0 text-lg font-black leading-none text-white">
              {countLabel}/{thresholdLabel}
            </span>
          </div>
          <SourceRevealProgressBar
            className="mt-2 bg-white/16"
            percent={sourceReveal.percent}
            unlocked={sourceReveal.unlocked}
          />
        </div>
      </Link>
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.12em] text-black/42">
          <span>{copy.source}</span>
          {publishedAt ? <span>{publishedAt}</span> : null}
        </div>
        <Link
          className={cn(
            "mt-2 line-clamp-2 block break-words text-lg font-black leading-6 tracking-normal [word-break:keep-all] hover:text-[#16702e]",
            blurred && "select-none blur-[2px]",
          )}
          href={href}
        >
          {item.title}
        </Link>
        <p
          className={cn(
            "mt-2 line-clamp-2 text-sm font-semibold leading-6 text-black/56",
            blurred && "select-none blur-[2px]",
          )}
        >
          {item.summary}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <MetricPill
            icon={<Heart className="size-3.5" />}
            label={copy.stats.likes}
            value={formatNumber(item.social.likeCount, locale)}
          />
          <MetricPill
            icon={<MessageCircleHeart className="size-3.5" />}
            label={copy.stats.comments}
            value={formatNumber(item.social.commentCount, locale)}
          />
        </div>
        <div
          className={cn(
            "mt-4 rounded-xl border p-3",
            sourceReveal.unlocked
              ? "border-[#19b84b]/28 bg-[#edfff2]"
              : "border-black/10 bg-[#f5f7f1]",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
                  sourceReveal.unlocked
                    ? "bg-[#111510] text-[#44f26e]"
                    : "bg-white text-[#16702e]",
                )}
              >
                {sourceReveal.unlocked ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <LockKeyhole className="size-4" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
                  {copy.sourceReveal.label}
                </span>
                <span className="mt-0.5 block truncate text-xs font-black text-black/64">
                  {sourceReveal.unlocked
                    ? copy.sourceReveal.bodyReady
                    : copy.sourceReveal.bodyLocked(remainingLabel)}
                </span>
              </span>
            </span>
            <span className="shrink-0 text-sm font-black text-[#111510]">
              {countLabel}/{thresholdLabel}
            </span>
          </div>
          <SourceRevealProgressBar
            className="mt-2"
            percent={sourceReveal.percent}
            unlocked={sourceReveal.unlocked}
          />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-4 py-2 text-sm font-black !text-white transition hover:bg-[#16702e]"
            href={href}
          >
            {copy.cta.viewInNews}
            <ArrowRight className="size-4" />
          </Link>
          {reportHref ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#16702e]/26 bg-[#ecfff0] px-4 py-2 text-sm font-black !text-[#126c2c] transition hover:border-[#16702e] hover:bg-[#d9ffe2]"
              href={reportHref}
            >
              <Newspaper className="size-4" />
              {copy.cta.reportSource}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Pagination({
  currentPage,
  getHref,
  locale,
  pageCount,
}: {
  currentPage: number;
  getHref: (page: number) => string;
  locale: Locale;
  pageCount: number;
}) {
  if (pageCount <= 1) {
    return null;
  }

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  const visiblePages = pages.filter(
    (page) =>
      page === 1 ||
      page === pageCount ||
      Math.abs(page - currentPage) <= 1,
  );

  return (
    <nav
      aria-label={locale === "ko" ? "브이로그 페이지" : "Vlog pages"}
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
    >
      <Link
        aria-disabled={currentPage <= 1}
        className={cn(
          "inline-flex h-11 items-center justify-center rounded-full border border-black/12 bg-white px-4 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]",
          currentPage <= 1 && "pointer-events-none opacity-45",
        )}
        href={getHref(Math.max(1, currentPage - 1))}
      >
        {locale === "ko" ? "이전" : "Prev"}
      </Link>
      {visiblePages.map((page, index) => {
        const previousPage = visiblePages[index - 1];
        const needsGap = previousPage && page - previousPage > 1;

        return (
          <span className="inline-flex items-center gap-2" key={page}>
            {needsGap ? (
              <span className="px-1 text-sm font-black text-black/34">...</span>
            ) : null}
            <Link
              aria-current={page === currentPage ? "page" : undefined}
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-full border border-black/12 bg-white text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]",
                page === currentPage && "border-[#111510] bg-[#111510] !text-white",
              )}
              href={getHref(page)}
            >
              {formatNumber(page, locale)}
            </Link>
          </span>
        );
      })}
      <Link
        aria-disabled={currentPage >= pageCount}
        className={cn(
          "inline-flex h-11 items-center justify-center rounded-full border border-black/12 bg-white px-4 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]",
          currentPage >= pageCount && "pointer-events-none opacity-45",
        )}
        href={getHref(Math.min(pageCount, currentPage + 1))}
      >
        {locale === "ko" ? "다음" : "Next"}
      </Link>
    </nav>
  );
}

export function FanletterNewsVlogsPage({
  data,
  locale,
  referralCode,
}: {
  data: FanletterFeedPageData;
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const effectiveReferralCode = referralCode ?? data.referralCode;
  const query = data.filters.query;
  const archiveBasePath = `/${locale}/fanletter/news/vlogs`;
  const archiveHref = getFanletterNewsVlogsHref({
    locale,
    query,
    referralCode: effectiveReferralCode,
    sort: data.filters.sort,
  });
  const homeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    effectiveReferralCode,
  );
  const charactersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    effectiveReferralCode,
  );
  const purchasesHref = buildPathWithReferral(
    `/${locale}/fanletter/news/purchases`,
    effectiveReferralCode,
  );
  const walletHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/wallet`, effectiveReferralCode),
    { returnTo: archiveHref },
  );
  const navLinks = [
    { href: homeHref, label: copy.navItems[0] },
    { href: charactersHref, label: copy.navItems[1] },
    { href: archiveHref, label: copy.navItems[2] },
    { href: purchasesHref, label: copy.navItems[3] },
  ];
  const sortOptions: Array<{ label: string; sort: FanletterFeedSort }> = [
    { label: copy.latest, sort: "latest" },
    { label: copy.popular, sort: "popular" },
    { label: copy.comments, sort: "comments" },
    { label: copy.saves, sort: "saves" },
  ];
  const featuredItems = [...data.items, ...data.fanOnlyPreviewItems]
    .filter((item) => item.coverImageUrl)
    .slice(0, 4);
  const currentPage = data.filters.page;
  const pageCount = data.filters.pageCount;
  const hasPublicItems = data.items.length > 0;
  const hasFanOnlyTeasers =
    currentPage === 1 && !query && data.fanOnlyPreviewItems.length > 0;

  return (
    <main className="min-h-screen bg-[#eef1ec] pb-14 text-[#111510]">
      <NewsShellHeader
        copy={copy}
        homeHref={homeHref}
        locale={locale}
        navLinks={navLinks}
        referralCode={effectiveReferralCode}
        walletHref={walletHref}
      />

      <section className="mx-auto max-w-[92rem] px-3 pb-10 pt-4 sm:px-6 sm:pt-8 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-stretch">
          <header className="border border-black/12 bg-white p-4 shadow-[0_18px_54px_rgba(17,21,16,0.08)] sm:p-6 lg:p-8">
            <Link
              className="inline-flex items-center gap-2 text-sm font-black !text-[#16702e] hover:!text-[#0f5522]"
              href={homeHref}
            >
              <ArrowLeft className="size-4" />
              {copy.cta.newsHome}
            </Link>
            <p className="mt-5 text-[0.7rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
              {copy.archive.eyebrow}
            </p>
            <h1 className="mt-3 max-w-4xl break-words text-[2rem] font-black leading-[1.08] tracking-normal [word-break:keep-all] sm:text-[3rem] lg:text-[3.25rem]">
              {copy.archive.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-black/62 sm:text-lg sm:leading-8">
              {copy.archive.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <MetricPill
                icon={<Clapperboard className="size-3.5" />}
                label={copy.archive.publicTitle}
                value={formatNumber(data.filters.totalCount, locale)}
              />
              <MetricPill
                icon={<LockKeyhole className="size-3.5" />}
                label={copy.archive.fanOnlyTitle}
                value={formatNumber(data.fanOnlyPreviewItems.length, locale)}
              />
            </div>
          </header>

          <aside className="overflow-hidden border border-black/12 bg-[#111510] p-3 text-white shadow-[0_18px_54px_rgba(17,21,16,0.12)]">
            {featuredItems.length > 0 ? (
              <div className="grid h-full min-h-[18rem] grid-cols-2 gap-2">
                {featuredItems.map((item, index) => (
                  <Link
                    className={cn(
                      "relative min-h-[8.5rem] overflow-hidden rounded-lg bg-black",
                      index === 0 && "col-span-2",
                    )}
                    href={getFanletterNewsVlogHref({
                      contentId: item.contentId,
                      locale,
                      referralCode: effectiveReferralCode,
                      returnToHref: archiveHref,
                    })}
                    key={item.contentId}
                  >
                    {item.coverImageUrl ? (
                      <Image
                        alt=""
                        aria-hidden="true"
                        className={cn(
                          "object-cover opacity-82 transition hover:scale-[1.03]",
                          item.contentMaturityRating === "nsfw" &&
                            !data.nsfwOptInEnabled &&
                            "scale-[1.04] blur-md brightness-[0.68] saturate-[0.84]",
                        )}
                        fill
                        loading="eager"
                        sizes="(max-width: 1024px) 50vw, 12rem"
                        src={item.coverImageUrl}
                        unoptimized={shouldBypassFanletterImageOptimization(
                          item.coverImageUrl,
                        )}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/10 to-transparent" />
                    <span className="absolute bottom-2 left-2 right-2 line-clamp-2 text-xs font-black leading-4 text-white">
                      {item.title}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex h-full min-h-[18rem] flex-col items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] p-6 text-center">
                <Clapperboard className="size-10 text-[#44f26e]" />
                <p className="mt-3 text-lg font-black">{copy.empty}</p>
              </div>
            )}
          </aside>
        </div>

        <div className="mt-5 rounded-lg border border-black/10 bg-white p-3 shadow-[0_12px_32px_rgba(8,18,12,0.06)] lg:flex lg:items-center lg:justify-between lg:gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-black/42">
              {copy.sort}
            </p>
            <p className="mt-1 text-lg font-black">
              {copy.archive.allCount(formatNumber(data.filters.totalCount, locale))}
            </p>
          </div>
          <form
            action={archiveBasePath}
            className="mt-3 flex min-w-0 flex-1 items-center gap-2 lg:mt-0 lg:max-w-md"
            method="get"
          >
            {effectiveReferralCode ? (
              <input name="ref" type="hidden" value={effectiveReferralCode} />
            ) : null}
            {data.filters.sort !== "latest" ? (
              <input name="sort" type="hidden" value={data.filters.sort} />
            ) : null}
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{copy.archive.searchPlaceholder}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/38" />
              <input
                className="h-11 w-full rounded-full border border-black/10 bg-[#f6f8f4] pl-9 pr-3 text-sm font-bold text-[#111510] outline-none transition placeholder:text-black/38 focus:border-[#19b84b] focus:bg-white"
                defaultValue={query}
                name="q"
                placeholder={copy.archive.searchPlaceholder}
                type="search"
              />
            </label>
            <button
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[#111510] px-4 text-sm font-black !text-white transition hover:bg-[#16702e]"
              type="submit"
            >
              {copy.archive.searchSubmit}
            </button>
          </form>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex lg:mt-0">
            {sortOptions.map((option) => {
              const active = option.sort === data.filters.sort;

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-black transition",
                    active
                      ? "bg-[#111510] !text-white"
                      : "border border-black/10 !text-black/58 hover:border-[#19b84b] hover:bg-[#ecfff0] hover:!text-[#111510]",
                  )}
                  href={getFanletterNewsVlogsHref({
                    locale,
                    query,
                    referralCode: effectiveReferralCode,
                    sort: option.sort,
                  })}
                  key={option.sort}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>

        <FanletterNsfwOptInControl
          className="mt-5"
          enabled={data.nsfwOptInEnabled}
          hiddenCount={data.hiddenNsfwCount}
          locale={locale}
        />

        {hasFanOnlyTeasers ? (
          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">{copy.archive.fanOnlyTitle}</h2>
              <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-black text-black/52">
                {formatNumber(data.fanOnlyPreviewItems.length, locale)}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {data.fanOnlyPreviewItems.map((item) => (
                <NewsVlogCard
                  copy={copy}
                  href={getFanletterNewsVlogHref({
                    contentId: item.contentId,
                    locale,
                    referralCode: effectiveReferralCode,
                    returnToHref: archiveHref,
                  })}
                  item={item}
                  key={item.contentId}
                  locale={locale}
                  nsfwOptInEnabled={data.nsfwOptInEnabled}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">{copy.archive.publicTitle}</h2>
            <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-black text-black/52">
              {formatNumber(data.items.length, locale)}
            </span>
          </div>
          {hasPublicItems ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.items.map((item) => (
                <NewsVlogCard
                  copy={copy}
                  href={getFanletterNewsVlogHref({
                    contentId: item.contentId,
                    locale,
                    referralCode: effectiveReferralCode,
                    returnToHref: archiveHref,
                  })}
                  item={item}
                  key={item.contentId}
                  locale={locale}
                  nsfwOptInEnabled={data.nsfwOptInEnabled}
                  reportHref={getFanletterNewsReportSourceHref({
                    contentId: item.contentId,
                    locale,
                    referralCode: effectiveReferralCode,
                  })}
                />
              ))}
            </div>
          ) : (
            <div className="border border-black/12 bg-white p-8 text-center shadow-[0_14px_40px_rgba(17,21,16,0.06)]">
              <Clapperboard className="mx-auto size-10 text-[#16702e]" />
              <p className="mt-4 text-lg font-black">{copy.empty}</p>
              <Link
                className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#111510] px-5 text-sm font-black !text-white"
                href={homeHref}
              >
                {copy.cta.newsHome}
              </Link>
            </div>
          )}
        </section>

        <Pagination
          currentPage={currentPage}
          getHref={(page) =>
            getFanletterNewsVlogsHref({
              locale,
              page,
              query,
              referralCode: effectiveReferralCode,
              sort: data.filters.sort,
            })
          }
          locale={locale}
          pageCount={pageCount}
        />
      </section>
    </main>
  );
}

export function FanletterNewsCharacterVlogsPage({
  data,
  locale,
  referralCode,
}: {
  data: FanletterCreatorVlogsPageData;
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const effectiveReferralCode = referralCode ?? data.profile.referralCode;
  const characterName = data.profile.character?.name ?? data.profile.displayName;
  const characterSummary = data.profile.character?.summary || data.profile.intro;
  const homeHref = buildPathWithReferral(`/${locale}/fanletter/news`, effectiveReferralCode);
  const charactersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    effectiveReferralCode,
  );
  const characterHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters/${data.profile.referralCode}`,
    effectiveReferralCode,
  );
  const requestHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters/${data.profile.referralCode}/request`,
    effectiveReferralCode,
  );
  const archiveHref = getFanletterNewsCharacterVlogsHref({
    creatorReferralCode: data.profile.referralCode,
    locale,
    referralCode: effectiveReferralCode,
    sort: data.filters.sort,
  });
  const listHref = `${archiveHref}#fanletter-news-character-public-vlogs`;
  const reportSourceHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/reports/new`, effectiveReferralCode),
    {
      q: characterName,
      reportStatus: "all",
      sourceReveal: "all",
      sourceSort: "latest",
    },
  );
  const purchasesHref = buildPathWithReferral(
    `/${locale}/fanletter/news/purchases`,
    effectiveReferralCode,
  );
  const walletHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/wallet`, effectiveReferralCode),
    { returnTo: archiveHref },
  );
  const avatarImageUrl = getCharacterAvatarUrl(data);
  const featuredCoverImageUrl = data.items[0]?.coverImageUrl ?? avatarImageUrl;
  const sortOptions: Array<{ label: string; sort: FanletterFeedSort }> = [
    { label: copy.latest, sort: "latest" },
    { label: copy.popular, sort: "popular" },
    { label: copy.comments, sort: "comments" },
    { label: copy.saves, sort: "saves" },
  ];
  const navLinks = [
    { href: homeHref, label: copy.navItems[0] },
    { href: charactersHref, label: copy.navItems[1] },
    { href: archiveHref, label: copy.navItems[2] },
    { href: purchasesHref, label: copy.navItems[3] },
  ];
  const currentPage = data.filters.page;
  const pageCount = data.filters.pageCount;

  return (
    <main className="min-h-screen bg-[#eef1ec] pb-14 text-[#111510]">
      <NewsShellHeader
        copy={copy}
        homeHref={homeHref}
        locale={locale}
        navLinks={navLinks}
        referralCode={effectiveReferralCode}
        walletHref={walletHref}
      />

      <section className="mx-auto max-w-[92rem] px-3 pb-10 pt-4 sm:px-6 sm:pt-8 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch">
          <header className="border border-black/12 bg-white p-4 shadow-[0_18px_54px_rgba(17,21,16,0.08)] sm:p-6 lg:p-8">
            <Link
              className="inline-flex items-center gap-2 text-sm font-black !text-[#16702e] hover:!text-[#0f5522]"
              href={characterHref}
            >
              <ArrowLeft className="size-4" />
              {copy.cta.character}
            </Link>
            <p className="mt-5 text-[0.7rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
              {copy.list.eyebrow}
            </p>
            <h1 className="mt-3 max-w-4xl break-words text-[2rem] font-black leading-[1.08] tracking-normal [word-break:keep-all] sm:text-[3rem] lg:text-[3.25rem]">
              {copy.list.title(characterName)}
            </h1>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-black/62 sm:text-lg sm:leading-8">
              {copy.list.description(characterName)}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <MetricPill
                icon={<Clapperboard className="size-3.5" />}
                label={copy.cta.archive}
                value={formatNumber(data.publicContentCount, locale)}
              />
              <MetricPill
                icon={<LockKeyhole className="size-3.5" />}
                label={copy.access.fanOnly}
                value={formatNumber(data.fanOnlyContentCount, locale)}
              />
            </div>
          </header>

          <aside className="relative min-h-[18rem] overflow-hidden border border-black/12 bg-[#111510] text-white shadow-[0_18px_54px_rgba(17,21,16,0.12)]">
            {featuredCoverImageUrl ? (
              <Image
                alt=""
                aria-hidden="true"
                className="object-cover opacity-78"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 22rem"
                src={featuredCoverImageUrl}
                unoptimized={shouldBypassFanletterImageOptimization(featuredCoverImageUrl)}
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/8" />
            <div className="relative flex h-full min-h-[18rem] flex-col justify-end p-5">
              <span className="inline-flex w-fit rounded-full bg-[#44f26e] px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-black">
                {copy.character}
              </span>
              <h2 className="mt-3 break-words text-2xl font-black leading-tight [word-break:keep-all]">
                {characterName}
              </h2>
              <p className="mt-2 line-clamp-4 text-sm font-semibold leading-6 text-white/72">
                {characterSummary}
              </p>
            </div>
          </aside>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <section className="border border-black/12 bg-white p-4 shadow-[0_12px_32px_rgba(8,18,12,0.06)]">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ecfff0] text-[#16702e]">
                <PlayCircle className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-[#16702e]">
                  {copy.list.audience.fanTitle}
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-black/58">
                  {copy.list.audience.fanBody}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-4 text-sm font-black !text-white transition hover:bg-[#16702e]"
                href={listHref}
              >
                {copy.list.audience.fanCta}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/12 px-4 text-sm font-black !text-[#111510] transition hover:border-[#16702e] hover:bg-[#ecfff0]"
                href={requestHref}
              >
                <MessageCircleHeart className="size-4 text-[#16702e]" />
                {copy.list.audience.fanRequestCta}
              </Link>
            </div>
          </section>

          <section className="border border-[#16702e]/24 bg-[#07100b] p-4 text-white shadow-[0_12px_32px_rgba(8,18,12,0.1)]">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-black">
                <Newspaper className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-[#9bffad]">
                  {copy.list.audience.reporterTitle}
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-white/68">
                  {copy.list.audience.reporterBody}
                </p>
              </div>
            </div>
            <Link
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-black transition hover:bg-[#69ff8c]"
              href={reportSourceHref}
            >
              {copy.list.audience.reporterCta}
              <ArrowRight className="size-4" />
            </Link>
          </section>
        </div>

        <div
          className="mt-5 scroll-mt-24 rounded-lg border border-black/10 bg-white p-3 shadow-[0_12px_32px_rgba(8,18,12,0.06)] sm:flex sm:items-center sm:justify-between"
          id="fanletter-news-character-public-vlogs"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-black/42">
              {copy.sort}
            </p>
            <p className="mt-1 text-lg font-black">
              {copy.list.allCount(formatNumber(data.publicContentCount, locale))}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-0 sm:flex">
            {sortOptions.map((option) => {
              const active = option.sort === data.filters.sort;

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-black transition",
                    active
                      ? "bg-[#111510] !text-white"
                      : "border border-black/10 !text-black/58 hover:border-[#19b84b] hover:bg-[#ecfff0] hover:!text-[#111510]",
                  )}
                  href={getFanletterNewsCharacterVlogsHref({
                    creatorReferralCode: data.profile.referralCode,
                    locale,
                    referralCode: effectiveReferralCode,
                    sort: option.sort,
                  })}
                  key={option.sort}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>

        <FanletterNsfwOptInControl
          className="mt-5"
          enabled={data.nsfwOptInEnabled}
          hiddenCount={data.hiddenNsfwCount}
          locale={locale}
        />

        {data.items.length > 0 ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((item) => {
              const href = getFanletterNewsVlogHref({
                contentId: item.contentId,
                locale,
                referralCode: effectiveReferralCode,
                returnToHref: archiveHref,
              });

              return (
                <NewsVlogCard
                  copy={copy}
                  href={href}
                  item={item}
                  key={item.contentId}
                  locale={locale}
                  nsfwOptInEnabled={data.nsfwOptInEnabled}
                  reportHref={getFanletterNewsReportSourceHref({
                    contentId: item.contentId,
                    locale,
                    referralCode: effectiveReferralCode,
                  })}
                />
              );
            })}
          </div>
        ) : (
          <div className="mt-5 border border-black/12 bg-white p-8 text-center shadow-[0_14px_40px_rgba(17,21,16,0.06)]">
            <Clapperboard className="mx-auto size-10 text-[#16702e]" />
            <p className="mt-4 text-lg font-black">{copy.empty}</p>
            <Link
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#111510] px-5 text-sm font-black !text-white"
              href={characterHref}
            >
              {copy.cta.character}
            </Link>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          getHref={(page) =>
            getFanletterNewsCharacterVlogsHref({
              creatorReferralCode: data.profile.referralCode,
              locale,
              page,
              referralCode: effectiveReferralCode,
              sort: data.filters.sort,
            })
          }
          locale={locale}
          pageCount={pageCount}
        />
      </section>
    </main>
  );
}

function NewsReportCard({
  locale,
  referralCode,
  report,
}: {
  locale: Locale;
  referralCode: string | null;
  report: FanletterNewsReportDocument;
}) {
  const publishedAt = formatDate(report.createdAt, locale);
  const href = buildPathWithReferral(
    `/${locale}/fanletter/news/${report.reportId}`,
    referralCode,
  );

  return (
    <Link
      className="group grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-3 border-b border-black/10 pb-4 transition last:border-b-0 last:pb-0 hover:border-[#19b84b]"
      href={href}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-[#111510]">
        {report.coverImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover transition duration-300 group-hover:scale-[1.04]"
            fill
            sizes="6rem"
            src={report.coverImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(report.coverImageUrl)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/68">
            <Newspaper className="size-7 text-[#44f26e]" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 break-words text-sm font-black leading-5 [word-break:keep-all]">
          {getFanletterNewsArticleDisplayTitle(report.title)}
        </p>
        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-black/58">
          {report.dek}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[0.66rem] font-bold uppercase tracking-[0.1em] text-black/44">
          {publishedAt ? <span>{publishedAt}</span> : null}
          <span>{report.reporterName}</span>
        </div>
      </div>
    </Link>
  );
}

function RelatedVlogRow({
  copy,
  href,
  item,
  locale,
  nsfwOptInEnabled,
}: {
  copy: ReturnType<typeof getCopy>;
  href: string;
  item: FanletterPublicContentItem;
  locale: Locale;
  nsfwOptInEnabled: boolean;
}) {
  const blurred = item.contentMaturityRating === "nsfw" && !nsfwOptInEnabled;
  const publishedAt = formatDate(item.publishedAt, locale);
  const sourceReveal = getSourceRevealCardState(item);
  const countLabel = formatNumber(sourceReveal.clampedCount, locale);
  const thresholdLabel = formatNumber(sourceReveal.threshold, locale);
  const remainingLabel = formatNumber(sourceReveal.remaining, locale);
  const sourceRevealStatus = sourceReveal.unlocked
    ? copy.sourceReveal.complete
    : sourceReveal.requestedByViewer
      ? copy.sourceReveal.requested
      : copy.sourceReveal.remaining(remainingLabel);

  return (
    <Link
      className="group grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-3 border-b border-black/10 pb-4 transition last:border-b-0 last:pb-0 hover:border-[#19b84b]"
      href={href}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-[#111510]">
        {item.coverImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className={cn(
              "object-cover transition duration-300 group-hover:scale-[1.04]",
              blurred && "scale-[1.04] blur-md brightness-[0.68]",
            )}
            fill
            sizes="6rem"
            src={item.coverImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(item.coverImageUrl)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/68">
            <Clapperboard className="size-7 text-[#44f26e]" />
          </div>
        )}
        <div
          className={cn(
            "absolute inset-x-1.5 bottom-1.5 rounded-md border px-1.5 py-1 text-center text-[0.58rem] font-black leading-none text-white shadow-[0_8px_18px_rgba(0,0,0,0.24)] backdrop-blur",
            sourceReveal.unlocked
              ? "border-[#44f26e]/42 bg-[#123c20]/82"
              : "border-white/18 bg-black/72",
          )}
        >
          {countLabel}/{thresholdLabel}
        </div>
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "line-clamp-2 break-words text-sm font-black leading-5 [word-break:keep-all]",
            blurred && "select-none blur-[2px]",
          )}
        >
          {item.title}
        </p>
        <p className="mt-2 text-[0.66rem] font-black uppercase tracking-[0.1em] text-[#16702e]">
          {getAccessLabel(item, copy)}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[0.66rem] font-bold uppercase tracking-[0.1em] text-black/44">
          {publishedAt ? <span>{publishedAt}</span> : null}
          <span>
            {formatNumber(item.newsReportCount, locale)} {copy.reportUnit}
          </span>
        </div>
        <div
          className={cn(
            "mt-2 rounded-lg border px-2.5 py-2",
            sourceReveal.unlocked
              ? "border-[#19b84b]/24 bg-[#edfff2]"
              : "border-black/10 bg-[#f5f7f1]",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#16702e]">
              {sourceReveal.unlocked ? (
                <CheckCircle2 className="size-3.5 shrink-0" />
              ) : (
                <LockKeyhole className="size-3.5 shrink-0" />
              )}
              <span className="truncate">{copy.sourceReveal.label}</span>
            </span>
            <span className="shrink-0 text-[0.62rem] font-black text-black/58">
              {sourceRevealStatus}
            </span>
          </div>
          <SourceRevealProgressBar
            className="mt-1.5 h-1.5"
            percent={sourceReveal.percent}
            unlocked={sourceReveal.unlocked}
          />
        </div>
      </div>
    </Link>
  );
}

function SidePanel({
  children,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  eyebrow: React.ReactNode;
  title: string;
}) {
  return (
    <section className="overflow-hidden border border-black/12 bg-white text-[#111510] shadow-[0_14px_40px_rgba(17,21,16,0.06)]">
      <div className="border-b border-black/12 bg-[#f5f7f1] p-4">
        <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#16702e]">
          {eyebrow}
        </p>
        <h2 className="mt-2 break-words text-lg font-black leading-tight tracking-normal [word-break:keep-all]">
          {title}
        </h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function NewsVlogStatusTile({
  Icon,
  label,
  tone = "default",
}: {
  Icon: LucideIcon;
  label: string;
  tone?: "default" | "paid" | "success" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-black",
        tone === "paid"
          ? "border-[#19b84b]/24 bg-[#ecfff0] text-[#126c2c]"
          : tone === "success"
            ? "border-[#19b84b]/24 bg-[#111510] text-[#44f26e]"
            : tone === "warning"
              ? "border-rose-500/22 bg-rose-50 text-rose-700"
              : "border-black/10 bg-[#f5f7f1] text-black/58",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function FanletterNewsVlogDetailPage({
  content,
  locale,
  newsReportCount,
  newsReports,
  referralCode,
  returnToHref,
}: {
  content: FanletterPublicContentDetail;
  locale: Locale;
  newsReportCount: number;
  newsReports: FanletterNewsReportDocument[];
  referralCode: string | null;
  returnToHref: string | null;
}) {
  const copy = getCopy(locale);
  const effectiveReferralCode = referralCode ?? content.authorReferralCode;
  const characterName = content.authorCharacter?.name ?? content.authorName;
  const contentCharacterAvatarUrl =
    content.authorCharacter?.avatarImageSet[0]?.url ??
    content.authorAvatarImageUrl;
  const archiveHref = content.authorReferralCode
    ? getFanletterNewsCharacterVlogsHref({
        creatorReferralCode: content.authorReferralCode,
        locale,
        referralCode: effectiveReferralCode,
      })
    : buildPathWithReferral(`/${locale}/fanletter/news/characters`, effectiveReferralCode);
  const currentHref = buildPathWithReferral(
    `/${locale}/fanletter/news/vlogs/${content.contentId}`,
    effectiveReferralCode,
  );
  const homeHref = buildPathWithReferral(`/${locale}/fanletter/news`, effectiveReferralCode);
  const charactersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    effectiveReferralCode,
  );
  const characterHref = content.authorReferralCode
    ? buildPathWithReferral(
        `/${locale}/fanletter/news/characters/${content.authorReferralCode}`,
        effectiveReferralCode,
      )
    : charactersHref;
  const purchasesHref = buildPathWithReferral(
    `/${locale}/fanletter/news/purchases`,
    effectiveReferralCode,
  );
  const walletHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/wallet`, effectiveReferralCode),
    { returnTo: currentHref },
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, effectiveReferralCode),
    { returnTo: currentHref },
  );
  const pinUnlockHref = buildWalletUnlockHref({
    locale,
    referralCode: effectiveReferralCode,
    returnTo: currentHref,
  });
  const onboardingHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/onboarding`, effectiveReferralCode),
    { returnTo: currentHref },
  );
  const originalHref = buildPathWithReferral(
    `/${locale}/fanletter/content/${content.contentId}`,
    effectiveReferralCode,
  );
  const navLinks = [
    { href: homeHref, label: copy.navItems[0] },
    { href: charactersHref, label: copy.navItems[1] },
    { href: archiveHref, label: copy.navItems[2] },
    { href: purchasesHref, label: copy.navItems[3] },
  ];
  const isOwnContent = content.viewerRelation === "owner";
  const isPaidContent = content.priceType === "paid";
  const isNsfwContent = content.contentMaturityRating === "nsfw";
  const isViewerPaidPurchaser =
    isPaidContent && content.viewerHasPaidEntitlement && !isOwnContent;
  const requiresNsfwOptIn =
    isNsfwContent &&
    !content.nsfwOptInEnabled &&
    !isOwnContent &&
    !isViewerPaidPurchaser;
  const canViewerReadFullContent = content.canViewerAccess || isOwnContent;
  const canViewerPlayMedia = canViewerReadFullContent || isViewerPaidPurchaser;
  const paidContentLocked =
    isPaidContent &&
    !content.viewerHasPaidEntitlement &&
    !isOwnContent;
  const shouldBlurMedia = requiresNsfwOptIn;
  const primaryVideoUrl = content.contentVideoUrls[0] ?? content.primaryVideoUrl;
  const primaryImageUrl = content.coverImageUrl ?? content.contentImageUrls[0] ?? null;
  const sourceReveal = createFanletterNewsSourceRevealState(content.social);
  const sourceRevealLocked =
    content.mediaType === "video" &&
    content.priceType === "free" &&
    !sourceReveal.unlocked &&
    !isOwnContent;
  const lockedNsfwTeaserBlurred =
    isNsfwContent && (sourceRevealLocked || paidContentLocked);
  const sourceRevealTeaserBlurred =
    shouldBlurMedia || lockedNsfwTeaserBlurred;
  const publishedAt = formatDate(content.publishedAt, locale);
  const accessLabel = getAccessLabel(content, copy);
  const nsfwCopy = getFanletterNsfwCopy(locale);
  const paidUnlockAmount = content.priceUsdt ?? CONTENT_PAID_USDT_AMOUNT;
  const shouldRequireNsfwVideoPin =
    isNsfwContent && canViewerPlayMedia && Boolean(primaryVideoUrl);
  const statusBody = isPaidContent
    ? paidContentLocked
      ? copy.detail.paidLockedBody
      : isOwnContent
        ? copy.detail.ownerAccess
        : copy.detail.paidAccessibleBody
    : copy.detail.publicBody;
  const paidUnlockSectionId = "fanletter-news-vlog-paid-unlock";
  const paidUnlockHref = `${currentHref}#${paidUnlockSectionId}`;
  const detailBackHref = returnToHref ?? archiveHref;
  const relatedVlogs = content.authorRecentContent.filter(
    (item) => item.contentId !== content.contentId && item.priceType === "free",
  );

  return (
    <main className="min-h-screen bg-[#eef1ec] pb-14 text-[#111510]">
      <NewsShellHeader
        copy={copy}
        homeHref={homeHref}
        locale={locale}
        navLinks={navLinks}
        referralCode={effectiveReferralCode}
        walletHref={walletHref}
      />

      <article className="mx-auto max-w-[92rem] px-3 pb-12 pt-4 sm:px-6 sm:pt-8 lg:px-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22.5rem] xl:items-start">
          <div className="min-w-0">
            <header className="overflow-hidden border border-black/12 bg-white shadow-[0_18px_54px_rgba(17,21,16,0.08)]">
              <div className="border-b-2 border-[#111510] bg-[#111510] px-3 py-2.5 sm:px-6 sm:py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white/58">
                  <span className="text-[#44f26e]">{copy.detail.eyebrow}</span>
                  <span className="h-3 w-px bg-white/18" aria-hidden="true" />
                  <span>{accessLabel}</span>
                  {publishedAt ? (
                    <>
                      <span className="h-3 w-px bg-white/18" aria-hidden="true" />
                      <span>{publishedAt}</span>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="p-3.5 sm:p-6 lg:p-7">
                <Link
                  className="inline-flex items-center gap-2 text-sm font-black !text-[#16702e] hover:!text-[#0f5522]"
                  href={detailBackHref}
                >
                  <ArrowLeft className="size-4" />
                  {copy.detail.backToArchive}
                </Link>
                <h1 className="mt-4 max-w-5xl break-words text-[1.9rem] font-black leading-[1.1] tracking-normal [overflow-wrap:anywhere] [word-break:keep-all] sm:text-[3rem] sm:leading-[1.08] lg:text-[3.25rem]">
                  {content.title}
                </h1>
                <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-black/62 sm:text-lg sm:leading-8">
                  {content.summary || copy.detail.meta}
                </p>

                <div className="mt-5 rounded-2xl border border-black/10 bg-[#f5f7f1] p-3 sm:p-4">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <NewsVlogStatusTile
                      Icon={isPaidContent ? Coins : PlayCircle}
                      label={
                        isPaidContent
                          ? copy.detail.paidStatus(paidUnlockAmount)
                          : copy.access.public
                      }
                      tone={isPaidContent ? "paid" : "default"}
                    />
                    <NewsVlogStatusTile
                      Icon={
                        paidContentLocked || requiresNsfwOptIn
                          ? LockKeyhole
                          : isViewerPaidPurchaser || isOwnContent
                            ? CheckCircle2
                            : ShieldCheck
                      }
                      label={
                        paidContentLocked
                          ? copy.detail.unpaid
                          : requiresNsfwOptIn
                            ? nsfwCopy.disabledCta
                          : isViewerPaidPurchaser
                            ? copy.detail.purchased
                            : isOwnContent
                              ? copy.detail.ownerAccess
                              : copy.detail.viewable
                      }
                      tone={
                        paidContentLocked || requiresNsfwOptIn
                          ? "warning"
                          : "success"
                      }
                    />
                    <NewsVlogStatusTile
                      Icon={isNsfwContent ? ShieldCheck : CheckCircle2}
                      label={
                        isNsfwContent
                          ? shouldRequireNsfwVideoPin
                            ? copy.detail.pinRequired
                            : nsfwCopy.badge
                          : copy.detail.generalStatus
                      }
                      tone={isNsfwContent ? "warning" : "default"}
                    />
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-black/58">
                    {shouldRequireNsfwVideoPin
                      ? `${statusBody} ${copy.detail.pinRequired}.`
                      : statusBody}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Link
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-4 py-2 text-sm font-black !text-white transition hover:bg-[#16702e]"
                    href={characterHref}
                  >
                    <Sparkles className="size-4" />
                    {copy.cta.character}
                  </Link>
                  <Link
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/12 bg-[#f5f7f1] px-4 py-2 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                    href={originalHref}
                  >
                    <ExternalLink className="size-4 text-[#16702e]" />
                    {copy.cta.original}
                  </Link>
                  <FanletterChannelShareButton
                    className="!h-auto min-h-11 !rounded-full !border-black/12 !bg-[#f5f7f1] px-4 py-2 text-sm font-black !text-[#111510] hover:!border-[#19b84b] hover:!bg-[#ecfff0]"
                    href={currentHref}
                    locale={locale}
                    referralCode={effectiveReferralCode}
                    shareIdScope="news-vlog"
                    summary={content.summary}
                    title={content.title}
                    trackingSource="fanletter-news-vlog"
                  />
                </div>
              </div>
            </header>

            <section className="mt-5 overflow-hidden border border-black/12 bg-[#111510] text-white shadow-[0_18px_54px_rgba(17,21,16,0.12)]">
              {sourceRevealLocked ? (
                <NewsVlogSourceRevealTeaser
                  blurred={sourceRevealTeaserBlurred}
                  content={content}
                  locale={locale}
                  sourceReveal={sourceReveal}
                />
              ) : paidContentLocked ? (
                <NewsVlogPaidUnlockTeaser
                  blurred={sourceRevealTeaserBlurred}
                  content={content}
                  locale={locale}
                  paidUnlockAmount={paidUnlockAmount}
                  paidUnlockHref={paidUnlockHref}
                  showPaidUnlockCta
                />
              ) : (
                <FanletterResponsiveMediaFrame
                  alt={content.title}
                  blurred={sourceRevealTeaserBlurred}
                  eager
                  imageUrl={primaryImageUrl}
                  mediaType={content.mediaType}
                  nsfwPinGate={
                    shouldRequireNsfwVideoPin
                      ? {
                          connectHref,
                          enabled: true,
                          locale,
                          managePinHref: pinUnlockHref,
                          teaserBlurred: true,
                        }
                      : undefined
                  }
                  title={content.title}
                  videoUrl={canViewerPlayMedia ? primaryVideoUrl : null}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
                    <span className="inline-flex rounded-full bg-[#44f26e] px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.14em] text-black">
                      {accessLabel}
                    </span>
                    {content.contentMaturityRating === "nsfw" ? (
                      <span className="inline-flex rounded-full bg-rose-500 px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.14em] text-white">
                        {nsfwCopy.badge}
                      </span>
                    ) : null}
                  </div>
                </FanletterResponsiveMediaFrame>
              )}
              <div className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-5">
                <MetricPill
                  icon={<Heart className="size-3.5" />}
                  label={copy.stats.likes}
                  value={formatNumber(content.social.likeCount, locale)}
                />
                <MetricPill
                  icon={<MessageCircleHeart className="size-3.5" />}
                  label={copy.stats.comments}
                  value={formatNumber(content.social.commentCount, locale)}
                />
                <MetricPill
                  icon={<BookOpenCheck className="size-3.5" />}
                  label={copy.stats.saves}
                  value={formatNumber(content.social.saveCount, locale)}
                />
                <MetricPill
                  icon={<Newspaper className="size-3.5" />}
                  label={copy.stats.reports}
                  value={formatNumber(newsReportCount, locale)}
                />
                <MetricPill
                  icon={<Users className="size-3.5" />}
                  label={copy.sourceReveal.label}
                  value={`${formatNumber(
                    Math.min(sourceReveal.count, sourceReveal.threshold),
                    locale,
                  )}/${formatNumber(sourceReveal.threshold, locale)}`}
                />
              </div>
            </section>

            {requiresNsfwOptIn ? (
              <FanletterNsfwOptInControl
                className="mt-5"
                enabled={content.nsfwOptInEnabled}
                hiddenCount={1}
                locale={locale}
              />
            ) : null}

            {paidContentLocked ? (
              <section
                className="mt-5 scroll-mt-5 border border-black/12 bg-white p-4 shadow-[0_14px_40px_rgba(17,21,16,0.06)] sm:p-6"
                id={paidUnlockSectionId}
              >
                <div className="mb-4 flex items-start gap-3">
                  <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-black">
                    <LockKeyhole className="size-5" />
                  </span>
                  <div>
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                      AIAVpark Wallet
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      {copy.detail.lockedTitle}
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-black/58">
                      {copy.detail.lockedBody}
                    </p>
                  </div>
                </div>
                <FanletterPaidUnlockPanel
                  autoOpenHash={`#${paidUnlockSectionId}`}
                  connectHref={connectHref}
                  contentId={content.contentId}
                  contentImageCount={content.contentImageCount}
                  contentMaturityRating={content.contentMaturityRating}
                  contentVideoCount={content.contentVideoCount}
                  creatorHref={characterHref}
                  currentHref={currentHref}
                  initialBody={content.body}
                  initialCoverImageUrl={primaryImageUrl}
                  initialSummary={content.summary}
                  initialTitle={content.title}
                  locale={locale}
                  onboardingHref={onboardingHref}
                  priceUsdt={paidUnlockAmount}
                  referralCode={effectiveReferralCode}
                  showTeaserPreview={false}
                  trackingSource="fanletter-news-vlog"
                />
              </section>
            ) : null}

            {canViewerReadFullContent && !sourceRevealLocked ? (
              <section className="mt-5 border border-black/12 bg-white p-4 shadow-[0_14px_40px_rgba(17,21,16,0.06)] sm:p-6">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                  {copy.bodyTitle}
                </p>
                <p className="mt-4 whitespace-pre-wrap break-words text-base font-semibold leading-8 text-black/70">
                  {content.body}
                </p>
              </section>
            ) : null}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-5">
            <section className="overflow-hidden border border-black/12 bg-white text-[#111510] shadow-[0_14px_40px_rgba(17,21,16,0.06)]">
              <div className="p-4">
                <Link
                  className="flex min-w-0 items-center gap-3 rounded-lg border border-black/10 bg-[#f5f7f1] p-3 transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                  href={characterHref}
                >
                  <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111510] text-[#44f26e]">
                    {contentCharacterAvatarUrl ? (
                      <Image
                        alt=""
                        aria-hidden="true"
                        className="object-cover"
                        fill
                        sizes="3.5rem"
                        src={contentCharacterAvatarUrl}
                        unoptimized={shouldBypassFanletterImageOptimization(
                          contentCharacterAvatarUrl,
                        )}
                      />
                    ) : (
                      <Sparkles className="size-6" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.66rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                      {copy.character}
                    </span>
                    <span className="mt-1 block truncate text-lg font-black">
                      {characterName}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-[#16702e]" />
                </Link>
              </div>
            </section>

            <SidePanel
              eyebrow={
                <>
                  <Newspaper className="size-3.5" />
                  Fan Reports
                </>
              }
              title={copy.contentReports}
            >
              {newsReports.length > 0 ? (
                <div className="grid gap-4">
                  {newsReports.map((report) => (
                    <NewsReportCard
                      key={report.reportId}
                      locale={locale}
                      referralCode={effectiveReferralCode}
                      report={report}
                    />
                  ))}
                </div>
              ) : (
                <p className="border border-black/10 bg-[#f5f7f1] p-4 text-sm font-semibold leading-6 text-black/52">
                  {copy.contentReportsEmpty}
                </p>
              )}
            </SidePanel>

            <SidePanel
              eyebrow={
                <>
                  <Clapperboard className="size-3.5" />
                  More Vlogs
                </>
              }
              title={copy.relatedVlogs}
            >
              {relatedVlogs.length > 0 ? (
                <div className="grid gap-4">
                  {relatedVlogs.slice(0, 4).map((item) => (
                    <RelatedVlogRow
                      copy={copy}
                      href={getFanletterNewsVlogHref({
                        contentId: item.contentId,
                        locale,
                        referralCode: effectiveReferralCode,
                        returnToHref: archiveHref,
                      })}
                      item={item}
                      key={item.contentId}
                      locale={locale}
                      nsfwOptInEnabled={content.nsfwOptInEnabled}
                    />
                  ))}
                </div>
              ) : (
                <p className="border border-black/10 bg-[#f5f7f1] p-4 text-sm font-semibold leading-6 text-black/52">
                  {copy.relatedVlogsEmpty}
                </p>
              )}
            </SidePanel>

            <Link
              className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-[#16702e]"
              href={homeHref}
            >
              <RotateCcw className="size-4" />
              {copy.footerCta}
            </Link>
          </aside>
        </div>
      </article>
    </main>
  );
}
