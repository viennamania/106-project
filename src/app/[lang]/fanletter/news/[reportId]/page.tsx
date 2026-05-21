import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import Image from "next/image";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  Clapperboard,
  Coins,
  FileText,
  ImageIcon,
  LockKeyhole,
  MessageCircleHeart,
  Newspaper,
  PlayCircle,
  RotateCcw,
} from "lucide-react";

import { FanletterNewsCharacterImageSelector } from "@/components/fanletter-news-character-image-selector";
import { FanletterNewsRelatedList } from "@/components/fanletter-news-related-list";
import { FanletterNewsWalletConnect } from "@/components/fanletter-news-wallet-connect";
import { FanletterNsfwOptInControl } from "@/components/fanletter-nsfw-opt-in-control";
import { FanletterChannelShareButton } from "@/components/fanletter-channel-share-button";
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
  getFanletterPublicContentDetail,
  type FanletterPublicContentDetail,
  type FanletterPublicContentItem,
} from "@/lib/fanletter-content-service";
import {
  createFanletterNewsReportShareHref,
  getFanletterNewsReportById,
  getFanletterNewsReportCoverOptions,
  getFanletterNewsReporterMemberByEmail,
  getFanletterNewsReporterProfile,
  getRelatedFanletterNewsReports,
  updateFanletterNewsReportCoverImage,
  type FanletterNewsReportCoverOption,
  type FanletterNewsReporterProfile,
} from "@/lib/fanletter-news-report-service";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import {
  getFanletterNewsArticleDisplayTitle as getArticleDisplayTitle,
  getFanletterNewsReporterDisplayName as getReporterDisplayName,
  isFanletterNewsReportNsfw as isNsfwReport,
  serializeFanletterRelatedNewsItem,
  shouldBlurFanletterNewsReport as shouldBlurReport,
} from "@/lib/fanletter-news-related";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import {
  defaultLocale,
  hasLocale,
  type Locale,
} from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import { readMemberServerSession } from "@/lib/member-server-session";

type FanletterNewsReportSearchParams = {
  ref?: string | string[];
};

const RELATED_NEWS_PAGE_SIZE = 4;
const RELATED_NEWS_FETCH_LIMIT = RELATED_NEWS_PAGE_SIZE + 1;

function getFormString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function updateFanletterNewsReportCoverImageAction(formData: FormData) {
  "use server";

  const reportId = getFormString(formData.get("reportId"));
  const localeValue = getFormString(formData.get("locale"));
  const selectedCoverImageUrl = getFormString(
    formData.get("selectedCoverImageUrl"),
  );
  const locale = hasLocale(localeValue) ? (localeValue as Locale) : defaultLocale;

  if (!reportId) {
    throw new Error("reportId is required.");
  }

  const session = await readMemberServerSession();
  const authorization = await validateMemberWalletOwner({
    allowedStatuses: ["completed", "pending_payment"],
    email: session?.email,
    walletAddress: session?.walletAddress,
  });
  const reporterReferralCode = normalizeReferralCode(
    authorization.member?.referralCode,
  );

  if (authorization.error || !reporterReferralCode) {
    throw new Error("Member session is required to update this report cover.");
  }

  await updateFanletterNewsReportCoverImage({
    reportId,
    reporterReferralCode,
    selectedCoverImageUrl,
  });

  revalidatePath(`/${locale}/fanletter/news/${reportId}`);
  revalidatePath(`/${locale}/fanletter/news`);
  revalidatePath(`/${locale}/fanletter/reports`);
}

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        articleActions: {
          character: "캐릭터 채널",
          label: "기사 이동",
          newsHome: "뉴스 홈",
          sourceVlog: "원본 브이로그",
          wallet: "지갑",
        },
        aiReport: "AI 팬 리포트",
        articleEyebrow: "AI Character News",
        articleNotice:
          "이 글은 원본 브이로그의 공개 정보와 티저를 바탕으로 생성된 FanLetter AI 팬 리포트입니다. 실제 언론사의 독립 취재 기사로 표시하지 않습니다.",
        articleSection: "연예",
        byline: "팬 기자",
        characterIdentity: {
          channelCta: "캐릭터 채널 보기",
          galleryLabel: "아바타 무드",
          latestLabel: "최근 브이로그",
          profileLabel: "캐릭터 프로필",
          title: "AI 캐릭터 아이덴티티",
          traitLabel: "고정 특징",
        },
        characterStats: {
          level: "성장 단계",
          reactions: "팬 반응",
          vlogs: "브이로그",
        },
        contentBadge: {
          nsfw: "성인 팬 전용 표시",
          paid: "팬 전용 유료 브이로그",
          public: "공개 브이로그",
        },
        coverPicker: {
          autoSource: "자동 추천",
          body:
            "원본 브이로그에서 저장된 커버 후보 중 이 리포트에 사용할 대표 이미지를 선택합니다.",
          chooseLabel: "이 이미지 사용",
          currentLabel: "현재 사용 중",
          noAlternatives:
            "저장된 후보가 1개라 변경 가능한 다른 커버가 아직 없습니다.",
          sourceLabels: {
            ai: "AI 생성",
            auto: "자동 추천",
            content_image: "본문 이미지",
            frame: "영상 프레임",
            manual: "직접 업로드",
            primary: "원본 대표",
            reporter_cropped: "와이드 크롭",
          },
          title: "리포트 커버 이미지",
        },
        edition: "AI 캐릭터와 팬 참여를 다루는 FanLetter 온라인 뉴스",
        embeddedLocked:
          "잠금 콘텐츠는 공개 티저와 기사 작성 가능한 정보만 뉴스 화면에 표시됩니다.",
        embeddedLockedPaid: (amount: string) =>
          `전체 원본 브이로그는 팬 전용 유료 콘텐츠입니다. ${amount} 결제 후 이 뉴스 화면에서 바로 열립니다.`,
        embeddedTitle: "빌트인 원본 브이로그",
        embeddedUnlockBody:
          "결제 후 전체 원본 영상, 본문, 추가 미디어를 이 뉴스 화면에서 바로 이어봅니다.",
        embeddedUnlockCta: "결제하고 원본 보기",
        embeddedUnlockMeta: "전체 영상 · 본문 · 추가 미디어",
        embeddedUnlockTitle: "팬 전용 브이로그 잠금 해제",
        generated: "AI 생성",
        publishedLabel: "기사입력",
        navItems: ["AI 캐릭터", "팬 리포트", "브이로그 뉴스"],
        nsfwBlurNotice:
          "NSFW 보기 동의 전에는 원본 브이로그와 기사 본문 일부가 블러 처리됩니다.",
        nsfwControl: {
          disabledBody:
            "이 뉴스와 관련 NSFW 뉴스는 유지하되 원본 브이로그, 커버, 기사 본문을 블러 처리합니다. 켜면 선명하게 표시됩니다.",
          disabledTitle: "NSFW 뉴스 블러 처리",
          enabledBody:
            "NSFW 뉴스가 선명하게 표시됩니다. 끄면 이 뉴스와 관련 NSFW 뉴스가 다시 블러 처리됩니다.",
          enabledTitle: "NSFW 뉴스 표시 중",
          hiddenCountText: (count: string) =>
            `블러 처리된 NSFW 뉴스 ${count}개`,
        },
        relatedNews: "같은 캐릭터의 다른 뉴스",
        relatedNewsEmpty: "아직 이 캐릭터의 다른 뉴스가 없습니다.",
        relatedNewsError: "다른 뉴스를 불러오지 못했습니다. 다시 시도해 주세요.",
        relatedNewsLoadMore: "더 보기",
        relatedNewsLoading: "불러오는 중",
        reporterNewsCta: "이 기자 뉴스 보기",
        sourceContext: "기사 배경",
        sourceTitle: "원본 브이로그",
        summaryTitle: "기사 요약",
        visualCaption:
          "FanLetter News 대표 이미지. 원본 브이로그와 AI 캐릭터 리포트의 공개 정보를 바탕으로 표시됩니다.",
        visualLead: "기사 대표 이미지",
        walletConnect: {
          body:
            "팬 기자 활동, 팬 전용 브이로그 결제, 지갑 내역 확인을 보던 기사에서 바로 이어갈 수 있습니다.",
          eyebrow: "FanLetter Wallet",
          title: "기사에서 바로 지갑 연결",
        },
        sixW: {
          how: "어떻게",
          what: "무엇을",
          when: "언제",
          where: "어디서",
          who: "누가",
          why: "왜",
        },
        siteName: "FanLetter News",
      }
    : {
        articleActions: {
          character: "Character channel",
          label: "Story navigation",
          newsHome: "News home",
          sourceVlog: "Source vlog",
          wallet: "Wallet",
        },
        aiReport: "AI fan report",
        articleEyebrow: "AI Character News",
        articleNotice:
          "This is a FanLetter AI fan report generated from the public source vlog information and teaser. It is not presented as independently reported journalism.",
        articleSection: "Entertainment",
        byline: "Fan reporter",
        characterIdentity: {
          channelCta: "Open character channel",
          galleryLabel: "Avatar mood",
          latestLabel: "Latest vlog",
          profileLabel: "Character profile",
          title: "AI character identity",
          traitLabel: "Fixed traits",
        },
        characterStats: {
          level: "Growth level",
          reactions: "Fan reactions",
          vlogs: "Vlogs",
        },
        contentBadge: {
          nsfw: "Adult fan-only marker",
          paid: "Fan-only paid vlog",
          public: "Public vlog",
        },
        coverPicker: {
          autoSource: "Auto recommendation",
          body:
            "Choose the lead image this report should use from saved source-vlog cover candidates.",
          chooseLabel: "Use this image",
          currentLabel: "Currently used",
          noAlternatives:
            "Only one saved candidate is available, so there is no alternate cover yet.",
          sourceLabels: {
            ai: "AI generated",
            auto: "Auto recommendation",
            content_image: "Body image",
            frame: "Video frame",
            manual: "Manual upload",
            primary: "Source cover",
            reporter_cropped: "Wide crop",
          },
          title: "Report cover image",
        },
        edition: "FanLetter online news for AI characters and fan participation",
        embeddedLocked:
          "Locked content is represented with public teaser details available for the news page.",
        embeddedLockedPaid: (amount: string) =>
          `The full source vlog is fan-only paid content. Pay ${amount} to open it from this news page.`,
        embeddedTitle: "Built-in source vlog",
        embeddedUnlockBody:
          "Unlock the full source video, story body, and extra media directly on this news page.",
        embeddedUnlockCta: "Pay and watch source",
        embeddedUnlockMeta: "Full video · story · extra media",
        embeddedUnlockTitle: "Unlock fan-only vlog",
        generated: "AI generated",
        publishedLabel: "Published",
        navItems: ["AI characters", "Fan reports", "Vlog news"],
        nsfwBlurNotice:
          "The source vlog and parts of the article stay blurred before NSFW opt-in.",
        nsfwControl: {
          disabledBody:
            "This story and related NSFW stories remain available, with the source vlog, covers, and article body blurred until opt-in.",
          disabledTitle: "NSFW news blurred",
          enabledBody:
            "NSFW news is visible. Turn this off to blur this story and related NSFW stories again.",
          enabledTitle: "NSFW news visible",
          hiddenCountText: (count: string) => `${count} NSFW stories blurred`,
        },
        relatedNews: "More news from this character",
        relatedNewsEmpty: "No other news from this character yet.",
        relatedNewsError: "Could not load more news. Please try again.",
        relatedNewsLoadMore: "Load more",
        relatedNewsLoading: "Loading",
        reporterNewsCta: "View reporter news",
        sourceContext: "Story context",
        sourceTitle: "Source vlog",
        summaryTitle: "Story summary",
        visualCaption:
          "FanLetter News lead image, shown from the source vlog and AI character report context.",
        visualLead: "Lead image",
        walletConnect: {
          body:
            "Connect from this story to continue fan reporter actions, fan-only vlog payments, and wallet activity.",
          eyebrow: "FanLetter Wallet",
          title: "Connect your wallet from the story",
        },
        sixW: {
          how: "How",
          what: "What",
          when: "When",
          where: "Where",
          who: "Who",
          why: "Why",
        },
        siteName: "FanLetter News",
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

function splitArticleBody(body: string) {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getContentAccessLabel(
  item: Pick<FanletterPublicContentItem, "contentMaturityRating" | "priceType">,
  copy: ReturnType<typeof getCopy>,
) {
  if (item.contentMaturityRating === "nsfw") {
    return copy.contentBadge.nsfw;
  }

  return item.priceType === "paid"
    ? copy.contentBadge.paid
    : copy.contentBadge.public;
}

function getUniqueImageUrls(urls: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      urls
        .map((url) => url?.trim() ?? "")
        .filter((url): url is string => Boolean(url)),
    ),
  );
}

function NewsSiteHeader({
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
          <span className="hidden sm:inline">{copy.edition}</span>
        </div>
      </div>
      <div className="mx-auto flex max-w-[92rem] flex-col px-4 pt-3 sm:px-6 sm:pt-4 lg:px-8">
        <div className="flex items-end justify-between gap-4 border-b-2 border-[#111510] pb-2.5 sm:pb-3">
          <Link
            className="inline-flex min-w-0 items-center gap-3 break-words text-[1.82rem] font-black leading-none tracking-normal !text-[#111510] sm:text-[4rem]"
            href={homeHref}
          >
            {copy.siteName}
          </Link>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="hidden border border-black/14 px-3 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e] sm:inline-flex">
              {copy.articleEyebrow}
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

function ArticleActionLinks({
  copy,
  creatorHref,
  locale,
  newsHomeHref,
  referralCode,
  shareHref,
  shareSummary,
  shareTitle,
  sourceVlogHref,
}: {
  copy: ReturnType<typeof getCopy>;
  creatorHref: string;
  locale: Locale;
  newsHomeHref: string;
  referralCode: string | null;
  shareHref: string;
  shareSummary: string;
  shareTitle: string;
  sourceVlogHref: string;
}) {
  const actions = [
    {
      href: newsHomeHref,
      icon: <Newspaper className="size-4 text-[#16702e]" />,
      label: copy.articleActions.newsHome,
    },
    {
      href: sourceVlogHref,
      icon: <Clapperboard className="size-4 text-[#16702e]" />,
      label: copy.articleActions.sourceVlog,
    },
    {
      href: creatorHref,
      icon: <MessageCircleHeart className="size-4 text-[#16702e]" />,
      label: copy.articleActions.character,
    },
  ];

  return (
    <nav
      aria-label={copy.articleActions.label}
      className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
    >
      {actions.map((action) => (
        <Link
          className="inline-flex min-h-12 items-center justify-between gap-3 border border-black/12 bg-[#f5f7f1] px-3 py-2 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
          href={action.href}
          key={action.label}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            {action.icon}
            <span className="truncate">{action.label}</span>
          </span>
          <ArrowUpRight className="size-4 shrink-0 text-black/42" />
        </Link>
      ))}
      <FanletterChannelShareButton
        className="!h-auto min-h-12 !rounded-none !border-black/12 !bg-[#f5f7f1] px-3 py-2 text-sm font-black !text-[#111510] hover:!border-[#19b84b] hover:!bg-[#ecfff0]"
        href={shareHref}
        locale={locale}
        referralCode={referralCode}
        shareIdScope="newsreport"
        summary={shareSummary}
        title={shareTitle}
        trackingSource="fanletter-news-detail"
      />
    </nav>
  );
}

function MobileNewsBottomNav({
  copy,
  creatorHref,
  locale,
  newsHomeHref,
  referralCode,
  shareHref,
  shareSummary,
  shareTitle,
  sourceVlogHref,
  walletHref,
}: {
  copy: ReturnType<typeof getCopy>;
  creatorHref: string;
  locale: Locale;
  newsHomeHref: string;
  referralCode: string | null;
  shareHref: string;
  shareSummary: string;
  shareTitle: string;
  sourceVlogHref: string;
  walletHref: string;
}) {
  const items = [
    {
      href: newsHomeHref,
      icon: <Newspaper className="size-5" />,
      label: copy.articleActions.newsHome,
    },
    {
      href: sourceVlogHref,
      icon: <Clapperboard className="size-5" />,
      label: copy.articleActions.sourceVlog,
    },
    {
      href: creatorHref,
      icon: <MessageCircleHeart className="size-5" />,
      label: copy.articleActions.character,
    },
    {
      href: walletHref,
      icon: <Coins className="size-5" />,
      label: copy.articleActions.wallet,
    },
  ];

  return (
    <nav
      aria-label={copy.articleActions.label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/12 bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_38px_rgba(17,21,16,0.16)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map((item) => (
          <Link
            className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 text-center text-[0.64rem] font-black leading-none !text-black/56 transition hover:text-[#126c2c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#19b84b]"
            href={item.href}
            key={item.label}
          >
            <span className="text-[#16702e]">{item.icon}</span>
            <span className="block max-w-full truncate">{item.label}</span>
          </Link>
        ))}
        <FanletterChannelShareButton
          className="!h-auto min-h-14 w-full min-w-0 flex-col gap-1 !rounded-none !border-0 !bg-transparent px-1 py-0 text-center text-[0.64rem] font-black leading-none !text-black/56 hover:!bg-transparent hover:!text-[#126c2c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#19b84b]"
          href={shareHref}
          locale={locale}
          referralCode={referralCode}
          shareIdScope="newsreport"
          summary={shareSummary}
          title={shareTitle}
          trackingSource="fanletter-news-detail"
        />
      </div>
    </nav>
  );
}

function NewsWalletConnectCard({
  copy,
  locale,
  referralCode,
  walletHref,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  referralCode: string | null;
  walletHref: string;
}) {
  return (
    <section className="border border-black/12 bg-[#111510] p-4 text-white shadow-[0_18px_44px_rgba(12,18,14,0.16)]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#44f26e]">
        {copy.walletConnect.eyebrow}
      </p>
      <h2 className="mt-2 break-words text-xl font-black leading-tight [word-break:keep-all]">
        {copy.walletConnect.title}
      </h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-white/62">
        {copy.walletConnect.body}
      </p>
      <FanletterNewsWalletConnect
        className="mt-4 w-full max-w-none"
        locale={locale}
        referralCode={referralCode}
        walletHref={walletHref}
      />
    </section>
  );
}

function CharacterIdentityFeature({
  copy,
  creatorHref,
  locale,
  sourceContent,
}: {
  copy: ReturnType<typeof getCopy>;
  creatorHref: string;
  locale: Locale;
  sourceContent: FanletterPublicContentDetail | null;
}) {
  const character = sourceContent?.authorCharacter;
  const characterName = character?.name ?? sourceContent?.authorName ?? null;

  if (!characterName) {
    return null;
  }

  const avatarImages = getUniqueImageUrls([
    ...(character?.avatarImageSet ?? []).map((avatar) => avatar.url),
    sourceContent?.authorAvatarImageUrl,
  ]).slice(0, 4);
  const avatarImageOptions = avatarImages.map((imageUrl) => {
    const avatar = character?.avatarImageSet.find(
      (candidate) => candidate.url === imageUrl,
    );

    return {
      label: avatar?.label ?? avatar?.expression ?? null,
      url: imageUrl,
    };
  });
  const traits = (character?.traits ?? []).slice(0, 5);
  const reactionCount =
    (sourceContent?.social.likeCount ?? 0) +
    (sourceContent?.social.commentCount ?? 0) +
    (sourceContent?.social.saveCount ?? 0);
  const stats = [
    {
      label: copy.characterStats.level,
      value: character ? `Lv.${character.growth.level}` : "-",
    },
    {
      label: copy.characterStats.vlogs,
      value: sourceContent
        ? formatNumber(sourceContent.authorPublicContentCount, locale)
        : "-",
    },
    {
      label: copy.characterStats.reactions,
      value: sourceContent ? formatNumber(reactionCount, locale) : "-",
    },
  ];
  const latestTitle = character?.latestTitle ?? sourceContent?.title ?? null;

  return (
    <section className="mt-6 overflow-hidden border border-black/12 bg-[#f6f8f2] text-[#111510] shadow-[0_22px_60px_rgba(17,21,16,0.08)]">
      <div className="grid lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
        <FanletterNewsCharacterImageSelector
          avatarAlt={characterName}
          avatarImages={avatarImageOptions}
          galleryLabel={copy.characterIdentity.galleryLabel}
          generatedLabel={copy.generated}
        />

        <div className="flex min-h-full flex-col p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 border border-[#16702e]/24 bg-white px-2.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e] shadow-[0_8px_22px_rgba(17,21,16,0.06)]">
              <BadgeCheck className="size-3.5" />
              {copy.characterIdentity.title}
            </span>
            <span className="inline-flex border border-black/10 bg-[#111510] px-2.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white/78">
              {copy.characterIdentity.profileLabel}
            </span>
          </div>

          <h2 className="mt-4 break-words text-4xl font-black leading-tight [word-break:keep-all] sm:text-[3rem]">
            {characterName}
          </h2>
          <p className="mt-3 max-w-xl text-[1.02rem] font-medium leading-8 text-black/66 sm:text-lg sm:leading-8">
            {character?.summary ?? sourceContent?.summary}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2 border-y border-black/10 py-4">
            {stats.map((stat) => (
              <div
                className="min-w-0 border-r border-black/10 px-2 first:pl-0 last:border-r-0 last:pr-0"
                key={stat.label}
              >
                <p className="truncate text-2xl font-black text-[#111510]">
                  {stat.value}
                </p>
                <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/42">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {traits.length > 0 ? (
            <div className="mt-5">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#16702e]">
                {copy.characterIdentity.traitLabel}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {traits.map((trait) => (
                  <span
                    className="border border-black/10 bg-white px-3 py-2 text-xs font-bold leading-5 text-black/68 shadow-[0_8px_18px_rgba(17,21,16,0.04)]"
                    key={trait}
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {latestTitle ? (
            <div className="mt-5 border-l-4 border-[#44f26e] bg-white px-4 py-3 shadow-[0_10px_28px_rgba(17,21,16,0.05)]">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-black/42">
                {copy.characterIdentity.latestLabel}
              </p>
              <p className="mt-1 break-words text-sm font-bold leading-6 text-black/72 [word-break:keep-all]">
                {latestTitle}
              </p>
            </div>
          ) : null}

          <div className="mt-auto pt-5">
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#111510] px-4 py-3 text-sm font-black !text-white shadow-[0_18px_34px_rgba(17,21,16,0.18)] transition hover:bg-black sm:w-auto"
              href={creatorHref}
            >
              <MessageCircleHeart className="size-4 text-[#44f26e]" />
              {copy.characterIdentity.channelCta}
              <ArrowUpRight className="size-4 text-white/62" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReporterByline({
  copy,
  publishedAt,
  report,
  reporterProfile,
  reporterNewsHref,
}: {
  copy: ReturnType<typeof getCopy>;
  publishedAt: string | null;
  report: FanletterNewsReportDocument;
  reporterProfile: FanletterNewsReporterProfile | null;
  reporterNewsHref: string;
}) {
  const reporterDisplayName =
    reporterProfile?.displayName ?? getReporterDisplayName(report);
  const reporterAvatarImageUrl =
    reporterProfile?.avatarImageUrl ?? report.reporterAvatarImageUrl ?? null;
  const reporterInitial =
    reporterDisplayName.trim().charAt(0).toUpperCase() ||
    report.reporterReferralCode.trim().charAt(0).toUpperCase() ||
    report.reporterName.trim().charAt(0).toUpperCase() ||
    "F";

  return (
    <section className="mt-5 flex min-w-0 flex-col gap-3 border-y border-black/12 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111510] text-sm font-black text-[#44f26e]">
          {reporterAvatarImageUrl ? (
            <Image
              alt=""
              aria-hidden="true"
              className="object-cover"
              fill
              sizes="2.75rem"
              src={reporterAvatarImageUrl}
              unoptimized={shouldBypassFanletterImageOptimization(
                reporterAvatarImageUrl,
              )}
            />
          ) : (
            reporterInitial
          )}
        </span>
        <div className="min-w-0">
          <p className="text-[0.72rem] font-bold text-black/46">
            {copy.byline}
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-[#111510]">
            {reporterDisplayName}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-black/48">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {publishedAt ? (
            <span>
              {copy.publishedLabel} {publishedAt}
            </span>
          ) : null}
          <span>{copy.generated}</span>
        </div>
        <Link
          className="inline-flex h-8 items-center justify-center border border-black/14 px-3 text-xs font-black text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
          href={reporterNewsHref}
        >
          {copy.reporterNewsCta}
        </Link>
      </div>
    </section>
  );
}

function ArticleVisualLead({
  accessLabel,
  blurred,
  copy,
  report,
  sourceContent,
}: {
  accessLabel: string;
  blurred: boolean;
  copy: ReturnType<typeof getCopy>;
  report: FanletterNewsReportDocument;
  sourceContent: FanletterPublicContentDetail | null;
}) {
  const imageUrl =
    report.coverImageUrl ??
    sourceContent?.coverImageUrl ??
    sourceContent?.authorAvatarImageUrl ??
    null;
  const shouldBypassImageOptimization = imageUrl
    ? shouldBypassFanletterImageOptimization(imageUrl)
    : false;

  return (
    <figure className="mt-5 overflow-hidden border border-black/12 bg-[#111510] text-white shadow-[0_24px_64px_rgba(12,18,14,0.18)] sm:mt-6">
      <div
        className={`relative aspect-[16/10] overflow-hidden bg-[#111510] sm:aspect-[16/9] ${
          imageUrl ? "" : "min-h-[14rem]"
        }`}
      >
        {imageUrl ? (
          <>
            <Image
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-[1.08] object-cover object-center blur-xl brightness-[0.42] saturate-[0.9]"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 64rem"
              src={imageUrl}
              unoptimized={shouldBypassImageOptimization}
            />
            <Image
              alt={report.title}
              className={
                blurred
                  ? "relative z-10 object-contain blur-md brightness-[0.68] saturate-[0.86]"
                  : "relative z-10 object-contain"
              }
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 64rem"
              src={imageUrl}
              unoptimized={shouldBypassImageOptimization}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(145deg,#07100b,#111510_50%,#24372a)]">
            <Newspaper className="size-16 text-[#44f26e]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/18" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2 text-[0.66rem] font-black uppercase tracking-[0.12em] sm:left-5 sm:top-5">
          <span className="bg-[#44f26e] px-2.5 py-1.5 text-black">
            {copy.visualLead}
          </span>
          <span className="border border-white/24 bg-white/12 px-2.5 py-1.5 text-white/82 backdrop-blur">
            {accessLabel}
          </span>
        </div>
        {blurred ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/28 p-5 text-center">
            <div className="max-w-sm border border-white/14 bg-black/66 p-4">
              <AlertTriangle className="mx-auto size-7 text-rose-300" />
              <p className="mt-3 text-sm font-semibold leading-6 text-white/82">
                {copy.nsfwBlurNotice}
              </p>
            </div>
          </div>
        ) : null}
      </div>
      <figcaption className="border-t border-white/12 px-4 py-3 text-xs font-semibold leading-5 text-white/54">
        {copy.visualCaption}
      </figcaption>
    </figure>
  );
}

function formatCoverOptionTimestamp(
  timestampSec: number | null,
  locale: Locale,
) {
  if (timestampSec === null || !Number.isFinite(timestampSec)) {
    return null;
  }

  const totalSeconds = Math.max(0, Math.floor(timestampSec));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return locale === "ko"
    ? `${minutes}분 ${seconds.toString().padStart(2, "0")}초`
    : `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getCoverOptionSourceLabel(
  option: FanletterNewsReportCoverOption,
  copy: ReturnType<typeof getCopy>,
) {
  return copy.coverPicker.sourceLabels[option.source];
}

function ReportCoverImagePicker({
  blurred,
  copy,
  locale,
  options,
  report,
}: {
  blurred: boolean;
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  options: FanletterNewsReportCoverOption[];
  report: Pick<FanletterNewsReportDocument, "reportId">;
}) {
  if (options.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-5 scroll-mt-6 border border-black/12 bg-white p-4 shadow-[0_14px_42px_rgba(17,21,16,0.06)] sm:p-5"
      id="fanletter-news-cover-picker"
    >
      <div className="flex flex-col gap-3 border-b border-black/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#16702e]">
            <ImageIcon className="size-4" />
            {copy.coverPicker.autoSource}
          </p>
          <h2 className="mt-2 break-words text-2xl font-black leading-tight tracking-normal [word-break:keep-all]">
            {copy.coverPicker.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-black/58">
            {copy.coverPicker.body}
          </p>
        </div>
        {options.length <= 1 ? (
          <p className="border border-dashed border-black/14 bg-[#f5f6f2] px-3 py-2 text-xs font-bold leading-5 text-black/48">
            {copy.coverPicker.noAlternatives}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {options.map((option, index) => {
          const sourceLabel = getCoverOptionSourceLabel(option, copy);
          const timestamp = formatCoverOptionTimestamp(
            option.timestampSec,
            locale,
          );
          const label = option.isSelected
            ? copy.coverPicker.currentLabel
            : copy.coverPicker.chooseLabel;
          const shouldBypassCoverOptionImageOptimization =
            shouldBypassFanletterImageOptimization(option.imageUrl);

          return (
            <form
              action={updateFanletterNewsReportCoverImageAction}
              key={`${option.candidateId}-${option.imageUrl}`}
            >
              <input name="reportId" type="hidden" value={report.reportId} />
              <input name="locale" type="hidden" value={locale} />
              <input
                name="selectedCoverImageUrl"
                type="hidden"
                value={option.inputValue}
              />
              <button
                className={`group flex h-full w-full flex-col overflow-hidden border text-left transition ${
                  option.isSelected
                    ? "border-[#19b84b] bg-[#ecfff0] shadow-[0_12px_30px_rgba(25,184,75,0.14)]"
                    : "border-black/10 bg-[#f8f9f4] hover:border-[#19b84b] hover:bg-white"
                }`}
                disabled={option.isSelected}
                type="submit"
              >
                <span className="relative block aspect-[4/5] w-full overflow-hidden bg-[#111510] sm:aspect-[5/6]">
                  <Image
                    alt=""
                    aria-hidden="true"
                    className="scale-110 object-cover blur-xl brightness-[0.42] saturate-[0.9]"
                    fill
                    loading={index === 0 ? "eager" : "lazy"}
                    sizes="(max-width: 640px) 100vw, 260px"
                    src={option.imageUrl}
                    unoptimized={shouldBypassCoverOptionImageOptimization}
                  />
                  <Image
                    alt=""
                    aria-hidden="true"
                    className={
                      blurred
                        ? "object-contain blur-md brightness-[0.68] saturate-[0.86] transition duration-300 group-hover:scale-[1.02]"
                        : "object-contain transition duration-300 group-hover:scale-[1.02]"
                    }
                    fill
                    loading={index === 0 ? "eager" : "lazy"}
                    sizes="(max-width: 640px) 100vw, 260px"
                    src={option.imageUrl}
                    unoptimized={shouldBypassCoverOptionImageOptimization}
                  />
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 border border-white/18 bg-black/46 px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-white/78 backdrop-blur">
                    {option.isSelected ? (
                      <CheckCircle2 className="size-3.5 text-[#44f26e]" />
                    ) : (
                      <RotateCcw className="size-3.5 text-[#44f26e]" />
                    )}
                    {sourceLabel}
                  </span>
                </span>
                <span className="flex min-h-[5.4rem] w-full flex-col p-3">
                  <span className="line-clamp-1 text-sm font-black text-[#111510]">
                    {label}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[0.68rem] font-bold text-black/46">
                    {timestamp ? <span>{timestamp}</span> : null}
                    {option.contentType ? <span>{option.contentType}</span> : null}
                    {option.placements.length > 0 ? (
                      <span>{option.placements.join(", ")}</span>
                    ) : null}
                  </span>
                </span>
              </button>
            </form>
          );
        })}
      </div>
    </section>
  );
}

function SourceVlogEmbed({
  accessLabel,
  blurred,
  copy,
  isPaidContent,
  paidUnlockHref,
  reportCoverImageSource,
  priceUsdt,
  reportCoverImageUrl,
  sourceContent,
}: {
  accessLabel: string;
  blurred: boolean;
  copy: ReturnType<typeof getCopy>;
  isPaidContent: boolean;
  paidUnlockHref: string | null;
  reportCoverImageSource?: FanletterNewsReportDocument["coverImageSource"];
  priceUsdt: string | null;
  reportCoverImageUrl: string | null;
  sourceContent: FanletterPublicContentDetail | null;
}) {
  const sourceVideoUrl =
    sourceContent?.canViewerAccess ? sourceContent.contentVideoUrls[0] ?? null : null;
  const shouldUseReportCoverImage =
    reportCoverImageSource === "reporter_selected" ||
    reportCoverImageSource === "reporter_cropped";
  const sourceImageUrl =
    shouldUseReportCoverImage
      ? reportCoverImageUrl ??
        sourceContent?.coverImageUrl ??
        sourceContent?.contentImageUrls[0] ??
        null
      : sourceContent?.coverImageUrl ??
        sourceContent?.contentImageUrls[0] ??
        reportCoverImageUrl;
  const hasEmbeddedVideo = Boolean(sourceVideoUrl);
  const paidUnlockAmount = priceUsdt ?? CONTENT_PAID_USDT_AMOUNT;
  const paidUnlockLabel = `${paidUnlockAmount} USDT`;
  const shouldShowPaidUnlockPrompt =
    isPaidContent && !sourceContent?.canViewerAccess && Boolean(paidUnlockHref);
  const shouldShowPaidUnlockCta =
    isPaidContent && !sourceContent?.canViewerAccess && !blurred;
  const noticeMessage = blurred
    ? copy.nsfwBlurNotice
    : shouldShowPaidUnlockCta
      ? copy.embeddedLockedPaid(paidUnlockLabel)
      : copy.embeddedLocked;

  return (
    <section className="mt-7 border border-black/12 bg-white p-4 shadow-[0_14px_42px_rgba(17,21,16,0.06)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-[#111510]">
          <Clapperboard className="size-4 text-[#16702e]" />
          {copy.embeddedTitle}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-black/12 bg-[#f5f6f2] px-3 py-1 text-[0.68rem] font-bold text-black/64">
          <PlayCircle className="size-3.5" />
          {accessLabel}
        </span>
      </div>
      <div className="overflow-hidden border border-black/10 bg-black shadow-[0_20px_46px_rgba(17,21,16,0.1)]">
        <FanletterResponsiveMediaFrame
          alt={sourceContent?.title ?? copy.embeddedTitle}
          blurred={blurred}
          eager
          imageUrl={sourceImageUrl}
          mediaType={sourceContent?.mediaType ?? "video"}
          title={sourceContent?.title ?? copy.embeddedTitle}
          videoUrl={sourceVideoUrl}
        >
          {blurred || !hasEmbeddedVideo ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/34 p-5 text-center backdrop-blur-[1px]">
              <div className="max-w-sm rounded-lg border border-white/14 bg-black/68 p-4">
                {blurred ? (
                  <AlertTriangle className="mx-auto size-7 text-rose-300" />
                ) : (
                  <LockKeyhole className="mx-auto size-7 text-[#44f26e]" />
                )}
                <p className="mt-3 text-sm font-semibold leading-6 text-white/82">
                  {noticeMessage}
                </p>
                {shouldShowPaidUnlockCta && paidUnlockHref ? (
                  <FanletterPaidUnlockTrigger
                    className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-black transition hover:bg-[#69ff8c]"
                    href={paidUnlockHref}
                  >
                    <Coins className="size-4" />
                    <span>
                      {paidUnlockLabel} {copy.embeddedUnlockCta}
                    </span>
                  </FanletterPaidUnlockTrigger>
                ) : null}
              </div>
            </div>
          ) : null}
        </FanletterResponsiveMediaFrame>
      </div>
      {shouldShowPaidUnlockPrompt && paidUnlockHref ? (
        <div className="mt-3 grid gap-3 rounded-lg border border-[#1eb84a]/22 bg-[#f2fff5] p-3 shadow-[0_12px_30px_rgba(22,112,46,0.08)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex min-w-0 gap-3">
            <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#07150b] text-[#44f26e]">
              <LockKeyhole className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-[#111510]">
                {copy.embeddedUnlockTitle}
              </p>
              <p className="mt-1 text-sm font-medium leading-6 text-black/58">
                {copy.embeddedUnlockBody}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1eb84a]/20 bg-white px-2.5 py-1 text-[0.68rem] font-black text-[#126c2c]">
                  <Coins className="size-3.5" />
                  {paidUnlockLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[0.68rem] font-bold text-black/56">
                  <CheckCircle2 className="size-3.5 text-[#16702e]" />
                  {copy.embeddedUnlockMeta}
                </span>
              </div>
            </div>
          </div>
          <FanletterPaidUnlockTrigger
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#111510] px-4 text-sm font-black !text-white transition hover:bg-[#243026] sm:w-auto"
            href={paidUnlockHref}
          >
            <Coins className="size-4 text-[#44f26e]" />
            <span>{copy.embeddedUnlockCta}</span>
          </FanletterPaidUnlockTrigger>
        </div>
      ) : null}
      <p className="mt-2 text-xs font-medium leading-5 text-black/46">
        {sourceContent?.title ?? copy.sourceTitle}
      </p>
    </section>
  );
}

function SourceContextCard({
  accessLabel,
  blurred,
  copy,
  report,
  sourceVlogHref,
}: {
  accessLabel: string;
  blurred: boolean;
  copy: ReturnType<typeof getCopy>;
  report: FanletterNewsReportDocument;
  sourceVlogHref: string;
}) {
  const textBlurClass = blurred ? "select-none blur-[2px]" : "";

  return (
    <section className="border border-black/12 bg-white p-4 text-[#111510] shadow-[0_14px_40px_rgba(17,21,16,0.06)]">
      <div className="border-b border-black/12 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#16702e]">
              {copy.sourceContext}
            </p>
            <h2
              className={`mt-2 break-words text-xl font-black leading-tight [word-break:keep-all] ${textBlurClass}`}
            >
              {report.sourceTitle}
            </h2>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 border border-black/12 bg-[#f5f7f1] px-2.5 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.12em] text-black/58">
            <PlayCircle className="size-3.5 text-[#16702e]" />
            {accessLabel}
          </span>
        </div>
      </div>
      <p
        className={`mt-3 line-clamp-5 text-sm font-medium leading-6 text-black/58 ${textBlurClass}`}
      >
        {report.sourceSummary}
      </p>
      <Link
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-black/12 bg-[#f5f7f1] px-4 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
        href={sourceVlogHref}
      >
        <Clapperboard className="size-4 text-[#16702e]" />
        {copy.sourceTitle}
        <ArrowUpRight className="size-4 text-black/42" />
      </Link>
    </section>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; reportId: string }>;
}): Promise<Metadata> {
  const { lang, reportId } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const report = await getFanletterNewsReportById(reportId);
  const reportTitle = report ? getArticleDisplayTitle(report.title) : null;
  const title = report
    ? `${reportTitle} | FanLetter News`
    : locale === "ko"
      ? "FanLetter AI 팬 리포트"
      : "FanLetter AI fan report";
  const description =
    report?.dek ??
    (locale === "ko"
      ? "FanLetter 브이로그를 팬 기자 관점으로 정리한 AI 팬 리포트입니다."
      : "An AI fan report summarizing a FanLetter vlog from the fan reporter perspective.");
  const url = report
    ? createFanletterNewsReportShareHref(report)
    : `/${locale}/fanletter/news/${reportId}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      description,
      images: report?.coverImageUrl
        ? [
            {
              alt: report.title,
              url: report.coverImageUrl,
            },
          ]
        : undefined,
      siteName: "FanLetter News",
      title,
      type: "article",
      url,
    },
    twitter: {
      card: report?.coverImageUrl ? "summary_large_image" : "summary",
      description,
      images: report?.coverImageUrl ? [report.coverImageUrl] : undefined,
      title,
    },
  };
}

export default async function LocalizedFanletterNewsReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; reportId: string }>;
  searchParams: Promise<FanletterNewsReportSearchParams>;
}) {
  const { lang, reportId } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const report = await getFanletterNewsReportById(reportId);

  if (!report) {
    notFound();
  }

  const cookieStore = await cookies();
  const includeNsfw = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );
  const memberServerSession = await readMemberServerSession();
  const [
    sourceContent,
    relatedReports,
    reporterProfile,
    viewerReporterMember,
    reportCoverOptions,
  ] = await Promise.all([
    getFanletterPublicContentDetail(
      report.contentId,
      locale,
      memberServerSession?.email ?? null,
      {
        includeNsfw,
      },
    ).catch(() => null),
    getRelatedFanletterNewsReports({
      creatorReferralCode: report.creatorReferralCode,
      excludeContentId: report.contentId,
      excludeReportId: report.reportId,
      limit: RELATED_NEWS_FETCH_LIMIT,
      locale,
    }),
    getFanletterNewsReporterProfile({
      reporterReferralCode: report.reporterReferralCode,
    }),
    memberServerSession
      ? getFanletterNewsReporterMemberByEmail(memberServerSession.email, locale)
      : Promise.resolve(null),
    memberServerSession
      ? getFanletterNewsReportCoverOptions({ reportId: report.reportId })
      : Promise.resolve([]),
  ]);
  const copy = getCopy(locale);
  const articleTitle = getArticleDisplayTitle(report.title);
  const referralCode =
    readFanletterReferralCode(query.ref) ?? report.reporterReferralCode;
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const reporterNewsHref = buildPathWithReferral(
    `/${locale}/fanletter/news?reporter=${encodeURIComponent(
      report.reporterReferralCode,
    )}`,
    referralCode,
  );
  const fanletterHomeHref = buildPathWithReferral(
    `/${locale}/fanletter`,
    referralCode,
  );
  const articleHref = buildPathWithReferral(
    `/${locale}/fanletter/news/${report.reportId}`,
    referralCode,
  );
  const walletHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: articleHref },
  );
  const paidUnlockOnboardingHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/onboarding`, referralCode),
    { returnTo: articleHref },
  );
  const creatorHref = report.creatorReferralCode
    ? buildPathWithReferral(
        `/${locale}/fanletter/creator/${report.creatorReferralCode}`,
        referralCode,
      )
    : fanletterHomeHref;
  const visibleRelatedReports = relatedReports.slice(0, RELATED_NEWS_PAGE_SIZE);
  const relatedNewsItems = visibleRelatedReports.map((relatedReport) =>
    serializeFanletterRelatedNewsItem({
      nsfwOptInEnabled: includeNsfw,
      referralCode,
      report: relatedReport,
    }),
  );
  const relatedNewsApiHref = setPathSearchParams(
    "/api/fanletter/news-reports/related",
    {
      limit: String(RELATED_NEWS_PAGE_SIZE),
      locale,
      ref: referralCode,
      reportId: report.reportId,
    },
  );
  const relatedNewsHasMore = relatedReports.length > RELATED_NEWS_PAGE_SIZE;
  const publishedAt = formatDate(report.sourcePublishedAt, locale);
  const articleParagraphs = splitArticleBody(report.body);
  const accessLabel = getContentAccessLabel(sourceContent ?? report, copy);
  const isCurrentNsfwReport = isNsfwReport(report);
  const shouldBlurCurrentReport = shouldBlurReport(report, includeNsfw);
  const relatedNsfwReportCount = relatedReports.filter(isNsfwReport).length;
  const nsfwNewsCount = relatedNsfwReportCount + (isCurrentNsfwReport ? 1 : 0);
  const shouldShowNsfwControl = nsfwNewsCount > 0 || includeNsfw;
  const canManageReportCover =
    viewerReporterMember?.referralCode === report.reporterReferralCode;
  const manageableCoverOptions = canManageReportCover ? reportCoverOptions : [];
  const nsfwTextBlurClass = shouldBlurCurrentReport
    ? "select-none blur-[2px]"
    : "";
  const isPaidSourceContent =
    (sourceContent?.priceType ?? report.priceType) === "paid";
  const shouldShowPaidUnlockPanel =
    isPaidSourceContent && sourceContent?.canViewerAccess !== true;
  const paidUnlockSectionId = "fanletter-news-paid-unlock";
  const sourceVlogSectionId = "fanletter-news-source-vlog";
  const sourceVlogHref = `${articleHref}#${sourceVlogSectionId}`;
  const paidUnlockAmount =
    sourceContent?.priceUsdt ??
    (shouldShowPaidUnlockPanel ? CONTENT_PAID_USDT_AMOUNT : null);
  const paidUnlockHref = shouldShowPaidUnlockPanel
    ? `${articleHref}#${paidUnlockSectionId}`
    : null;
  const navLinks = [
    {
      href: creatorHref,
      label: copy.navItems[0] ?? copy.articleActions.character,
    },
    { href: reporterNewsHref, label: copy.navItems[1] ?? copy.byline },
    { href: sourceVlogHref, label: copy.navItems[2] ?? copy.sourceTitle },
  ];
  const facts = [
    { label: copy.sixW.who, value: report.who },
    { label: copy.sixW.when, value: report.when },
    { label: copy.sixW.where, value: report.where },
    { label: copy.sixW.what, value: report.what },
    { label: copy.sixW.why, value: report.why },
    { label: copy.sixW.how, value: report.how },
  ];

  return (
    <main className="min-h-screen bg-[#eef1ec] pb-[calc(6.5rem+env(safe-area-inset-bottom))] text-[#111510] md:pb-0">
      <NewsSiteHeader
        copy={copy}
        homeHref={newsHomeHref}
        locale={locale}
        navLinks={navLinks}
        referralCode={referralCode}
        walletHref={walletHref}
      />

      <article className="mx-auto max-w-[92rem] px-4 pb-16 pt-5 sm:px-6 sm:pt-8 lg:px-8">
        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_22.5rem] xl:items-start">
          <div className="min-w-0">
            <header className="overflow-hidden border border-black/12 bg-white shadow-[0_20px_56px_rgba(17,21,16,0.08)]">
              <div className="border-b-2 border-[#111510] bg-[#111510] px-4 py-3 sm:px-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white/58">
                  <span className="text-[#44f26e]">{copy.articleSection}</span>
                  <span className="h-3 w-px bg-white/18" aria-hidden="true" />
                  <span>{accessLabel}</span>
                  <span className="h-3 w-px bg-white/18" aria-hidden="true" />
                  <span>{copy.aiReport}</span>
                </div>
              </div>
              <div className="p-4 sm:p-6 lg:p-7">
                <h1
                  className={`max-w-5xl break-words text-[1.88rem] font-black leading-[1.12] tracking-normal [overflow-wrap:anywhere] [word-break:keep-all] sm:text-[3.25rem] sm:leading-[1.06] lg:text-[3.75rem] ${nsfwTextBlurClass}`}
                >
                  {articleTitle}
                </h1>
                <p
                  className={`mt-4 max-w-3xl text-[1.02rem] font-medium leading-8 text-black/62 sm:text-[1.22rem] sm:leading-9 ${nsfwTextBlurClass}`}
                >
                  {report.dek}
                </p>

                <ReporterByline
                  copy={copy}
                  publishedAt={publishedAt}
                  report={report}
                  reporterProfile={reporterProfile}
                  reporterNewsHref={reporterNewsHref}
                />

                <ArticleActionLinks
                  copy={copy}
                  creatorHref={creatorHref}
                  locale={locale}
                  newsHomeHref={newsHomeHref}
                  referralCode={referralCode}
                  shareHref={articleHref}
                  shareSummary={report.dek}
                  shareTitle={articleTitle}
                  sourceVlogHref={sourceVlogHref}
                />
              </div>
            </header>

            <ArticleVisualLead
              accessLabel={accessLabel}
              blurred={shouldBlurCurrentReport}
              copy={copy}
              report={report}
              sourceContent={sourceContent}
            />

            {shouldShowNsfwControl ? (
              <div className="mt-5">
                <FanletterNsfwOptInControl
                  disabledBody={copy.nsfwControl.disabledBody}
                  disabledTitle={copy.nsfwControl.disabledTitle}
                  enabled={includeNsfw}
                  enabledBody={copy.nsfwControl.enabledBody}
                  enabledTitle={copy.nsfwControl.enabledTitle}
                  hiddenCount={nsfwNewsCount}
                  hiddenCountText={copy.nsfwControl.hiddenCountText(
                    formatNumber(nsfwNewsCount, locale),
                  )}
                  locale={locale}
                  tone={includeNsfw ? "dark" : "light"}
                />
              </div>
            ) : null}

            <ReportCoverImagePicker
              blurred={shouldBlurCurrentReport}
              copy={copy}
              locale={locale}
              options={manageableCoverOptions}
              report={report}
            />

            <CharacterIdentityFeature
              copy={copy}
              creatorHref={creatorHref}
              locale={locale}
              sourceContent={sourceContent}
            />

            <div className="scroll-mt-6" id={sourceVlogSectionId}>
              <SourceVlogEmbed
                accessLabel={accessLabel}
                blurred={shouldBlurCurrentReport}
                copy={copy}
                isPaidContent={isPaidSourceContent}
                paidUnlockHref={paidUnlockHref}
                priceUsdt={paidUnlockAmount}
                reportCoverImageSource={report.coverImageSource}
                reportCoverImageUrl={report.coverImageUrl}
                sourceContent={sourceContent}
              />
            </div>

            {shouldShowPaidUnlockPanel ? (
              <div className="scroll-mt-6" id={paidUnlockSectionId}>
                <FanletterPaidUnlockPanel
                  autoOpenHash={`#${paidUnlockSectionId}`}
                  connectHref={walletHref}
                  contentId={report.contentId}
                  contentImageCount={sourceContent?.contentImageCount ?? 0}
                  contentMaturityRating={
                    sourceContent?.contentMaturityRating ??
                    report.contentMaturityRating
                  }
                  contentVideoCount={sourceContent?.contentVideoCount ?? 1}
                  creatorHref={creatorHref}
                  currentHref={articleHref}
                  initialBody={
                    sourceContent?.body ??
                    report.sourceSummary ??
                    report.dek
                  }
                  initialCoverImageUrl={
                    sourceContent?.coverImageUrl ?? report.coverImageUrl
                  }
                  initialSummary={
                    sourceContent?.summary ??
                    report.sourceSummary ??
                    report.dek
                  }
                  initialTitle={sourceContent?.title ?? report.sourceTitle}
                  locale={locale}
                  onboardingHref={paidUnlockOnboardingHref}
                  priceUsdt={paidUnlockAmount}
                  referralCode={referralCode}
                  showTeaserPreview={false}
                  trackingSource="fanletter-news-detail"
                />
              </div>
            ) : null}

            <section className="mt-7 overflow-hidden border border-black/12 bg-white shadow-[0_14px_42px_rgba(17,21,16,0.05)]">
              <div className="flex items-center gap-2 border-b-2 border-[#111510] bg-[#f7f9f4] px-4 py-3 text-sm font-black text-[#111510] sm:px-5">
                <FileText className="size-4 text-[#16702e]" />
                {copy.summaryTitle}
              </div>
              <dl className="grid gap-x-5 gap-y-4 p-4 sm:grid-cols-2 sm:p-5">
                {facts.map((fact) => (
                  <div
                    className="min-w-0 border-l-2 border-[#19b84b]/34 pl-3"
                    key={fact.label}
                  >
                    <dt className="text-xs font-bold text-[#16702e]">
                      {fact.label}
                    </dt>
                    <dd
                      className={`mt-1 text-sm font-medium leading-6 text-black/72 ${nsfwTextBlurClass}`}
                    >
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="mt-8">
              <div
                className={`max-w-[44rem] space-y-6 text-[1.08rem] font-normal leading-8 text-black/84 sm:text-[1.14rem] sm:leading-9 ${
                  nsfwTextBlurClass
                }`}
              >
                {articleParagraphs.map((paragraph) => (
                  <p className="[word-break:keep-all]" key={paragraph}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            <p className="mt-8 border-t border-black/10 pt-4 text-xs font-medium leading-5 text-black/46">
              {copy.articleNotice}
            </p>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-5">
            <NewsWalletConnectCard
              copy={copy}
              locale={locale}
              referralCode={referralCode}
              walletHref={walletHref}
            />

            <SourceContextCard
              accessLabel={accessLabel}
              blurred={shouldBlurCurrentReport}
              copy={copy}
              report={report}
              sourceVlogHref={sourceVlogHref}
            />

            <FanletterNewsRelatedList
              copy={{
                empty: copy.relatedNewsEmpty,
                error: copy.relatedNewsError,
                loadMore: copy.relatedNewsLoadMore,
                loading: copy.relatedNewsLoading,
                title: copy.relatedNews,
              }}
              initialHasMore={relatedNewsHasMore}
              initialItems={relatedNewsItems}
              key={relatedNewsApiHref}
              pageSize={RELATED_NEWS_PAGE_SIZE}
              relatedApiHref={relatedNewsApiHref}
            />
          </aside>
        </div>
      </article>

      <MobileNewsBottomNav
        copy={copy}
        creatorHref={creatorHref}
        locale={locale}
        newsHomeHref={newsHomeHref}
        referralCode={referralCode}
        shareHref={articleHref}
        shareSummary={report.dek}
        shareTitle={articleTitle}
        sourceVlogHref={sourceVlogHref}
        walletHref={paidUnlockHref ?? walletHref}
      />
    </main>
  );
}
