import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BellPlus,
  Clapperboard,
  Crown,
  Grid2X2,
  Heart,
  LockKeyhole,
  MessageCircle,
  MessageCircleHeart,
  PenLine,
  PlayCircle,
  Rocket,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  User,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { FanletterAutoplayVideo } from "@/components/fanletter-autoplay-video";
import { FanletterChannelShareButton } from "@/components/fanletter-channel-share-button";
import {
  FanletterChannelSectionTabs,
  type FanletterChannelSectionTabItem,
} from "@/components/fanletter-channel-section-tabs";
import { FanletterContentDetailCtaGroup } from "@/components/fanletter-content-detail-cta-group";
import { FanletterFanRequestForm } from "@/components/fanletter-fan-request-form";
import { FanletterFanRequestPresetLink } from "@/components/fanletter-fan-request-preset-link";
import { FanletterHashScroller } from "@/components/fanletter-hash-scroller";
import { FanletterFollowButton } from "@/components/fanletter-follow-button";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import { FanletterPaidUnlockPanel } from "@/components/fanletter-paid-unlock-panel";
import { FanletterRequestStatusPanel } from "@/components/fanletter-request-status-panel";
import {
  FanletterSetupHeroDescription,
  FanletterSetupHeroActions,
  FanletterSetupProgressTiles,
  FanletterSetupStatusProvider,
  FanletterSetupStatusNote,
  FanletterSetupStepAction,
  FanletterSetupStepBadge,
  FanletterSetupStepNavLink,
  FanletterSetupStepText,
} from "@/components/fanletter-setup-status-actions";
import { FanletterSocialActions } from "@/components/fanletter-social-actions";
import type {
  FanletterCreatorPageData,
  FanletterFeedFilters,
  FanletterFeedSort,
  FanletterPublicCharacter,
  FanletterPublicContentDetail,
  FanletterPublicContentItem,
  FanletterPublicFanRequestPreview,
} from "@/lib/fanletter-content-service";
import type { Locale } from "@/lib/i18n";
import { getFanletterRealismDisclosureCopy } from "@/lib/fanletter-realism-policy";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

type FanletterSubpageCopy = {
  actions: {
    creatorChannel: string;
    creatorStudio: string;
    existingDetail: string;
    feed: string;
    following: string;
    home: string;
    openContent: string;
    purchases: string;
    start: string;
  };
  content: {
    body: string;
    lockedBody: string;
    lockedDescription: string;
    lockedTitle: string;
    media: string;
    paid: string;
    public: string;
  };
  creator: {
    characterAvatars: string;
    characterBody: string;
    characterEmptyTraits: string;
    characterEvolution: string;
    characterEyebrow: string;
    characterImageSignal: string;
    characterLatest: string;
    characterPublicSignal: string;
    characterTitle: string;
    characterTraits: string;
    characterVideoSignal: string;
    empty: string;
    eyebrow: string;
    publicPosts: string;
    stage: string;
    titleSuffix: string;
  };
  feed: {
    allContent: string;
    empty: string;
    eyebrow: string;
    featured: string;
    freePublic: string;
    latest: string;
    suggestedCreators: string;
    title: string;
    trending: string;
    videos: string;
  };
  metrics: {
    comments: string;
    likes: string;
    saves: string;
  };
  start: {
    body: string;
    eyebrow: string;
    steps: Array<{
      body: string;
      title: string;
    }>;
    title: string;
  };
};

type FanletterShellSection =
  | "feed"
  | "following"
  | "home"
  | "purchases"
  | "start"
  | "studio";

const koCopy: FanletterSubpageCopy = {
  actions: {
    creatorChannel: "캐릭터 채널 보기",
    creatorStudio: "브이로그 스튜디오",
    existingDetail: "FanLetter에서 권한 확인",
    feed: "브이로그 피드",
    following: "팔로잉",
    home: "홈",
    openContent: "브이로그 보기",
    purchases: "구매함",
    start: "내 채널 만들기",
  },
  content: {
    body: "브이로그 본문",
    lockedBody: "FanLetter 온보딩을 완료한 뒤 같은 브이로그 상세로 돌아와 이어서 볼 수 있습니다.",
    lockedDescription:
      "캐릭터 채널, 댓글, 권한 확인 흐름을 FanLetter 안에서 이어가도록 준비합니다.",
    lockedTitle: "권한 확인이 필요한 브이로그입니다.",
    media: "브이로그 미디어",
    paid: "유료",
    public: "무료 공개",
  },
  creator: {
    characterAvatars: "표정 아바타 세트",
    characterBody:
      "내부 생성 프롬프트는 숨기고 팬이 소비할 수 있는 캐릭터 소개와 공개 브이로그 흐름만 보여줍니다.",
    characterEmptyTraits: "공개 키워드는 페르소나가 더 정리되면 표시됩니다.",
    characterEvolution: "브이로그 성장 로그",
    characterEyebrow: "공개 AI 캐릭터 브이로그",
    characterImageSignal: "표정 아바타",
    characterLatest: "최근 브이로그",
    characterPublicSignal: "공개 브이로그",
    characterTitle: "AI 캐릭터 채널",
    characterTraits: "캐릭터 키워드",
    characterVideoSignal: "브이로그",
    empty: "이 캐릭터의 공개 브이로그가 준비되면 이곳에 표시됩니다.",
    eyebrow: "AI 캐릭터 채널",
    publicPosts: "공개 브이로그",
    stage: "성장 단계",
    titleSuffix: "의 FanLetter",
  },
  feed: {
    allContent: "전체 공개 브이로그",
    empty: "공개 AI 캐릭터 브이로그가 준비되면 이곳에 표시됩니다.",
    eyebrow: "AI 캐릭터 브이로그 피드",
    featured: "인기 브이로그",
    freePublic: "무료 공개",
    latest: "최신 브이로그",
    suggestedCreators: "추천 캐릭터",
    title: "AI 캐릭터의 공개 숏폼 브이로그를 FanLetter 흐름 안에서 둘러보세요.",
    trending: "인기 브이로그",
    videos: "브이로그",
  },
  metrics: {
    comments: "댓글",
    likes: "좋아요",
    saves: "저장",
  },
  start: {
    body: "처음 시작하는 사람도 가입, 캐릭터 만들기, 첫 브이로그 생성까지 순서대로 따라갈 수 있게 정리했습니다.",
    eyebrow: "Start FanLetter",
    steps: [
      {
        body: "FanLetter 계정과 시작 준비 상태를 확인합니다. 완료 후 캐릭터 준비로 이어집니다.",
        title: "계정 연결",
      },
      {
        body: "표시 이름과 분위기만 정하면 캐릭터 설정과 대표 아바타를 자동으로 저장합니다.",
        title: "AI 캐릭터 준비",
      },
      {
        body: "준비된 캐릭터를 적용해 오늘의 셀피, 루틴, 대화 장면을 세로형 브이로그로 만듭니다.",
        title: "첫 브이로그 생성",
      },
    ],
    title: "AI 캐릭터 브이로그 채널을 바로 시작하세요.",
  },
};

const enCopy: FanletterSubpageCopy = {
  actions: {
    creatorChannel: "View character channel",
    creatorStudio: "Vlog Studio",
    existingDetail: "Verify in FanLetter",
    feed: "Vlog Feed",
    following: "Following",
    home: "Home",
    openContent: "View vlog",
    purchases: "Purchases",
    start: "Start my channel",
  },
  content: {
    body: "Vlog body",
    lockedBody: "Complete FanLetter onboarding, then return to this vlog detail to continue.",
    lockedDescription:
      "Character channels, comments, and access checks should stay inside the FanLetter flow.",
    lockedTitle: "This vlog requires access verification.",
    media: "Vlog media",
    paid: "Paid",
    public: "Free public",
  },
  creator: {
    characterAvatars: "Expression avatar set",
    characterBody:
      "Internal generation prompts stay private. Fans see the character intro and public vlog signals only.",
    characterEmptyTraits: "Public keywords will appear as the persona becomes clearer.",
    characterEvolution: "Vlogger growth log",
    characterEyebrow: "Public AI Character Vlogger",
    characterImageSignal: "Avatar set",
    characterLatest: "Latest vlog",
    characterPublicSignal: "Public vlogs",
    characterTitle: "AI character channel",
    characterTraits: "Character keywords",
    characterVideoSignal: "Vlogs",
    empty: "This character's public vlogs will appear here when ready.",
    eyebrow: "AI Character Channel",
    publicPosts: "public vlogs",
    stage: "Stage",
    titleSuffix: "'s FanLetter",
  },
  feed: {
    allContent: "All public vlogs",
    empty: "Public AI character vlogs will appear here when ready.",
    eyebrow: "AI Character Vlog Feed",
    featured: "Popular vlog",
    freePublic: "Free public",
    latest: "Latest vlogs",
    suggestedCreators: "Suggested characters",
    title: "Browse public short-form vlogs from AI characters inside FanLetter.",
    trending: "Popular vlogs",
    videos: "Vlogs",
  },
  metrics: {
    comments: "comments",
    likes: "likes",
    saves: "saves",
  },
  start: {
    body: "New creators can follow signup, character creation, and first vlog creation in order.",
    eyebrow: "Start FanLetter",
    steps: [
      {
        body: "Confirm the FanLetter account and readiness state, then continue into character setup.",
        title: "Connect account",
      },
      {
        body: "Choose a display name and mood to save the character setup and representative avatar automatically.",
        title: "Prepare AI character",
      },
      {
        body: "Apply the prepared character to today's selfie, routine, outing, or dialogue scene as a vertical vlog.",
        title: "Create first vlog",
      },
    ],
    title: "Start an AI character vlog channel.",
  },
};

function getCopy(locale: Locale) {
  return locale === "ko" ? koCopy : enCopy;
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getAvatarExpressionLabel(
  expression: FanletterPublicCharacter["avatarImageSet"][number]["expression"],
  label: string | null,
  locale: Locale,
) {
  if (expression === "fanservice") {
    return locale === "ko" ? "팬 리액션" : "Fan reaction";
  }

  if (label?.trim()) {
    return label;
  }

  if (expression === "smile") {
    return locale === "ko" ? "미소" : "Smile";
  }

  if (expression === "serious") {
    return locale === "ko" ? "차분함" : "Calm";
  }

  if (expression === "reaction") {
    return locale === "ko" ? "리액션" : "Reaction";
  }

  if (expression === "shy") {
    return locale === "ko" ? "설렘" : "Delight";
  }

  if (expression === "focus") {
    return locale === "ko" ? "집중" : "Focus";
  }

  if (expression === "thumbnail") {
    return locale === "ko" ? "썸네일" : "Thumbnail";
  }

  return locale === "ko" ? "대표" : "Default";
}

function getAvatarInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "F";
}

function getContentHref({
  item,
  locale,
  referralCode,
}: {
  item: FanletterPublicContentItem;
  locale: Locale;
  referralCode: string | null;
}) {
  return buildPathWithReferral(
    `/${locale}/fanletter/content/${item.contentId}`,
    referralCode ?? item.authorReferralCode,
  );
}

function getCreatorHref({
  item,
  locale,
  referralCode,
}: {
  item: FanletterPublicContentItem;
  locale: Locale;
  referralCode: string | null;
}) {
  if (!item.authorReferralCode) {
    return null;
  }

  return buildPathWithReferral(
    `/${locale}/fanletter/creator/${item.authorReferralCode}`,
    referralCode ?? item.authorReferralCode,
  );
}

function getFeedHref({
  filters,
  locale,
  page,
  query,
  referralCode,
  sort,
}: {
  filters?: FanletterFeedFilters;
  locale: Locale;
  page?: number;
  query?: string;
  referralCode: string | null;
  sort?: FanletterFeedSort;
}) {
  const nextQuery = query ?? filters?.query ?? "";
  const nextSort = sort ?? filters?.sort ?? "latest";
  const nextPage = page ?? filters?.page ?? 1;

  return setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/feed`, referralCode),
    {
      page: nextPage > 1 ? String(nextPage) : null,
      q: nextQuery,
      sort: nextSort === "latest" ? null : nextSort,
    },
  );
}

function getContentEngagementScore(item: FanletterPublicContentItem) {
  return (
    item.social.likeCount * 3 +
    item.social.saveCount * 2 +
    item.social.commentCount * 4
  );
}

function isLowSignalContentText(title: string, summary: string) {
  const normalizedTitle = title.trim();
  const normalizedSummary = summary.trim();
  const compactTitle = normalizedTitle.replace(/\s+/g, "");

  if (!normalizedTitle) {
    return true;
  }

  if (
    normalizedTitle.length <= 10 &&
    normalizedSummary.toLowerCase() === normalizedTitle.toLowerCase() &&
    /^[a-z]+$/i.test(normalizedTitle)
  ) {
    return true;
  }

  if (/^[a-z]{6,18}$/i.test(compactTitle)) {
    const lowerTitle = compactTitle.toLowerCase();

    if (
      !/(daily|date|fan|letter|live|mood|morning|preview|reply|routine|scene|short|studio|story|teaser|update|video|vlog|walk)/.test(
        lowerTitle,
      ) &&
      (!/[aeiou]/.test(lowerTitle) ||
        (lowerTitle.match(/[jqxz]/g) ?? []).length > 1 ||
        /w.*w/.test(lowerTitle))
    ) {
      return true;
    }
  }

  return /^([a-z])\1{3,}$/i.test(normalizedTitle);
}

function isGenerationPromptLikeText(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  const commaCount = (normalized.match(/,/g) ?? []).length;

  if (
    /(big bust|covered in freckles|face shape|natural redhead|standing pose|wood flooring|wavy short hair)/.test(
      normalized,
    )
  ) {
    return true;
  }

  if (
    commaCount >= 4 &&
    /[a-z]/i.test(normalized) &&
    !/[가-힣]/.test(normalized)
  ) {
    return true;
  }

  return (
    commaCount >= 6 &&
    /(pose|hair|eyes|face|body|outfit|lighting|camera)/.test(normalized)
  );
}

function getDisplayContentTitleText(
  title: string | null | undefined,
  summary: string | null | undefined,
  locale: Locale,
) {
  const safeTitle = (title ?? "").trim();
  const safeSummary = (summary ?? "").trim();
  const normalizedTitle = safeTitle.toLowerCase();

  if (!safeTitle) {
    return locale === "ko" ? "캐릭터 브이로그" : "Character vlog";
  }

  if (normalizedTitle.startsWith("a realistic mirror selfie video")) {
    return locale === "ko" ? "거울 셀피 브이로그" : "Mirror selfie vlog";
  }

  if (normalizedTitle.startsWith("a realistic ")) {
    return locale === "ko" ? "리얼 캐릭터 브이로그" : "Realistic character vlog";
  }

  if (isGenerationPromptLikeText(safeTitle)) {
    return locale === "ko" ? "캐릭터 브이로그" : "Character vlog";
  }

  if (isLowSignalContentText(safeTitle, safeSummary)) {
    return locale === "ko" ? "짧은 캐릭터 브이로그" : "Short character vlog";
  }

  return safeTitle;
}

function getDisplayContentTitle(item: FanletterPublicContentItem, locale: Locale) {
  return getDisplayContentTitleText(item.title, item.summary, locale);
}

function getDisplayContentSummary(item: FanletterPublicContentItem, locale: Locale) {
  const title = item.title.trim();
  const summary = item.summary.trim();
  const normalizedSummary = summary.toLowerCase();
  const normalizedTitle = title.toLowerCase();

  if (
    normalizedTitle.startsWith("a realistic mirror selfie video") ||
    normalizedSummary.startsWith("a realistic mirror selfie video")
  ) {
    return locale === "ko"
      ? "거울 앞에서 캐릭터의 분위기를 담은 짧은 셀피 브이로그입니다."
      : "A short mirror selfie vlog that captures the character's mood.";
  }

  if (
    normalizedTitle.startsWith("a realistic ") ||
    normalizedSummary.startsWith("a realistic ")
  ) {
    return locale === "ko"
      ? "AI 캐릭터의 자연스러운 순간을 담은 리얼 브이로그입니다."
      : "A realistic vlog moment from this AI character.";
  }

  if (isGenerationPromptLikeText(summary)) {
    return locale === "ko"
      ? "이 캐릭터의 최근 공개 브이로그입니다."
      : "A recent public vlog from this character.";
  }

  if (isLowSignalContentText(title, summary)) {
    return locale === "ko"
      ? "채널에 공개된 짧은 AI 캐릭터 브이로그입니다."
      : "A short AI character vlog published on this channel.";
  }

  return summary || (locale === "ko" ? "AI 캐릭터 브이로그입니다." : "AI character vlog.");
}

function getDisplayPaidTeaser(item: FanletterPublicContentItem, locale: Locale) {
  const teaser = item.previewText?.trim();

  if (teaser && !isLowSignalContentText(item.title, teaser)) {
    return teaser;
  }

  return item.priceType === "paid"
    ? locale === "ko"
      ? "공개 티저 뒤에 숨겨진 전체 영상과 상세 본문을 결제 후 확인할 수 있습니다."
      : "The full video and detail body behind the public teaser unlock after payment."
    : getDisplayContentSummary(item, locale);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasKoreanFinalConsonant(value: string) {
  const lastCharacter = Array.from(value.trim()).pop();

  if (!lastCharacter) {
    return false;
  }

  const codePoint = lastCharacter.codePointAt(0);

  if (!codePoint || codePoint < 0xac00 || codePoint > 0xd7a3) {
    return false;
  }

  return (codePoint - 0xac00) % 28 !== 0;
}

function getDisplayContentBody(
  body: string,
  characterName: string,
  locale: Locale,
) {
  const normalizedCharacterName = characterName.trim();

  if (locale !== "ko" || !normalizedCharacterName) {
    return body;
  }

  const particle = hasKoreanFinalConsonant(normalizedCharacterName) ? "이" : "가";

  return body.replace(
    new RegExp(`${escapeRegExp(normalizedCharacterName)}가(?=\\s)`),
    `${normalizedCharacterName}${particle}`,
  );
}

function getLockedMediaLabel(item: FanletterPublicContentItem, locale: Locale) {
  const segments: string[] = [];

  if (item.contentVideoCount > 0) {
    segments.push(
      locale === "ko"
        ? `영상 ${formatNumber(item.contentVideoCount, locale)}개`
        : `${formatNumber(item.contentVideoCount, locale)} video${
            item.contentVideoCount === 1 ? "" : "s"
          }`,
    );
  }

  if (item.contentImageCount > 0) {
    segments.push(
      locale === "ko"
        ? `추가 이미지 ${formatNumber(item.contentImageCount, locale)}개`
        : `${formatNumber(item.contentImageCount, locale)} extra image${
            item.contentImageCount === 1 ? "" : "s"
          }`,
    );
  }

  if (segments.length === 0) {
    return locale === "ko" ? "전체 본문 잠금" : "Full body locked";
  }

  return locale === "ko"
    ? `${segments.join(" + ")} 잠금`
    : `${segments.join(" + ")} locked`;
}

function getPublishedTime(value: string | null) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

type FanletterRankedCreator = {
  authorAvatarImageUrl: string | null;
  authorName: string;
  authorReferralCode: string | null;
  key: string;
  latestContentId: string;
  latestPublishedAt: string | null;
  latestTitle: string;
  postCount: number;
  score: number;
  videoCount: number;
};

function getRankedCreators(items: FanletterPublicContentItem[]) {
  const creators = new Map<string, FanletterRankedCreator>();

  items.forEach((item) => {
    const key = item.authorReferralCode ?? item.authorName;
    const current = creators.get(key);
    const score = getContentEngagementScore(item);
    const itemPublishedTime = getPublishedTime(item.publishedAt);

    if (!current) {
      creators.set(key, {
        authorAvatarImageUrl: item.authorAvatarImageUrl,
        authorName: item.authorName,
        authorReferralCode: item.authorReferralCode,
        key,
        latestContentId: item.contentId,
        latestPublishedAt: item.publishedAt,
        latestTitle: item.title,
        postCount: 1,
        score,
        videoCount: item.mediaType === "video" ? 1 : 0,
      });
      return;
    }

    current.score += score;
    current.postCount += 1;
    current.videoCount += item.mediaType === "video" ? 1 : 0;

    if (!current.authorAvatarImageUrl && item.authorAvatarImageUrl) {
      current.authorAvatarImageUrl = item.authorAvatarImageUrl;
    }

    if (itemPublishedTime > getPublishedTime(current.latestPublishedAt)) {
      current.latestContentId = item.contentId;
      current.latestPublishedAt = item.publishedAt;
      current.latestTitle = item.title;
    }
  });

  return Array.from(creators.values()).sort((a, b) => {
    const scoreDelta = b.score - a.score;

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    const postDelta = b.postCount - a.postCount;

    if (postDelta !== 0) {
      return postDelta;
    }

    return getPublishedTime(b.latestPublishedAt) - getPublishedTime(a.latestPublishedAt);
  });
}

function FanletterShell({
  actions,
  aside,
  children,
  currentSection,
  description,
  eyebrow,
  heroGridClassName,
  heroSpacingClassName,
  locale,
  referralCode,
  showStartAction = true,
  title,
  titleClassName,
}: {
  actions?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  currentSection?: FanletterShellSection;
  description?: ReactNode;
  eyebrow: string;
  heroGridClassName?: string;
  heroSpacingClassName?: string;
  locale: Locale;
  referralCode: string | null;
  showStartAction?: boolean;
  title: string;
  titleClassName?: string;
}) {
  const copy = getCopy(locale);
  const homeHref = buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const feedHref = buildPathWithReferral(`/${locale}/fanletter/feed`, referralCode);
  const followingHref = buildPathWithReferral(
    `/${locale}/fanletter/following`,
    referralCode,
  );
  const purchasesHref = buildPathWithReferral(
    `/${locale}/fanletter/purchases`,
    referralCode,
  );
  const startHref = buildPathWithReferral(`/${locale}/fanletter/start`, referralCode);
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );
  const navItems: Array<{
    href: string;
    label: string;
    section: FanletterShellSection;
  }> = [
    { href: homeHref, label: copy.actions.home, section: "home" },
    { href: feedHref, label: copy.actions.feed, section: "feed" },
    { href: followingHref, label: copy.actions.following, section: "following" },
    { href: purchasesHref, label: copy.actions.purchases, section: "purchases" },
    { href: studioHref, label: copy.actions.creatorStudio, section: "studio" },
    { href: startHref, label: copy.actions.start, section: "start" },
  ];
  const visibleNavItems = navItems.filter(
    (item) =>
      !(
        item.section === "start" &&
        (currentSection === "start" || showStartAction)
      ),
  );
  const isStartSection = currentSection === "start";

  return (
    <main className="min-h-screen bg-[#030504] text-white">
      <FanletterHashScroller />
      <section className="border-b border-white/10 px-4 pb-10 pt-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex items-center justify-between gap-3">
            <Link className="flex min-w-0 items-center gap-2" href={homeHref}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <MessageCircleHeart className="size-5" />
              </span>
              <span className="truncate text-xl font-semibold tracking-normal">
                FanLetter
              </span>
            </Link>

            <nav className="hidden min-w-0 items-center gap-5 text-sm font-semibold text-white/74 lg:flex xl:gap-7">
              {visibleNavItems.map((item) => {
                const active = item.section === currentSection;

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`whitespace-nowrap transition hover:text-white ${
                      active ? "text-white" : "text-white/68"
                    }`}
                    href={item.href}
                    key={item.section}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex min-w-0 shrink-0 items-center gap-2">
              <FanletterGlobalLanguageSwitcher
                className="hidden sm:inline-flex"
                compact={isStartSection}
                locale={locale}
              />
              <FanletterAccountStatusLink
                className={isStartSection ? "max-w-[8.75rem]" : undefined}
                hideIdentity={isStartSection}
                locale={locale}
                referralCode={referralCode}
              />
              {isStartSection || !showStartAction ? null : (
                <Link
                  className="hidden h-10 items-center justify-center rounded-full border border-white/16 px-4 text-sm font-semibold !text-white transition hover:border-white/36 lg:inline-flex"
                  href={startHref}
                >
                  {copy.actions.start}
                </Link>
              )}
            </div>
          </header>

          <div className="mt-4 flex sm:hidden">
            <FanletterGlobalLanguageSwitcher compact locale={locale} />
          </div>

          <div
            className={`${heroSpacingClassName ?? "pt-14 sm:pt-24"} ${
              aside
                ? `grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,25rem)] ${heroGridClassName ?? "lg:items-end"}`
                : ""
            }`}
          >
            <div className="min-w-0">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#44f26e]">
                {eyebrow}
              </p>
              <h1
                className={
                  titleClassName ??
                  "mt-4 max-w-5xl text-[2.65rem] font-semibold leading-[0.98] tracking-normal text-white [word-break:keep-all] sm:text-[4.7rem]"
                }
              >
                {title}
              </h1>
              {description ? (
                <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/68 [word-break:keep-all] sm:text-lg">
                  {description}
                </p>
              ) : null}
              {actions ? (
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  {actions}
                </div>
              ) : null}
            </div>
            {aside ? <div className="min-w-0">{aside}</div> : null}
          </div>
        </div>
      </section>

      {children}
    </main>
  );
}

function Avatar({
  imageUrl,
  name,
  sizeClassName = "size-10",
}: {
  imageUrl: string | null;
  name: string;
  sizeClassName?: string;
}) {
  return (
    <span
      className={`${sizeClassName} flex shrink-0 items-center justify-center rounded-full bg-[#44f26e] bg-cover bg-center text-sm font-semibold text-black ring-2 ring-white/70`}
      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
    >
      {imageUrl ? null : getAvatarInitial(name)}
    </span>
  );
}

function MediaCard({
  alt,
  blurred = false,
  controls = true,
  imageUrl,
  mediaType,
  title,
  videoUrl,
}: {
  alt: string;
  blurred?: boolean;
  controls?: boolean;
  imageUrl: string | null;
  mediaType: FanletterPublicContentItem["mediaType"];
  title: string;
  videoUrl: string | null;
}) {
  if (videoUrl) {
    return (
      <>
        <FanletterAutoplayVideo
          className={
            blurred
              ? "h-full w-full scale-[1.06] object-cover blur-lg brightness-[0.72] saturate-[0.88]"
              : "h-full w-full object-cover"
          }
          controls={controls}
          poster={imageUrl ?? undefined}
          src={videoUrl}
          title={title}
        />
        {blurred ? (
          <div className="pointer-events-none absolute inset-0 bg-black/10" />
        ) : null}
      </>
    );
  }

  if (imageUrl) {
    return (
      <>
        <Image
          alt={alt}
          className={
            blurred
              ? "scale-[1.06] object-cover blur-lg brightness-[0.72] saturate-[0.88]"
              : "object-cover"
          }
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          src={imageUrl}
        />
        {blurred ? (
          <div className="pointer-events-none absolute inset-0 bg-black/10" />
        ) : null}
      </>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(145deg,#07100b,#101820_54%,#1b2b20)] text-white/74">
      <Clapperboard className="size-14 text-[#44f26e]" />
      <span className="text-xs font-semibold uppercase tracking-[0.22em]">
        {mediaType}
      </span>
    </div>
  );
}

function ContentCard({
  authorNameOverride,
  contentActionLabel,
  item,
  locale,
  referralCode,
  showVideoPreview = false,
}: {
  authorNameOverride?: string;
  contentActionLabel?: string;
  item: FanletterPublicContentItem;
  locale: Locale;
  referralCode: string | null;
  showVideoPreview?: boolean;
}) {
  const copy = getCopy(locale);
  const href = getContentHref({ item, locale, referralCode });
  const creatorHref = getCreatorHref({ item, locale, referralCode });
  const displayAuthorName = authorNameOverride ?? item.authorName;
  const displaySummary = getDisplayContentSummary(item, locale);
  const displayTitle = getDisplayContentTitle(item, locale);

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-black/10 bg-white text-black shadow-[0_18px_44px_rgba(8,18,12,0.12)]">
      <Link className="block" href={href}>
        <div className="relative aspect-[4/5] overflow-hidden bg-[#07100b] sm:aspect-[9/14]">
          {item.primaryVideoUrl && showVideoPreview ? (
            <FanletterAutoplayVideo
              ariaHidden
              className="absolute inset-0 h-full w-full object-cover"
              poster={item.coverImageUrl ?? undefined}
              src={item.primaryVideoUrl}
            />
          ) : item.coverImageUrl ? (
            <Image
              alt=""
              aria-hidden="true"
              className="object-cover"
              fill
              sizes="(max-width: 640px) 100vw, 24vw"
              src={item.coverImageUrl}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[linear-gradient(145deg,#07100b,#121b16_54%,#1d2f23)] text-white/72">
              <PlayCircle className="size-14 text-[#44f26e]" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                Video
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.18)_45%,rgba(0,0,0,0.76)_100%)]" />
          <span className="absolute left-2.5 top-2.5 inline-flex rounded-full bg-white px-2.5 py-1 text-[0.62rem] font-semibold text-black sm:left-3 sm:top-3 sm:px-3 sm:text-[0.68rem]">
            Video
          </span>
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center gap-2 sm:bottom-3 sm:left-3 sm:right-3">
            <Avatar
              imageUrl={item.authorAvatarImageUrl}
              name={displayAuthorName}
              sizeClassName="size-7 sm:size-8"
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white sm:text-sm">
                {displayAuthorName}
              </p>
              <p className="text-[0.68rem] font-medium text-white/62 sm:text-xs">
                {formatDate(item.publishedAt, locale) ?? "FanLetter"}
              </p>
            </div>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h2 className="line-clamp-2 break-words text-base font-semibold leading-tight tracking-normal [overflow-wrap:anywhere] sm:text-xl">
          {displayTitle}
        </h2>
        <p className="mt-1.5 line-clamp-2 min-h-10 break-words text-xs font-medium leading-5 text-black/58 [overflow-wrap:anywhere] sm:mt-2 sm:min-h-[4.5rem] sm:text-sm sm:leading-6">
          {displaySummary}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:hidden">
          {[
            { label: copy.metrics.likes, value: item.social.likeCount },
            { label: copy.metrics.comments, value: item.social.commentCount },
            { label: copy.metrics.saves, value: item.social.saveCount },
          ].map((metric) => (
            <span
              className="min-w-0 rounded-lg border border-black/10 bg-[#f6f8f4] px-2 py-1.5 text-center"
              key={metric.label}
            >
              <span className="block text-xs font-semibold leading-none">
                {formatNumber(metric.value, locale)}
              </span>
              <span className="mt-1 block truncate text-[0.55rem] font-semibold text-black/38">
                {metric.label}
              </span>
            </span>
          ))}
        </div>
        <div className="hidden sm:block">
          <FanletterSocialActions
            commentsHref={`${href}#fanletter-comments`}
            contentId={item.contentId}
            initialSocial={item.social}
            locale={locale}
            shareHref={href}
            summary={displaySummary}
            title={displayTitle}
            variant="compact"
          />
        </div>
        <div className="mt-auto flex flex-col gap-2 pt-3 sm:mt-0 sm:pt-4 sm:flex-row sm:items-center sm:justify-between">
          {creatorHref ? (
            <Link
              className="hidden h-9 min-w-0 items-center gap-2 rounded-lg border border-black/10 px-3 text-xs font-semibold text-black/62 sm:inline-flex"
              href={creatorHref}
            >
              <User className="size-3.5 shrink-0" />
              <span className="truncate">{displayAuthorName}</span>
            </Link>
          ) : (
            <span />
          )}
          <Link
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-black px-3 text-xs font-semibold !text-white"
            href={href}
          >
            {contentActionLabel ?? copy.actions.openContent}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function ContentGrid({
  authorNameOverride,
  contentActionLabel,
  empty,
  emptyActionHref,
  emptyActionLabel,
  items,
  locale,
  referralCode,
  showVideoPreview = false,
}: {
  authorNameOverride?: string;
  contentActionLabel?: string;
  empty: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
  items: FanletterPublicContentItem[];
  locale: Locale;
  referralCode: string | null;
  showVideoPreview?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-black/10 bg-white p-6 text-sm font-semibold text-black/58">
        <p>{empty}</p>
        {emptyActionHref && emptyActionLabel ? (
          <Link
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-black/82"
            href={emptyActionHref}
          >
            {emptyActionLabel}
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <ContentCard
          authorNameOverride={authorNameOverride}
          contentActionLabel={contentActionLabel}
          item={item}
          key={item.contentId}
          locale={locale}
          referralCode={referralCode}
          showVideoPreview={showVideoPreview}
        />
      ))}
    </div>
  );
}

function FeaturedFeedCard({
  authorNameOverride,
  item,
  locale,
  referralCode,
}: {
  authorNameOverride?: string;
  item: FanletterPublicContentItem;
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const href = getContentHref({ item, locale, referralCode });
  const creatorHref = getCreatorHref({ item, locale, referralCode });
  const publishedAt = formatDate(item.publishedAt, locale);
  const engagementScore = getContentEngagementScore(item);
  const displayAuthorName = authorNameOverride ?? item.authorName;
  const displaySummary = getDisplayContentSummary(item, locale);
  const displayTitle = getDisplayContentTitle(item, locale);

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-black/10 bg-[#07100b] text-white shadow-[0_24px_70px_rgba(8,18,12,0.22)]">
      <Link className="group block" href={href}>
        <div className="relative min-h-[28rem] overflow-hidden bg-[#07100b] sm:min-h-[32rem] lg:min-h-[36rem]">
          {item.primaryVideoUrl ? (
            <FanletterAutoplayVideo
              ariaHidden
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              poster={item.coverImageUrl ?? undefined}
              src={item.primaryVideoUrl}
            />
          ) : item.coverImageUrl ? (
            <Image
              alt={displayTitle}
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
              fill
              sizes="(max-width: 1024px) 100vw, 46vw"
              src={item.coverImageUrl}
            />
          ) : (
            <MediaCard
              alt={displayTitle}
              imageUrl={null}
              mediaType={item.mediaType}
              title={displayTitle}
              videoUrl={null}
            />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.22)_42%,rgba(0,0,0,0.86)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-[#44f26e] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-black">
                {copy.feed.featured}
              </span>
              <span className="inline-flex rounded-full border border-white/16 bg-white/12 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-white">
                {item.mediaType === "video" ? copy.feed.videos : copy.feed.freePublic}
              </span>
            </div>
            <h2 className="mt-4 line-clamp-3 break-words text-[2rem] font-semibold leading-[1.02] tracking-normal [overflow-wrap:anywhere] sm:text-[2.6rem]">
              {displayTitle}
            </h2>
            <p className="mt-3 line-clamp-3 max-w-2xl break-words text-sm font-medium leading-6 text-white/72 [overflow-wrap:anywhere] sm:text-base sm:leading-7">
              {displaySummary}
            </p>
            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar
                  imageUrl={item.authorAvatarImageUrl}
                  name={displayAuthorName}
                  sizeClassName="size-9"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {displayAuthorName}
                  </p>
                  <p className="text-xs font-medium text-white/58">
                    {publishedAt ?? "FanLetter"}
                  </p>
                </div>
              </div>
              <span className="hidden rounded-full border border-white/14 bg-white/10 px-3 py-1 text-xs font-semibold text-white/72 sm:inline-flex">
                {formatNumber(engagementScore, locale)}
              </span>
            </div>
          </div>
        </div>
      </Link>
      {creatorHref ? (
        <div className="border-t border-white/10 p-4">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-full border border-white/14 px-4 text-sm font-semibold !text-white transition hover:bg-white/10"
            href={creatorHref}
          >
            {displayAuthorName}
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function CreatorDiscoveryCard({
  item,
  locale,
  referralCode,
}: {
  item: FanletterPublicContentItem;
  locale: Locale;
  referralCode: string | null;
}) {
  const href = getCreatorHref({ item, locale, referralCode }) ?? getContentHref({
    item,
    locale,
    referralCode,
  });
  const labels =
    locale === "ko"
      ? {
          latest: "최근 브이로그",
          open: "채널 보기",
          reaction: "반응",
          video: "영상",
        }
      : {
          latest: "Latest vlog",
          open: "View channel",
          reaction: "Reactions",
          video: "Video",
        };
  const reactionScore = getContentEngagementScore(item);
  const displayTitle = getDisplayContentTitle(item, locale);

  return (
    <Link
      className="group flex min-w-[17.5rem] max-w-[86vw] snap-start flex-col rounded-lg border border-black/10 bg-white p-4 text-black shadow-[0_14px_34px_rgba(8,18,12,0.08)] transition hover:-translate-y-0.5 hover:border-[#29d85f]/58 hover:shadow-[0_20px_46px_rgba(8,18,12,0.12)] sm:min-w-0 sm:max-w-none"
      href={href}
    >
      <div className="flex items-start gap-3">
        <Avatar
          imageUrl={item.authorAvatarImageUrl}
          name={item.authorName}
          sizeClassName="size-12"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-semibold">{item.authorName}</p>
            {item.mediaType === "video" ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#44f26e]/18 px-2 py-0.5 text-[0.62rem] font-semibold text-[#16702e]">
                <PlayCircle className="size-3" />
                {labels.video}
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 break-words text-xs font-medium leading-5 text-black/52 [overflow-wrap:anywhere]">
            {displayTitle}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-black/10 bg-[#f6f8f4] p-2.5">
          <p className="text-lg font-semibold leading-none">
            {formatNumber(reactionScore, locale)}
          </p>
          <p className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-black/42">
            {labels.reaction}
          </p>
        </div>
        <div className="rounded-lg border border-black/10 bg-[#f6f8f4] p-2.5">
          <p className="line-clamp-1 text-sm font-semibold leading-none">
            {formatDate(item.publishedAt, locale) ?? "FanLetter"}
          </p>
          <p className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-black/42">
            {labels.latest}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/10 pt-3">
        <span className="truncate text-xs font-semibold text-black/46">
          {item.authorReferralCode ?? "FanLetter"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-black transition group-hover:text-[#16702e]">
          {labels.open}
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function getCreatorMomentumLabel(
  creator: FanletterRankedCreator,
  locale: Locale,
) {
  if (creator.score > 0) {
    return locale === "ko"
      ? `팬 반응 ${formatNumber(creator.score, locale)}`
      : `${formatNumber(creator.score, locale)} fan reactions`;
  }

  if (creator.videoCount > 0) {
    return locale === "ko"
      ? `공개 영상 ${formatNumber(creator.videoCount, locale)}개`
      : `${formatNumber(creator.videoCount, locale)} public videos`;
  }

  return locale === "ko"
    ? `공개 브이로그 ${formatNumber(creator.postCount, locale)}개`
    : `${formatNumber(creator.postCount, locale)} public vlogs`;
}

function FanletterFeedStoryRail({
  items,
  locale,
  referralCode,
}: {
  items: FanletterPublicContentItem[];
  locale: Locale;
  referralCode: string | null;
}) {
  const uniqueCreatorItems = Array.from(
    new Map(
      items.map((item) => [
        item.authorReferralCode ?? item.authorName,
        item,
      ]),
    ).values(),
  ).slice(0, 10);

  if (uniqueCreatorItems.length === 0) {
    return null;
  }

  const labels =
    locale === "ko"
      ? {
          comments: "댓글 활발",
          latest: "새 장면",
          reactions: "반응 높음",
          title: "지금 둘러볼 캐릭터",
          video: "영상",
        }
      : {
          comments: "Active chat",
          latest: "New scene",
          reactions: "Hot",
          title: "Characters to browse now",
          video: "Video",
        };

  return (
    <section className="mb-5 lg:hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-normal">
          {labels.title}
        </h2>
        <span className="text-xs font-semibold text-black/42">
          {formatNumber(uniqueCreatorItems.length, locale)}
        </span>
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {uniqueCreatorItems.map((item, index) => {
          const href =
            getCreatorHref({ item, locale, referralCode }) ??
            getContentHref({ item, locale, referralCode });
          const badge =
            item.social.commentCount > 0
              ? labels.comments
              : getContentEngagementScore(item) > 0
                ? labels.reactions
                : item.mediaType === "video"
                  ? labels.video
                  : labels.latest;

          return (
            <Link
              className="group flex w-[4.9rem] shrink-0 snap-start flex-col items-center text-center text-black"
              href={href}
              key={item.authorReferralCode ?? `${item.authorName}-${index}`}
            >
              <span className="relative flex size-16 items-center justify-center rounded-full border-2 border-[#44f26e] bg-white p-1 shadow-[0_12px_26px_rgba(8,18,12,0.1)] transition group-hover:-translate-y-0.5">
                <Avatar
                  imageUrl={item.authorAvatarImageUrl}
                  name={item.authorName}
                  sizeClassName="size-full"
                />
              </span>
              <span className="mt-2 line-clamp-1 w-full text-xs font-semibold">
                {item.authorName}
              </span>
              <span className="mt-1 line-clamp-1 w-full text-[0.58rem] font-semibold text-[#16702e]">
                {badge}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FanletterFeedCuriosityBoard({
  commentItem,
  fallbackItems,
  featuredItem,
  latestItem,
  locale,
  referralCode,
  savedItem,
}: {
  commentItem: FanletterPublicContentItem | null;
  fallbackItems: FanletterPublicContentItem[];
  featuredItem: FanletterPublicContentItem | null;
  latestItem: FanletterPublicContentItem | null;
  locale: Locale;
  referralCode: string | null;
  savedItem: FanletterPublicContentItem | null;
}) {
  const labels =
    locale === "ko"
      ? {
          comments: "댓글이 붙는 중",
          commentsMetric: "댓글",
          fallback: "눈길 가는 캐릭터 브이로그",
          latest: "새로 올라온 장면",
          latestMetric: "최근",
          open: "보기",
          popular: "지금 반응 높은 브이로그",
          popularMetric: "반응",
          saved: "다시 보고 싶은 장면",
          savedMetric: "저장",
          title: "먼저 볼 만한 장면",
        }
      : {
          comments: "Conversation is moving",
          commentsMetric: "Comments",
          fallback: "Character vlog to watch",
          latest: "Newly posted scene",
          latestMetric: "Recent",
          open: "Open",
          popular: "High-reaction vlog",
          popularMetric: "Reactions",
          saved: "Scene worth saving",
          savedMetric: "Saves",
          title: "Start with these scenes",
        };
  const cards: Array<{
    id: string;
    item: FanletterPublicContentItem;
    label: string;
    metricLabel: string;
    metricValue: string;
  }> = [];
  const usedContentIds = new Set<string>();
  const pushCard = (
    id: string,
    item: FanletterPublicContentItem | null,
    label: string,
    metricLabel: string,
    metricValue: string,
  ) => {
    if (!item || usedContentIds.has(item.contentId)) {
      return;
    }

    usedContentIds.add(item.contentId);
    cards.push({ id, item, label, metricLabel, metricValue });
  };

  pushCard(
    "popular",
    featuredItem,
    labels.popular,
    labels.popularMetric,
    featuredItem
      ? formatNumber(getContentEngagementScore(featuredItem), locale)
      : "0",
  );
  pushCard(
    "latest",
    latestItem,
    labels.latest,
    labels.latestMetric,
    latestItem ? (formatDate(latestItem.publishedAt, locale) ?? "FanLetter") : "",
  );
  pushCard(
    "comments",
    commentItem,
    labels.comments,
    labels.commentsMetric,
    commentItem ? formatNumber(commentItem.social.commentCount, locale) : "0",
  );
  pushCard(
    "saved",
    savedItem,
    labels.saved,
    labels.savedMetric,
    savedItem ? formatNumber(savedItem.social.saveCount, locale) : "0",
  );
  fallbackItems.forEach((item) => {
    if (cards.length >= 4) {
      return;
    }

    pushCard(
      `fallback-${item.contentId}`,
      item,
      labels.fallback,
      labels.popularMetric,
      formatNumber(getContentEngagementScore(item), locale),
    );
  });

  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#1f7c38]">
            FanLetter Pick
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-normal">
            {labels.title}
          </h2>
        </div>
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-4">
        {cards.map(({ id, item, label, metricLabel, metricValue }) => {
          const href = getContentHref({ item, locale, referralCode });

          return (
            <Link
              className="group min-w-[15.75rem] max-w-[78vw] snap-start overflow-hidden rounded-lg border border-black/10 bg-white text-black shadow-[0_16px_38px_rgba(8,18,12,0.09)] transition hover:-translate-y-0.5 hover:border-[#29d85f]/60 sm:min-w-0 sm:max-w-none"
              href={href}
              key={id}
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[#07100b]">
                {item.primaryVideoUrl ? (
                  <FanletterAutoplayVideo
                    ariaHidden
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    poster={item.coverImageUrl ?? undefined}
                    src={item.primaryVideoUrl}
                  />
                ) : item.coverImageUrl ? (
                  <Image
                    alt=""
                    aria-hidden="true"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    fill
                    sizes="(max-width: 640px) 78vw, 25vw"
                    src={item.coverImageUrl}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#07100b] text-[#44f26e]">
                    <PlayCircle className="size-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.68)_100%)]" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                  <span className="line-clamp-1 rounded-full bg-[#44f26e] px-2.5 py-1 text-[0.68rem] font-semibold text-black">
                    {label}
                  </span>
                  <span className="shrink-0 rounded-full border border-white/18 bg-white/12 px-2.5 py-1 text-[0.68rem] font-semibold text-white">
                    {metricValue}
                  </span>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <Avatar
                    imageUrl={item.authorAvatarImageUrl}
                    name={item.authorName}
                    sizeClassName="size-8"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {item.authorName}
                    </p>
                    <p className="text-[0.64rem] font-semibold text-black/42">
                      {metricLabel}
                    </p>
                  </div>
                </div>
                <h3 className="mt-3 line-clamp-2 break-words text-base font-semibold leading-tight [overflow-wrap:anywhere]">
                  {getDisplayContentTitle(item, locale)}
                </h3>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#16702e]">
                  {labels.open}
                  <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FanletterCreatorRanking({
  items,
  locale,
  referralCode,
}: {
  items: FanletterPublicContentItem[];
  locale: Locale;
  referralCode: string | null;
}) {
  const rankedCreators = getRankedCreators(items).slice(0, 5);

  if (rankedCreators.length === 0) {
    return null;
  }

  const labels =
    locale === "ko"
      ? {
          body: "좋아요, 댓글, 저장 반응이 높은 캐릭터를 성과 기반 리더보드로 보여줍니다.",
          cta: "채널 보기",
          eyebrow: "Character Ranking",
          latest: "최근 브이로그",
          leader: "팬 반응 1위",
          publicPosts: "공개",
          rankLabel: "순위",
          reason: "인기 이유",
          reactions: "반응",
          score: "반응 점수",
          title: "인기 AI 캐릭터 랭킹",
          videos: "영상",
        }
      : {
          body: "A performance-based leaderboard for characters with stronger likes, comments, and saves.",
          cta: "View channel",
          eyebrow: "Character Ranking",
          latest: "Latest vlog",
          leader: "Top fan reaction",
          publicPosts: "Public",
          rankLabel: "Rank",
          reason: "Why it is rising",
          reactions: "Reactions",
          score: "Reaction score",
          title: "Popular AI character ranking",
          videos: "Videos",
        };
  const [leader, ...otherCreators] = rankedCreators;

  const getHref = (creator: FanletterRankedCreator) =>
    creator.authorReferralCode
      ? buildPathWithReferral(
          `/${locale}/fanletter/creator/${creator.authorReferralCode}`,
          referralCode ?? creator.authorReferralCode,
        )
      : buildPathWithReferral(
          `/${locale}/fanletter/content/${creator.latestContentId}`,
          referralCode,
        );

  return (
    <section className="mb-10 scroll-mt-36 sm:scroll-mt-24" id="popular-characters">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#1f7c38]">
            {labels.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">
            {labels.title}
          </h2>
        </div>
        <p className="max-w-md text-sm font-medium leading-6 text-black/54">
          {labels.body}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <Link
          className="group relative min-h-[21rem] overflow-hidden rounded-lg border border-[#44f26e]/34 bg-[#07100b] p-5 !text-white shadow-[0_22px_64px_rgba(8,18,12,0.22)] transition hover:border-[#44f26e]/60"
          href={getHref(leader)}
        >
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  imageUrl={leader.authorAvatarImageUrl}
                  name={leader.authorName}
                  sizeClassName="size-16"
                />
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1 text-[0.68rem] font-semibold text-black">
                    <Crown className="size-3.5" />
                    {labels.leader}
                  </span>
                  <h3 className="mt-3 truncate text-3xl font-semibold tracking-normal">
                    {leader.authorName}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[#8dffa5]">
                    {leader.authorReferralCode ?? "FanLetter"}
                  </p>
                  <p className="mt-2 inline-flex rounded-full border border-[#44f26e]/28 bg-[#44f26e]/10 px-3 py-1 text-xs font-semibold text-[#b9ffc8]">
                    {getCreatorMomentumLabel(leader, locale)}
                  </p>
                </div>
              </div>
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-lg font-semibold text-black">
                #1
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                {
                  label: labels.score,
                  value: formatNumber(leader.score, locale),
                },
                {
                  label: labels.publicPosts,
                  value: formatNumber(leader.postCount, locale),
                },
                {
                  label: labels.videos,
                  value: formatNumber(leader.videoCount, locale),
                },
              ].map((metric) => (
                <div
                  className="rounded-lg border border-white/10 bg-white/[0.055] p-3"
                  key={metric.label}
                >
                  <p className="text-2xl font-semibold leading-none">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-white/42">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-6">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-white/40">
                {labels.latest}
              </p>
              <p className="mt-2 line-clamp-2 break-words text-base font-semibold leading-6 text-white/76 [overflow-wrap:anywhere]">
                {getDisplayContentTitleText(
                  leader.latestTitle,
                  leader.latestTitle,
                  locale,
                )}
              </p>
              <p className="mt-3 text-xs font-semibold text-white/42">
                {labels.reason}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#44f26e]">
                {labels.cta}
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </Link>

        <div className="grid gap-2">
          {otherCreators.map((creator, index) => (
            <Link
              className="group grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-black/10 bg-white p-3 text-black shadow-[0_12px_30px_rgba(8,18,12,0.07)] transition hover:border-[#29d85f]/60 hover:bg-[#effff3] sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
              href={getHref(creator)}
              key={creator.key}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-[#f6f8f4] text-sm font-semibold text-black/64">
                #{index + 2}
              </span>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  imageUrl={creator.authorAvatarImageUrl}
                  name={creator.authorName}
                  sizeClassName="size-11"
                />
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold">
                    {creator.authorName}
                  </h3>
                  <p className="mt-1 line-clamp-1 break-words text-xs font-medium text-black/50 [overflow-wrap:anywhere]">
                    {getDisplayContentTitleText(
                      creator.latestTitle,
                      creator.latestTitle,
                      locale,
                    )}
                  </p>
                  <p className="mt-1 line-clamp-1 text-[0.68rem] font-semibold text-[#16702e]">
                    {getCreatorMomentumLabel(creator, locale)}
                  </p>
                </div>
              </div>
              <div className="hidden min-w-[9.5rem] grid-cols-3 gap-1.5 sm:grid">
                {[
                  {
                    label: labels.reactions,
                    value: formatNumber(creator.score, locale),
                  },
                  {
                    label: labels.publicPosts,
                    value: formatNumber(creator.postCount, locale),
                  },
                  {
                    label: labels.videos,
                    value: formatNumber(creator.videoCount, locale),
                  },
                ].map((metric) => (
                  <div
                    className="rounded-lg border border-black/10 bg-white p-2 text-center"
                    key={metric.label}
                  >
                    <p className="text-sm font-semibold leading-none">
                      {metric.value}
                    </p>
                    <p className="mt-1 text-[0.52rem] font-semibold uppercase tracking-[0.08em] text-black/38">
                      {metric.label}
                    </p>
                  </div>
                ))}
              </div>
              <ArrowRight className="size-4 shrink-0 text-black/42 transition group-hover:translate-x-0.5 group-hover:text-[#16702e]" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function SocialMetrics({
  content,
  locale,
}: {
  content: FanletterPublicContentItem;
  locale: Locale;
}) {
  const copy = getCopy(locale);
  const metrics = [
    {
      icon: Heart,
      label: copy.metrics.likes,
      value: content.social.likeCount,
    },
    {
      icon: MessageCircle,
      label: copy.metrics.comments,
      value: content.social.commentCount,
    },
    {
      icon: Share2,
      label: copy.metrics.saves,
      value: content.social.saveCount,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <div
            className="rounded-lg border border-white/10 bg-white/[0.04] p-3"
            key={metric.label}
          >
            <Icon className="size-4 text-[#44f26e]" />
            <p className="mt-2 text-xl font-semibold leading-none">
              {formatNumber(metric.value, locale)}
            </p>
            <p className="mt-1 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-white/48">
              {metric.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function FanletterChannelHeroPreview({
  channelAvatarUrl,
  channelName,
  character,
  fanOnlyContentCount,
  featuredItem,
  locale,
  publicContentCount,
  referralCode,
}: {
  channelAvatarUrl: string | null;
  channelName: string;
  character: FanletterPublicCharacter | null;
  fanOnlyContentCount: number;
  featuredItem: FanletterPublicContentItem | null;
  locale: Locale;
  publicContentCount: number;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const labels =
    locale === "ko"
      ? {
          aiCreator: "AI 캐릭터",
          fanOnlyContent: "팬 전용",
          freeWall: "무료 공개 피드",
          latest: "대표 브이로그",
          openFeatured: "대표 브이로그 보기",
          paidReady: "팬 전용 요청 가능",
        }
      : {
          aiCreator: "AI character",
          fanOnlyContent: "Fan-only",
          freeWall: "Free public feed",
          latest: "Featured vlog",
          openFeatured: "View featured vlog",
          paidReady: "Fan-only requests open",
        };
  const heroTitle = featuredItem
    ? getDisplayContentTitle(featuredItem, locale)
    : character?.latestTitle
      ? getDisplayContentTitleText(character.latestTitle, character.latestTitle, locale)
      : copy.creator.empty;
  const heroHref = featuredItem
    ? getContentHref({ item: featuredItem, locale, referralCode })
    : null;
  const stats = [
    {
      label: copy.creator.publicPosts,
      value: formatNumber(publicContentCount, locale),
    },
    {
      label: copy.creator.characterVideoSignal,
      value: formatNumber(character?.videoContentCount ?? 0, locale),
    },
    {
      label: copy.creator.characterImageSignal,
      value: formatNumber(character?.avatarImageSet.length ?? 0, locale),
    },
  ];
  const fanOnlySignal =
    fanOnlyContentCount > 0
      ? `${labels.fanOnlyContent} ${formatNumber(fanOnlyContentCount, locale)}`
      : labels.paidReady;
  const preview = (
    <div className="group relative overflow-hidden rounded-lg border border-white/12 bg-[#07100b] shadow-[0_28px_90px_rgba(0,0,0,0.36)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#07100b]">
        {featuredItem?.primaryVideoUrl ? (
          <FanletterAutoplayVideo
            ariaHidden
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
            poster={featuredItem.coverImageUrl ?? undefined}
            src={featuredItem.primaryVideoUrl}
          />
        ) : featuredItem?.coverImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover transition duration-500 group-hover:scale-[1.025]"
            fill
            sizes="(max-width: 1024px) 100vw, 28rem"
            src={featuredItem.coverImageUrl}
          />
        ) : channelAvatarUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover"
            fill
            sizes="(max-width: 1024px) 100vw, 28rem"
            src={channelAvatarUrl}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_22%,rgba(68,242,110,0.28),transparent_34%),linear-gradient(145deg,#07100b,#111b15_52%,#1b2d22)]">
            <Clapperboard className="size-16 text-[#44f26e]" />
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.18)_40%,rgba(0,0,0,0.88)_100%)]" />
        <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-black">
            <BadgeCheck className="size-3.5" />
            {labels.aiCreator}
          </span>
          <span className="inline-flex rounded-full border border-white/16 bg-black/34 px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-white">
            {labels.freeWall}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-3">
            <Avatar
              imageUrl={channelAvatarUrl}
              name={channelName}
              sizeClassName="size-12"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {channelName}
              </p>
              <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-white/64">
                {heroTitle}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 bg-[#07100b] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-white/42">
            {labels.latest}
          </p>
          <span className="inline-flex rounded-full border border-[#44f26e]/22 bg-[#44f26e]/10 px-3 py-1 text-[0.66rem] font-semibold text-[#b9ffc8]">
            {fanOnlySignal}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div
              className="rounded-lg border border-white/10 bg-white/[0.055] p-3"
              key={stat.label}
            >
              <p className="text-xl font-semibold leading-none text-white">
                {stat.value}
              </p>
              <p className="mt-2 text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-white/42">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
        {heroHref ? (
          <div className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold text-black transition group-hover:bg-[#64ff84]">
            {labels.openFeatured}
            <ArrowRight className="size-4" />
          </div>
        ) : null}
      </div>
    </div>
  );

  return heroHref ? (
    <Link className="block" href={heroHref}>
      {preview}
    </Link>
  ) : (
    preview
  );
}

function FanletterCreatorFanAccessPanel({
  creatorReferralCode,
  fanOnlyContentCount,
  followHref,
  fanOnlyHref,
  isOwner = false,
  locale,
  ownerCreateHref,
  ownerStudioHref,
  publicVlogsHref,
  startHref,
}: {
  creatorReferralCode: string;
  fanOnlyContentCount: number;
  followHref: string;
  fanOnlyHref: string;
  isOwner?: boolean;
  locale: Locale;
  ownerCreateHref?: string;
  ownerStudioHref?: string;
  publicVlogsHref: string;
  startHref: string;
}) {
  const labels =
    locale === "ko"
      ? {
          body: "처음 온 팬은 공개 브이로그로 분위기를 보고, 마음에 들면 팔로우한 뒤 팬 전용 요청으로 이어가면 됩니다.",
          create: "내 채널 만들기",
          createPrefix: "나도 AI 캐릭터로 시작하려면",
          eyebrow: "팬 이용 안내",
          fanOnlyBody:
            "보고 싶은 장면이나 팬 전용 콘텐츠는 이 채널 안에서 요청하고 확인합니다.",
          fanOnlyReadyBody:
            "잠금 처리된 팬 전용 브이로그와 다음 요청 흐름을 같은 채널에서 이어갑니다.",
          fanOnlyView: "팬 전용 보기",
          fanOnlyReadyTitle: "팬 전용 콘텐츠 보기",
          fanOnlyTitle: "팬 전용 요청 보기",
          followBody:
            "계정을 연결해 팔로우하면 새 브이로그와 팬 요청 흐름을 이어갈 수 있습니다.",
          followTitle: "팔로우하고 알림 받기",
          freeBody: "가입 전에도 최근 공개 브이로그와 캐릭터 분위기를 바로 확인합니다.",
          freeTitle: "공개 브이로그 먼저 보기",
          ownerBody:
            "지금 보고 있는 채널은 연결된 계정의 캐릭터 채널입니다. 팬용 행동 대신 제작, 요청함, 공개 상태 관리로 이어갑니다.",
          ownerCreate: "새 브이로그 만들기",
          ownerFreeBody:
            "현재 공개 중인 브이로그와 채널 홈 노출 흐름을 확인합니다.",
          ownerFreeTitle: "공개 브이로그 관리",
          ownerMessageBody:
            "팬 요청과 댓글 반응은 스튜디오에서 다음 제작 후보로 바로 관리합니다.",
          ownerMessageTitle: "요청함 관리",
          ownerPaidBody:
            fanOnlyContentCount > 0
              ? "팬 전용 유료 브이로그의 공개 상태와 판매 흐름을 관리합니다."
              : "팬 전용 후보를 만들고 유료 공개 흐름으로 이어갈 수 있습니다.",
          ownerPaidTitle:
            fanOnlyContentCount > 0
              ? `팬 전용 관리 · ${formatNumber(fanOnlyContentCount, locale)}`
              : "팬 전용 제작 준비",
          ownerStudio: "스튜디오 관리",
          ownerTitle: "내 캐릭터 채널 관리",
          stepOne: "1",
          stepThree: "3",
          stepTwo: "2",
          title: "팬은 이렇게 이용하면 됩니다",
          view: "공개 브이로그 보기",
        }
      : {
          body: "Fans can preview public vlogs first, follow the channel if it feels right, then continue into fan-only requests.",
          create: "Start my channel",
          createPrefix: "To start as an AI character creator,",
          eyebrow: "Fan guide",
          fanOnlyBody:
            "Request the scenes you want or continue into fan-only content inside this channel.",
          fanOnlyReadyBody:
            "Continue into locked fan-only vlogs and the next request flow inside this channel.",
          fanOnlyView: "View fan-only",
          fanOnlyReadyTitle: "View fan-only content",
          fanOnlyTitle: "View fan-only requests",
          followBody:
            "Connect an account and follow to keep new vlog alerts and fan requests in one place.",
          followTitle: "Follow and get updates",
          freeBody: "Preview recent public vlogs and the character mood before signing up.",
          freeTitle: "Watch public vlogs first",
          ownerBody:
            "You are viewing the character channel connected to this account. Continue into creation, requests, and publishing management instead of fan actions.",
          ownerCreate: "Create new vlog",
          ownerFreeBody:
            "Review currently public vlogs and how they appear on the channel home.",
          ownerFreeTitle: "Manage public vlogs",
          ownerMessageBody:
            "Manage fan requests and comment signals from Studio as next-vlog candidates.",
          ownerMessageTitle: "Manage inbox",
          ownerPaidBody:
            fanOnlyContentCount > 0
              ? "Manage visibility and sales for fan-only paid vlogs."
              : "Create fan-only candidates and connect them to paid publishing.",
          ownerPaidTitle:
            fanOnlyContentCount > 0
              ? `Manage fan-only · ${formatNumber(fanOnlyContentCount, locale)}`
              : "Prepare fan-only",
          ownerStudio: "Manage studio",
          ownerTitle: "Manage my character channel",
          stepOne: "1",
          stepThree: "3",
          stepTwo: "2",
          title: "How fans can use this channel",
          view: "View public vlogs",
        };
  const accessItems: Array<{
    body: string;
    icon: LucideIcon;
    step?: string;
    title: string;
  }> = isOwner
    ? [
        {
          body: labels.ownerFreeBody,
          icon: Video,
          title: labels.ownerFreeTitle,
        },
        {
          body: labels.ownerPaidBody,
          icon: Crown,
          title: labels.ownerPaidTitle,
        },
        {
          body: labels.ownerMessageBody,
          icon: MessageCircleHeart,
          title: labels.ownerMessageTitle,
        },
      ]
    : [
        {
          body: labels.freeBody,
          icon: Video,
          step: labels.stepOne,
          title: labels.freeTitle,
        },
        {
          body: labels.followBody,
          icon: BellPlus,
          step: labels.stepTwo,
          title: labels.followTitle,
        },
        {
          body:
            fanOnlyContentCount > 0
              ? labels.fanOnlyReadyBody
              : labels.fanOnlyBody,
          icon: Crown,
          step: labels.stepThree,
          title:
            fanOnlyContentCount > 0
              ? `${labels.fanOnlyReadyTitle} · ${formatNumber(fanOnlyContentCount, locale)}`
              : labels.fanOnlyTitle,
        },
      ];
  const panelTitle = isOwner ? labels.ownerTitle : labels.title;
  const panelBody = isOwner ? labels.ownerBody : labels.body;

  return (
    <aside className="rounded-lg border border-black/10 bg-white p-5 text-black shadow-[0_18px_44px_rgba(8,18,12,0.1)] sm:p-6">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#1f7c38]">
        {labels.eyebrow}
      </p>
      <h2 className="mt-3 text-[1.9rem] font-semibold leading-[1.05] tracking-normal [word-break:keep-all]">
        {panelTitle}
      </h2>
      <p className="mt-3 text-sm font-medium leading-6 text-black/58">
        {panelBody}
      </p>

      <div className="mt-5 grid gap-2">
        {accessItems.map((item) => {
          const Icon = item.icon;

          return (
            <div
              className="flex gap-3 rounded-lg border border-black/10 bg-[#f6f8f4] p-3"
              key={item.title}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                {item.step ? (
                  <span className="text-sm font-bold">{item.step}</span>
                ) : (
                  <Icon className="size-5" />
                )}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-[#1f7c38]" />
                  <p className="text-sm font-semibold">{item.title}</p>
                </div>
                <p className="mt-1 text-sm font-medium leading-5 text-black/52">
                  {item.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {isOwner ? (
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-black/82"
            href={ownerStudioHref ?? publicVlogsHref}
          >
            {labels.ownerStudio}
          </Link>
        ) : (
          <FanletterFollowButton
            creatorReferralCode={creatorReferralCode}
            fallbackHref={followHref}
            locale={locale}
            theme="dark"
          />
        )}
        <Link
          className="inline-flex h-11 items-center justify-center rounded-full border border-black/12 px-4 text-sm font-semibold text-black transition hover:border-black/28"
          href={publicVlogsHref}
        >
          {labels.view}
        </Link>
      </div>
      <Link
        className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-full border border-black/12 px-4 text-sm font-semibold text-black transition hover:border-black/28"
        href={isOwner ? ownerCreateHref ?? fanOnlyHref : fanOnlyHref}
      >
        {isOwner ? labels.ownerCreate : labels.fanOnlyView}
      </Link>
      {!isOwner ? (
        <p className="mt-3 text-center text-xs font-medium leading-5 text-black/44">
          {labels.createPrefix}{" "}
          <Link
            className="font-semibold text-black underline decoration-black/24 underline-offset-4 transition hover:decoration-black"
            href={startHref}
          >
            {labels.create}
          </Link>
        </p>
      ) : null}
    </aside>
  );
}

function FanletterChannelTabs({
  channelHref,
  fanOnlyContentCount,
  hasFeaturedItem,
  locale,
  publicContentCount,
}: {
  channelHref: string;
  fanOnlyContentCount: number;
  hasFeaturedItem: boolean;
  locale: Locale;
  publicContentCount: number;
}) {
  const labels =
    locale === "ko"
      ? {
          about: "소개",
          featured: "대표 브이로그",
          fanOnly: "팬 전용",
          fanRequests: "팬 요청",
          home: "홈",
          mobileFeatured: "대표",
          mobilePublicVlogs: "공개",
          publicVlogs: "공개 브이로그",
        }
      : {
          about: "About",
          featured: "Featured",
          fanOnly: "Fan-only",
          fanRequests: "Requests",
          home: "Home",
          mobileFeatured: "Featured",
          mobilePublicVlogs: "Public",
          publicVlogs: "Public vlogs",
        };
  const tabs: FanletterChannelSectionTabItem[] = [
    { href: `${channelHref}#channel-home`, id: "channel-home", label: labels.home },
    hasFeaturedItem
      ? {
          href: `${channelHref}#featured-vlog`,
          id: "featured-vlog",
          label: labels.featured,
          mobileLabel: labels.mobileFeatured,
        }
      : null,
    { href: `${channelHref}#fan-requests`, id: "fan-requests", label: labels.fanRequests },
    {
      href: `${channelHref}#fan-only`,
      id: "fan-only",
      label:
        fanOnlyContentCount > 0
          ? `${labels.fanOnly} ${formatNumber(fanOnlyContentCount, locale)}`
          : labels.fanOnly,
    },
    {
      href: `${channelHref}#public-vlogs`,
      id: "public-vlogs",
      label: `${labels.publicVlogs} ${formatNumber(publicContentCount, locale)}`,
      mobileLabel: `${labels.mobilePublicVlogs} ${formatNumber(publicContentCount, locale)}`,
    },
    { href: `${channelHref}#about`, id: "about", label: labels.about },
  ].filter((tab): tab is FanletterChannelSectionTabItem => Boolean(tab));

  return (
    <FanletterChannelSectionTabs
      ariaLabel={
        locale === "ko" ? "캐릭터 채널 섹션" : "Character channel sections"
      }
      items={tabs}
    />
  );
}

function FanletterFollowCta({
  creatorReferralCode,
  fanOnlyHref,
  followHref,
  isOwner = false,
  locale,
  ownerCreateHref,
  ownerStudioHref,
}: {
  creatorReferralCode: string;
  fanOnlyHref: string;
  followHref: string;
  isOwner?: boolean;
  locale: Locale;
  ownerCreateHref?: string;
  ownerStudioHref?: string;
}) {
  const labels =
    locale === "ko"
      ? {
          fanOnly: "팬 전용 보기",
          ownerCreate: "새 브이로그",
          ownerStudio: "스튜디오 관리",
        }
      : {
          fanOnly: "View fan-only",
          ownerCreate: "New vlog",
          ownerStudio: "Manage studio",
        };

  if (isOwner) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
          href={ownerStudioHref ?? fanOnlyHref}
        >
          <Clapperboard className="size-4" />
          {labels.ownerStudio}
        </Link>
        <Link
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/16 px-5 text-sm font-semibold !text-white transition hover:bg-white/8"
          href={ownerCreateHref ?? fanOnlyHref}
        >
          <Rocket className="size-4" />
          {labels.ownerCreate}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <FanletterFollowButton
        creatorReferralCode={creatorReferralCode}
        fallbackHref={followHref}
        locale={locale}
      />
      <Link
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/16 px-5 text-sm font-semibold !text-white transition hover:bg-white/8"
        href={fanOnlyHref}
      >
        <Crown className="size-4" />
        {labels.fanOnly}
      </Link>
    </div>
  );
}

function FanletterFanOnlyPreview({
  channelName,
  fanOnlyHref,
  fanOnlyContentCount,
  isOwner = false,
  items,
  locale,
  ownerCreateHref,
  ownerManageHref,
  publicVlogsHref,
  referralCode,
  requestFormId,
  requestHref,
}: {
  channelName: string;
  fanOnlyHref: string;
  fanOnlyContentCount: number;
  isOwner?: boolean;
  items: FanletterPublicContentItem[];
  locale: Locale;
  ownerCreateHref?: string;
  ownerManageHref?: string;
  publicVlogsHref: string;
  referralCode: string | null;
  requestFormId: string;
  requestHref: string;
}) {
  const labels =
    locale === "ko"
      ? {
          actionTitle: "지금 할 수 있는 일",
          availableActionTitle: "팬 전용 진입",
          availableBody:
            "이 캐릭터가 유료 또는 팬 전용으로 공개한 브이로그를 한곳에 모았습니다. 카드를 열면 FanLetter 상세 화면에서 미리보기, 권한 확인, 다음 요청까지 같은 흐름으로 이어집니다.",
          availableCta: "첫 팬 전용 콘텐츠 보기",
          availableEyebrow: "팬 전용 라이브러리",
          availableNote:
            "미결제 카드는 미리보기와 잠금 해제 흐름으로, 결제 완료 카드는 바로 보기로 표시합니다.",
          availableTitle: "팬 전용 브이로그 모음",
          basePrice: "기본 가격",
          body: "팬 전용 요청은 유료 브이로그 후보로 바로 이어집니다. 보고 싶은 장면을 남기면 크리에이터가 스튜디오 요청함에서 확인하고 1 USDT 잠금 브이로그로 제작할 수 있습니다.",
          buyerProof: (count: string) => `${count}명 구매`,
          cardLockedCta: "미리보기",
          cardOwnerAccess: "관리 가능",
          cardOwnerBadge: "내 팬 전용",
          cardOwnerCta: "관리",
          cardProofHot: "인기 팬 전용",
          cardProofNew: "새 잠금 공개",
          cardProofProven: "결제 검증",
          cardProofRising: "반응 상승",
          cardUnlocked: "결제 완료",
          cardUnlockedAccess: "열람 가능",
          cardUnlockedCta: "바로 보기",
          cta: "팬 요청 보내기",
          eyebrow: "팬 전용 제작 슬롯",
          fanOnlyCount: "팬 전용",
          locked: "요청 가능",
          lockedAccess: "잠금 콘텐츠",
          note:
            "카드를 누르면 요청 문장이 자동으로 준비됩니다. 팬은 한 번에 요청하고, 크리에이터는 같은 내용을 제작 후보로 관리합니다.",
          ownerAvailableBody:
            "이 캐릭터의 팬 전용 유료 브이로그를 채널 관점에서 확인합니다. 공개 상태와 판매 흐름은 스튜디오에서 이어서 관리하세요.",
          ownerAvailableCta: "팬 전용 관리",
          ownerAvailableNote:
            "상세 화면에서 실제 권한 확인 흐름을 점검하고, 공개 상태 변경은 스튜디오에서 처리합니다.",
          ownerBody:
            "팬 전용 슬롯은 팬에게 요청을 받는 공간이지만, 채널 주인에게는 제작 후보를 관리하고 유료 브이로그를 만드는 작업 영역입니다.",
          ownerCta: "팬 전용 브이로그 만들기",
          ownerNote:
            "팬 요청 링크 대신 제작 화면과 스튜디오 관리로 연결됩니다.",
          ownerPresetCta: "이 주제로 제작",
          ownerSlotBadge: "제작 후보",
          paidDone: (amount: string) => `${amount} 결제됨`,
          priceLabel: "유료",
          presetCta: "이 요청으로 남기기",
          reactionProof: (count: string) => `${count}개 반응`,
          requestFanOnly: "다음 팬 전용 요청",
          requestFanOnlyBody: `${channelName}의 팬 전용 비공개 루틴, 쉬는 날 근황, 짧은 Q&A 같은 잠금 브이로그를 보고 싶어요.`,
          secondaryCta: "공개 브이로그 보기",
          teaserTitle: "공개 티저",
          title: "팬 전용 브이로그 공간 미리보기",
          unlockIncludes: "결제 후 열림",
          unlockedCount: "열람 가능",
        }
      : {
          actionTitle: "What you can do now",
          availableActionTitle: "Fan-only entry",
          availableBody:
            "Fan-only and paid vlogs from this character are grouped here. Opening a card continues into the FanLetter detail flow for preview, access verification, and the next fan request.",
          availableCta: "Open first fan-only vlog",
          availableEyebrow: "Fan-only library",
          availableNote:
            "Locked cards open preview and unlock, while purchased cards are marked as ready to watch.",
          availableTitle: "Fan-only vlog collection",
          basePrice: "Base price",
          body: "Fan-only requests can flow directly into paid vlog candidates. Leave the scene you want to see and the creator can review it in Studio, then publish it as a 1 USDT locked vlog.",
          buyerProof: (count: string) => `${count} buyers`,
          cardLockedCta: "Preview",
          cardOwnerAccess: "Manageable",
          cardOwnerBadge: "My fan-only",
          cardOwnerCta: "Manage",
          cardProofHot: "Popular fan-only",
          cardProofNew: "New locked drop",
          cardProofProven: "Payment-proven",
          cardProofRising: "Rising reactions",
          cardUnlocked: "Unlocked",
          cardUnlockedAccess: "Ready to watch",
          cardUnlockedCta: "Watch now",
          cta: "Send fan request",
          eyebrow: "Fan-only production slot",
          fanOnlyCount: "Fan-only",
          locked: "Requestable",
          lockedAccess: "Locked content",
          note:
            "Tap a card to prepare the request text automatically. Fans can request in one step, while creators manage the same idea as a production candidate.",
          ownerAvailableBody:
            "Review this character's fan-only paid vlogs from the channel view, then manage visibility and sales from Studio.",
          ownerAvailableCta: "Manage fan-only",
          ownerAvailableNote:
            "Check the detail-page access flow, then manage visibility from Studio.",
          ownerBody:
            "Fan-only slots collect fan requests for the audience, but for the owner they become production candidates and paid-vlog management.",
          ownerCta: "Create fan-only vlog",
          ownerNote:
            "Owner actions open creation and Studio management instead of the fan request form.",
          ownerPresetCta: "Create from this",
          ownerSlotBadge: "Candidate",
          paidDone: (amount: string) => `${amount} paid`,
          priceLabel: "Paid",
          presetCta: "Request this",
          reactionProof: (count: string) => `${count} reactions`,
          requestFanOnly: "Request next fan-only",
          requestFanOnlyBody: `I want to see ${channelName}'s fan-only private routine, off-day update, or short Q&A as a locked vlog.`,
          secondaryCta: "View public vlogs",
          teaserTitle: "Public teaser",
          title: "Fan-only vlog space preview",
          unlockIncludes: "Unlocks after payment",
          unlockedCount: "Unlocked",
        };
  const cards =
    locale === "ko"
      ? [
          {
            body: `${channelName}의 비공개 하루 루틴과 짧은 근황을 팬 전용 유료 브이로그 후보로 요청합니다.`,
            Icon: LockKeyhole,
            presetBody: `${channelName}의 아침 루틴, 쉬는 날 일정, 플레이리스트처럼 팬 전용으로 볼 수 있는 비공개 루틴 브이로그를 보고 싶어요.`,
            requestType: "vlog_request" as const,
            stage: "콘텐츠 슬롯",
            title: "비공개 루틴",
          },
          {
            body: "응원 메시지를 남기고 다음 팬 전용 브이로그에서 짧은 답장 장면으로 이어갑니다.",
            Icon: MessageCircleHeart,
            presetBody: `${channelName}에게 응원 메시지를 남기고, 다음 팬 전용 브이로그에서 짧게 답장받고 싶어요.`,
            requestType: "message" as const,
            stage: "대화 흐름",
            title: "팬 메시지",
          },
          {
            body: "공개 피드 전에 보고 싶은 선공개 장면과 제작 노트를 팬 전용 후보로 요청합니다.",
            Icon: Clapperboard,
            presetBody: `${channelName}의 다음 공개 브이로그 전에 선공개 장면이나 제작 노트를 팬 전용으로 보고 싶어요.`,
            requestType: "vlog_request" as const,
            stage: "선공개 구조",
            title: "선공개 노트",
          },
        ]
      : [
          {
            body: `Request ${channelName}'s private routine or short update as a fan-only paid vlog candidate.`,
            Icon: LockKeyhole,
            presetBody: `I want to see ${channelName}'s morning routine, off-day schedule, or playlist as a fan-only private routine vlog.`,
            requestType: "vlog_request" as const,
            stage: "Content slot",
            title: "Private routine",
          },
          {
            body: "Leave a support message and turn it into a short reply scene in the next fan-only vlog.",
            Icon: MessageCircleHeart,
            presetBody: `I want to leave a support message for ${channelName} and see a short reply in the next fan-only vlog.`,
            requestType: "message" as const,
            stage: "Message flow",
            title: "Fan messages",
          },
          {
            body: "Request early scenes or production notes before the public feed release.",
            Icon: Clapperboard,
            presetBody: `I want to see early scenes or production notes before ${channelName}'s next public vlog.`,
            requestType: "vlog_request" as const,
            stage: "Early access",
            title: "Early notes",
          },
        ];

  if (items.length > 0) {
    const buildFanOnlyContentHref = (item: FanletterPublicContentItem) =>
      setPathSearchParams(
        getContentHref({
          item,
          locale,
          referralCode,
        }),
        { returnTo: fanOnlyHref },
      );
    const firstItemHref = buildFanOnlyContentHref(items[0]);
    const unlockedFanOnlyContentCount = isOwner
      ? fanOnlyContentCount
      : items.filter((item) => item.canViewerAccess).length;
    const fanOnlyStats = [
      {
        label: labels.fanOnlyCount,
        value: formatNumber(fanOnlyContentCount, locale),
      },
      {
        label: labels.unlockedCount,
        value: formatNumber(unlockedFanOnlyContentCount, locale),
      },
      {
        label: labels.basePrice,
        value: `${items[0]?.priceUsdt ?? "1"} USDT`,
      },
    ];

    return (
      <section className="mb-8 scroll-mt-36 sm:scroll-mt-24" id="fan-only">
        <div className="rounded-lg bg-[#07100b] p-5 text-white shadow-[0_24px_70px_rgba(8,18,12,0.18)] sm:p-6 lg:p-7">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.42fr)] lg:items-start">
            <div className="max-w-3xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
                {labels.availableEyebrow}
              </p>
              <h2 className="mt-3 text-[2rem] font-semibold leading-[1.05] tracking-normal [word-break:keep-all] sm:text-[2.8rem]">
                {labels.availableTitle}
              </h2>
              <p className="mt-3 text-sm font-medium leading-6 text-white/64 sm:text-base sm:leading-7">
                {isOwner ? labels.ownerAvailableBody : labels.availableBody}
              </p>
              <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.055] p-3 text-xs font-semibold leading-5 text-white/54">
                {isOwner ? labels.ownerAvailableNote : labels.availableNote}
              </p>
            </div>

            <aside className="rounded-lg border border-[#44f26e]/20 bg-[#44f26e]/10 p-4">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[#9bffad]">
                {labels.availableActionTitle}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                {fanOnlyStats.map((stat) => (
                  <div
                    className="rounded-lg border border-white/10 bg-black/18 p-3"
                    key={stat.label}
                  >
                    <p className="text-xl font-semibold leading-none text-white">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-white/44">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-2">
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
                  href={firstItemHref}
                >
                  <LockKeyhole className="size-4" />
                  {labels.availableCta}
                </Link>
                {isOwner ? (
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-black/18 px-4 text-sm font-semibold !text-white transition hover:bg-white/10"
                    href={ownerManageHref ?? ownerCreateHref ?? firstItemHref}
                  >
                    <Clapperboard className="size-4" />
                    {labels.ownerAvailableCta}
                  </Link>
                ) : (
                  <FanletterFanRequestPresetLink
                    body={labels.requestFanOnlyBody}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-black/18 px-4 text-sm font-semibold !text-white transition hover:bg-white/10"
                    formId={requestFormId}
                    href={requestHref}
                    requestType="vlog_request"
                  >
                    <BellPlus className="size-4" />
                    {labels.requestFanOnly}
                  </FanletterFanRequestPresetLink>
                )}
              </div>
            </aside>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const href = buildFanOnlyContentHref(item);
              const publishedAt = formatDate(item.publishedAt, locale);
              const displaySummary = getDisplayContentSummary(item, locale);
              const displayTeaser = getDisplayPaidTeaser(item, locale);
              const displayTitle = getDisplayContentTitle(item, locale);
              const hasAccess = isOwner || item.canViewerAccess;
              const lockedMediaLabel = getLockedMediaLabel(item, locale);
              const reactionCount =
                item.social.commentCount + item.social.saveCount;
              const fanOnlyProofLabel =
                item.social.paidBuyerCount >= 10
                  ? labels.cardProofHot
                  : item.social.paidBuyerCount > 0
                    ? labels.cardProofProven
                    : reactionCount > 0
                      ? labels.cardProofRising
                      : labels.cardProofNew;
              const buyerProofLabel =
                item.social.paidBuyerCount > 0
                  ? labels.buyerProof(
                      formatNumber(item.social.paidBuyerCount, locale),
                    )
                  : `${item.priceUsdt ?? "1"} USDT`;
              const reactionProofLabel =
                reactionCount > 0
                  ? labels.reactionProof(formatNumber(reactionCount, locale))
                  : lockedMediaLabel;
              const StatusIcon = isOwner
                ? Clapperboard
                : hasAccess
                  ? BadgeCheck
                  : LockKeyhole;
              const statusLabel = isOwner
                ? labels.cardOwnerAccess
                : hasAccess
                  ? labels.cardUnlockedAccess
                  : labels.lockedAccess;
              const primaryBadgeLabel = isOwner
                ? labels.cardOwnerBadge
                : hasAccess
                  ? labels.cardUnlocked
                  : labels.priceLabel;
              const secondaryBadgeLabel = isOwner
                ? labels.cardOwnerAccess
                : hasAccess
                  ? labels.paidDone(`${item.priceUsdt ?? "1"} USDT`)
                  : `${item.priceUsdt ?? "1"} USDT`;
              const cardCtaLabel = isOwner
                ? labels.cardOwnerCta
                : hasAccess
                  ? labels.cardUnlockedCta
                  : labels.cardLockedCta;

              return (
                <Link
                  className="group min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.055] text-white transition hover:border-[#44f26e]/42 hover:bg-white/[0.075]"
                  href={href}
                  key={item.contentId}
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#07100b]">
                    {item.coverImageUrl ? (
                      <Image
                        alt=""
                        aria-hidden="true"
                        className={
                          hasAccess
                            ? "object-cover transition duration-500 group-hover:scale-[1.025]"
                            : "scale-[1.06] object-cover blur-lg brightness-[0.74] saturate-[0.9] transition duration-500 group-hover:scale-[1.09]"
                        }
                        fill
                        sizes="(max-width: 640px) 100vw, 32vw"
                        src={item.coverImageUrl}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[linear-gradient(145deg,#07100b,#101820_54%,#1b2b20)] text-white/74">
                        <StatusIcon className="size-14 text-[#44f26e]" />
                        <span className="text-xs font-semibold uppercase tracking-[0.22em]">
                          {labels.fanOnlyCount}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.2)_42%,rgba(0,0,0,0.86)_100%)]" />
                    <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] ${
                          hasAccess
                            ? "bg-[#44f26e] text-black"
                            : "border border-white/16 bg-black/54 text-white"
                        }`}
                      >
                        <StatusIcon className="size-3.5" />
                        {primaryBadgeLabel}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] ${
                          hasAccess
                            ? "border-[#44f26e]/45 bg-[#44f26e]/14 text-[#b9ffc8]"
                            : "border-white/16 bg-black/48 text-white"
                        }`}
                      >
                        {secondaryBadgeLabel}
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center gap-2 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-[#b9ffc8]">
                        <StatusIcon className="size-3.5" />
                        {statusLabel}
                      </div>
                      <h3 className="mt-2 line-clamp-2 break-words text-xl font-semibold leading-tight [overflow-wrap:anywhere]">
                        {displayTitle}
                      </h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 break-words text-sm font-medium leading-6 text-white/58 [overflow-wrap:anywhere]">
                      {displaySummary}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[0.62rem] font-semibold ${
                          item.social.paidBuyerCount > 0
                            ? "bg-[#44f26e] text-black"
                            : "border border-[#44f26e]/20 bg-[#44f26e]/10 text-[#b9ffc8]"
                        }`}
                      >
                        {fanOnlyProofLabel}
                      </span>
                      <span className="inline-flex rounded-full border border-white/12 bg-white/[0.055] px-2.5 py-1 text-[0.62rem] font-semibold text-white/64">
                        {buyerProofLabel}
                      </span>
                      <span className="inline-flex rounded-full border border-white/12 bg-white/[0.055] px-2.5 py-1 text-[0.62rem] font-semibold text-white/64">
                        {reactionProofLabel}
                      </span>
                    </div>
                    {!hasAccess ? (
                      <div className="mt-3 rounded-lg border border-[#44f26e]/18 bg-black/18 p-3">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#9bffad]">
                          {labels.teaserTitle}
                        </p>
                        <p className="mt-2 line-clamp-3 break-words text-sm font-medium leading-6 text-white/78 [overflow-wrap:anywhere]">
                          {displayTeaser}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className="inline-flex rounded-full border border-white/12 bg-white/[0.055] px-2.5 py-1 text-[0.62rem] font-semibold text-white/64">
                            {labels.unlockIncludes}
                          </span>
                          <span className="inline-flex rounded-full border border-[#44f26e]/22 bg-[#44f26e]/10 px-2.5 py-1 text-[0.62rem] font-semibold text-[#b9ffc8]">
                            {lockedMediaLabel}
                          </span>
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                      <span className="text-xs font-semibold text-white/42">
                        {publishedAt ?? "FanLetter"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#b9ffc8]">
                        {cardCtaLabel}
                        <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8 scroll-mt-36 sm:scroll-mt-24" id="fan-only">
      <div className="rounded-lg bg-[#07100b] p-5 text-white shadow-[0_24px_70px_rgba(8,18,12,0.18)] sm:p-6 lg:p-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(21rem,0.46fr)] lg:items-start">
          <div className="max-w-2xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
              {labels.eyebrow}
            </p>
            <h2 className="mt-3 text-[2rem] font-semibold leading-[1.05] tracking-normal [word-break:keep-all] sm:text-[2.6rem]">
              {labels.title}
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-white/62 sm:text-base sm:leading-7">
              {isOwner ? labels.ownerBody : labels.body}
            </p>
            <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.055] p-3 text-xs font-semibold leading-5 text-white/52">
              {isOwner ? labels.ownerNote : labels.note}
            </p>
          </div>

          <aside className="rounded-lg border border-[#44f26e]/20 bg-[#44f26e]/10 p-4">
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[#9bffad]">
              {labels.actionTitle}
            </p>
            <div className="mt-3 grid gap-2">
              {isOwner ? (
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
                  href={ownerCreateHref ?? requestHref}
                >
                  <Clapperboard className="size-4" />
                  {labels.ownerCta}
                </Link>
              ) : (
                <FanletterFanRequestPresetLink
                  body={labels.requestFanOnlyBody}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
                  formId={requestFormId}
                  href={requestHref}
                  requestType="vlog_request"
                >
                  <BellPlus className="size-4" />
                  {labels.cta}
                </FanletterFanRequestPresetLink>
              )}
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-black/18 px-4 text-sm font-semibold !text-white transition hover:bg-white/10"
                href={publicVlogsHref}
              >
                <Video className="size-4" />
                {labels.secondaryCta}
              </Link>
            </div>
          </aside>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {cards.map(({ Icon, body, presetBody, requestType, stage, title }) => {
            const cardContent = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                    <Icon className="size-5" />
                  </span>
                  <span className="rounded-full border border-[#44f26e]/22 bg-[#44f26e]/10 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#b9ffc8]">
                    {isOwner ? labels.ownerSlotBadge : labels.locked}
                  </span>
                </div>
                <p className="mt-5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#8dffa5]">
                  {stage}
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-normal">
                  {title}
                </h3>
                <p className="mt-3 text-sm font-medium leading-6 text-white/56">
                  {body}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#b9ffc8]">
                  {isOwner ? labels.ownerPresetCta : labels.presetCta}
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </span>
              </>
            );

            return isOwner ? (
              <Link
                className="group min-h-[14.5rem] rounded-lg border border-white/10 bg-white/[0.055] p-4 text-white transition hover:border-[#44f26e]/42 hover:bg-white/[0.075]"
                href={ownerCreateHref ?? requestHref}
                key={title}
              >
                {cardContent}
              </Link>
            ) : (
              <FanletterFanRequestPresetLink
                body={presetBody}
                className="group min-h-[14.5rem] rounded-lg border border-white/10 bg-white/[0.055] p-4 text-white transition hover:border-[#44f26e]/42 hover:bg-white/[0.075]"
                formId={requestFormId}
                href={requestHref}
                key={title}
                requestType={requestType}
              >
                {cardContent}
              </FanletterFanRequestPresetLink>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FanletterFanPromptPanel({
  characterName,
  className = "",
  creatorReferralCode,
  followHref,
  id,
  isOwner = false,
  locale,
  ownerCreateHref,
  ownerRequestsHref,
  ownerStudioHref,
  previewRequests = [],
  publicVlogsHref,
  referralCode,
  requestHref,
  sourceContentId,
  startHref,
}: {
  characterName: string;
  className?: string;
  creatorReferralCode: string | null;
  followHref: string;
  id?: string;
  isOwner?: boolean;
  locale: Locale;
  ownerCreateHref?: string;
  ownerRequestsHref?: string;
  ownerStudioHref?: string;
  previewRequests?: FanletterPublicFanRequestPreview[];
  publicVlogsHref?: string;
  referralCode?: string | null;
  requestHref: string;
  sourceContentId?: string | null;
  startHref: string;
}) {
  const labels =
    locale === "ko"
      ? {
          body: "보고 싶은 장면을 한 줄로 남기면 크리에이터가 스튜디오 요청함에서 바로 확인하고 다음 브이로그 소재로 쓸 수 있습니다.",
          eyebrow: "팬 요청",
          guideTitle: "어떻게 쓰나요",
          messageBody: "이 캐릭터 채널을 팔로우하고 새 브이로그 알림을 받을 수 있습니다.",
          messageCta: "팔로우하고 알림 받기",
          messageTitle: "채널 팔로우",
          ownerBody:
            "이 채널은 연결된 계정의 캐릭터 채널입니다. 팬 요청을 직접 남기는 대신 요청함을 확인하고 다음 브이로그 제작으로 이어가세요.",
          ownerCreateBody:
            "팬 반응이나 최근 요청을 바탕으로 바로 다음 AI 브이로그를 만듭니다.",
          ownerCreateCta: "새 브이로그 만들기",
          ownerCreateTitle: "다음 브이로그 제작",
          ownerRequestBody:
            "새 요청, 검토 중 요청, 제작 완료 요청을 스튜디오에서 관리합니다.",
          ownerRequestCta: "요청함 관리",
          ownerRequestTitle: "팬 요청함",
          ownerSteps: [
            {
              body: "최근 팬 요청과 제작 완료 사례를 확인합니다.",
              title: "요청 흐름 확인",
            },
            {
              body: "좋은 요청을 검토 상태로 옮기고 제작 후보로 분류합니다.",
              title: "제작 후보 정리",
            },
            {
              body: "선택한 요청을 새 브이로그 생성 화면으로 이어갑니다.",
              title: "브이로그로 제작",
            },
          ],
          ownerTitle: `${characterName} 채널의 요청을 관리하세요`,
          fulfilledBadge: "제작 완료",
          fulfilledBody:
            "팬이 남긴 요청이 실제 공개 브이로그로 연결된 사례입니다.",
          fulfilledCta: "제작 결과 보기",
          fulfilledTitle: "요청이 브이로그가 된 사례",
          previewBody:
            "최근 요청을 익명 중심으로 보여줍니다. 비슷한 장면을 이어서 요청해도 됩니다.",
          previewEmptyRequester: "익명 팬",
          previewMessage: "응원",
          previewEyebrow: "팬 요청",
          previewTitle: "팬들이 보고 싶어하는 장면",
          previewVlogRequest: "브이로그 요청",
          requestCta: "다음 장면 요청",
          startBody: "내 AI 캐릭터를 만들고 같은 방식으로 팬 참여를 받을 수 있습니다.",
          startCta: "내 캐릭터 만들기",
          startTitle: "내 AI 캐릭터 만들기",
          steps: [
            {
              body: "장소, 룩, 상황, 질문처럼 보고 싶은 장면을 짧게 적습니다.",
              title: "장면을 적기",
            },
            {
              body: "이름은 선택 사항입니다. 요청만 남겨도 스튜디오 요청함에 저장됩니다.",
              title: "요청 남기기",
            },
            {
              body: "크리에이터가 요청을 골라 바로 브이로그 제작 흐름으로 이어갑니다.",
              title: "브이로그로 제작",
            },
          ],
          title: `${characterName}의 다음 브이로그를 요청하세요`,
        }
      : {
          body: "Write the scene you want to see, and the creator can pick it up from the studio inbox as a next-vlog idea.",
          eyebrow: "Fan request",
          guideTitle: "How it works",
          messageBody: "Follow first, then continue into alerts and fan conversation flows.",
          messageCta: "Follow and message",
          messageTitle: "Continue with a message",
          ownerBody:
            "This channel belongs to the connected account. Manage incoming requests and continue into the next vlog workflow instead of leaving a fan request.",
          ownerCreateBody:
            "Create the next AI vlog from fan signals or recent requests.",
          ownerCreateCta: "Create new vlog",
          ownerCreateTitle: "Next vlog production",
          ownerRequestBody:
            "Manage new, reviewed, and produced requests from Studio.",
          ownerRequestCta: "Manage requests",
          ownerRequestTitle: "Fan request inbox",
          ownerSteps: [
            {
              body: "Review recent fan requests and produced examples.",
              title: "Check request flow",
            },
            {
              body: "Move strong requests into reviewed production candidates.",
              title: "Organize candidates",
            },
            {
              body: "Continue selected requests into the vlog creation flow.",
              title: "Produce as vlog",
            },
          ],
          ownerTitle: `Manage requests for ${characterName}`,
          fulfilledBadge: "Produced",
          fulfilledBody:
            "These fan notes were turned into published vlogs.",
          fulfilledCta: "View result",
          fulfilledTitle: "Requests that became vlogs",
          previewBody:
            "Recent requests are shown with privacy-friendly fan names. You can build on a similar scene.",
          previewEmptyRequester: "Anonymous fan",
          previewEyebrow: "Fan voices",
          previewMessage: "Message",
          previewTitle: "Scenes fans want to see",
          previewVlogRequest: "Vlog request",
          requestCta: "Request next scene",
          startBody: "Create your own AI character and collect fan participation the same way.",
          startCta: "Start channel",
          startTitle: "Reply with my character",
          steps: [
            {
              body: "Write the place, outfit, situation, or question you want to see.",
              title: "Describe a scene",
            },
            {
              body: "Your name is optional. The request is saved to the studio inbox.",
              title: "Leave the request",
            },
            {
              body: "The creator can turn selected requests into the next vlog flow.",
              title: "Become a vlog",
            },
          ],
          title: `Request ${characterName}'s next vlog`,
        };
  const requestFormId = id ? `${id}-form` : "fanletter-fan-request-form";
  const requestFormHref = creatorReferralCode ? `#${requestFormId}` : requestHref;
  const displayTitle = isOwner ? labels.ownerTitle : labels.title;
  const displayBody = isOwner ? labels.ownerBody : labels.body;
  const displaySteps = isOwner ? labels.ownerSteps : labels.steps;
  const displayRequestCta = isOwner ? labels.ownerRequestCta : labels.requestCta;
  const displayRequestHref = isOwner
    ? ownerRequestsHref ?? ownerStudioHref ?? requestHref
    : requestFormHref;
  const actions = isOwner
    ? [
        {
          body: labels.ownerRequestBody,
          cta: labels.ownerRequestCta,
          href: ownerRequestsHref ?? ownerStudioHref ?? requestHref,
          icon: MessageCircleHeart,
          title: labels.ownerRequestTitle,
        },
        {
          body: labels.ownerCreateBody,
          cta: labels.ownerCreateCta,
          href: ownerCreateHref ?? startHref,
          icon: Rocket,
          title: labels.ownerCreateTitle,
        },
      ]
    : [
        {
          body: labels.messageBody,
          cta: labels.messageCta,
          href: followHref,
          icon: MessageCircleHeart,
          title: labels.messageTitle,
        },
        {
          body: labels.startBody,
          cta: labels.startCta,
          href: startHref,
          icon: Rocket,
          title: labels.startTitle,
        },
      ];
  const fulfilledRequests = previewRequests
    .filter((request) => request.status === "used" && request.usedContentId)
    .slice(0, 2);
  const recentRequests = previewRequests
    .filter(
      (request) =>
        !(
          request.status === "used" &&
          request.usedContentId &&
          fulfilledRequests.some(
            (fulfilledRequest) =>
              fulfilledRequest.usedContentId === request.usedContentId,
          )
        ),
    )
    .slice(0, 3);
  const previewReferralCode = referralCode ?? creatorReferralCode;

  return (
    <section
      className={`scroll-mt-36 rounded-lg border border-[#44f26e]/22 bg-[#07100b] p-5 text-white shadow-[0_24px_70px_rgba(8,18,12,0.18)] sm:scroll-mt-24 sm:p-6 ${className}`}
      id={id}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
            {labels.eyebrow}
          </p>
          <h2 className="mt-3 text-[2rem] font-semibold leading-[1.05] tracking-normal [word-break:keep-all] sm:text-[2.55rem]">
            {displayTitle}
          </h2>
          <p className="mt-3 text-sm font-medium leading-6 text-white/62 sm:text-base sm:leading-7">
            {displayBody}
          </p>
        </div>
        <Link
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
          href={displayRequestHref}
        >
          <PenLine className="size-4" />
          {displayRequestCta}
        </Link>
      </div>

      <div className="mt-6 rounded-lg border border-[#44f26e]/18 bg-[#44f26e]/8 p-4">
        <p className="text-sm font-semibold text-[#b9ffc8]">
          {labels.guideTitle}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {displaySteps.map((step, index) => (
            <div
              className="rounded-lg border border-white/10 bg-black/18 p-3"
              key={step.title}
            >
              <span className="text-lg font-semibold leading-none text-[#44f26e]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-base font-semibold tracking-normal">
                {step.title}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-white/56">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {previewRequests.length > 0 ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.045] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[#44f26e]">
                {labels.previewEyebrow}
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-normal [word-break:keep-all]">
                {labels.previewTitle}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-white/56">
                {labels.previewBody}
              </p>
            </div>
            <Link
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#44f26e]/24 px-3 text-sm font-semibold !text-[#b9ffc8] transition hover:bg-[#44f26e]/10"
              href={displayRequestHref}
            >
              <PenLine className="size-4" />
              {displayRequestCta}
            </Link>
          </div>
          {fulfilledRequests.length > 0 ? (
            <div className="mt-4 rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                  <BadgeCheck className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[#8dffa5]">
                    {labels.fulfilledBadge}
                  </p>
                  <h4 className="mt-1 text-lg font-semibold tracking-normal">
                    {labels.fulfilledTitle}
                  </h4>
                  <p className="mt-1 text-sm font-medium leading-6 text-white/58">
                    {labels.fulfilledBody}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {fulfilledRequests.map((request, index) => {
                  const createdLabel = formatDate(request.createdAt, locale);
                  const requester =
                    request.requesterDisplayName || labels.previewEmptyRequester;
                  const contentHref = request.usedContentId
                    ? buildPathWithReferral(
                        `/${locale}/fanletter/content/${request.usedContentId}`,
                        previewReferralCode,
                      )
                    : null;

                  return (
                    <article
                      className="rounded-lg border border-[#44f26e]/20 bg-black/22 p-4"
                      key={`${request.usedContentId}-${request.createdAt}-${index}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#44f26e] px-3 py-1 text-[0.68rem] font-semibold text-black">
                          {labels.fulfilledBadge}
                        </span>
                        <span className="text-xs font-semibold text-white/36">
                          {createdLabel}
                        </span>
                      </div>
                      <p className="mt-4 line-clamp-3 break-words text-sm font-semibold leading-6 text-white [overflow-wrap:anywhere]">
                        {request.body}
                      </p>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs font-semibold text-white/42">
                          {requester}
                        </p>
                        {contentHref ? (
                          <Link
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-3 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
                            href={contentHref}
                          >
                            {labels.fulfilledCta}
                            <ArrowRight className="size-4" />
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {recentRequests.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {recentRequests.map((request, index) => {
                const typeLabel =
                  request.requestType === "message"
                    ? labels.previewMessage
                    : labels.previewVlogRequest;
                const requester =
                  request.requesterDisplayName || labels.previewEmptyRequester;
                const createdLabel = formatDate(request.createdAt, locale);

                return (
                  <article
                    className="rounded-lg border border-white/10 bg-black/18 p-4"
                    key={`${request.createdAt}-${request.body}-${index}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full border border-[#44f26e]/24 bg-[#44f26e]/10 px-3 py-1 text-[0.68rem] font-semibold text-[#b9ffc8]">
                        {typeLabel}
                      </span>
                      <span className="text-xs font-semibold text-white/36">
                        {createdLabel}
                      </span>
                    </div>
                    <p className="mt-4 line-clamp-4 break-words text-sm font-medium leading-6 text-white/72 [overflow-wrap:anywhere]">
                      {request.body}
                    </p>
                    <p className="mt-4 text-xs font-semibold text-white/42">
                      {requester}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {creatorReferralCode && !isOwner ? (
        <FanletterFanRequestForm
          characterName={characterName}
          creatorReferralCode={creatorReferralCode}
          followHref={followHref}
          formId={requestFormId}
          locale={locale}
          publicVlogsHref={publicVlogsHref}
          referralCode={referralCode}
          sourceContentId={sourceContentId}
        />
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              className="group rounded-lg border border-white/10 bg-white/[0.045] p-4 transition hover:border-[#44f26e]/46 hover:bg-white/[0.07]"
              href={action.href}
              key={action.title}
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-normal">
                {action.title}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-white/56">
                {action.body}
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#44f26e]">
                {action.cta}
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FanletterRelatedVlogCard({
  fallbackImageUrl,
  item,
  locale,
  referralCode,
}: {
  fallbackImageUrl: string | null;
  item: FanletterPublicContentItem;
  locale: Locale;
  referralCode: string | null;
}) {
  const href = getContentHref({ item, locale, referralCode });
  const fallbackThumbUrl = item.authorAvatarImageUrl ?? fallbackImageUrl;
  const displaySummary = getDisplayContentSummary(item, locale);
  const displayTitle = getDisplayContentTitle(item, locale);
  const shouldBlurCover =
    item.priceType === "paid" && !item.canViewerAccess;

  return (
    <Link
      className="group grid min-w-0 grid-cols-[5.75rem_minmax(0,1fr)] gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3 transition hover:bg-white/[0.07]"
      href={href}
    >
      <div className="relative aspect-[9/14] overflow-hidden rounded-lg bg-[#07100b]">
        {item.coverImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className={
              shouldBlurCover
                ? "scale-[1.06] object-cover blur-lg brightness-[0.74] saturate-[0.9] transition duration-500 group-hover:scale-[1.09]"
                : "object-cover transition duration-500 group-hover:scale-[1.025]"
            }
            fill
            sizes="6rem"
            src={item.coverImageUrl}
          />
        ) : fallbackThumbUrl ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.025]"
            style={{ backgroundImage: `url(${fallbackThumbUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#101820] text-white/52">
            <Video className="size-7 text-[#44f26e]" />
            <span className="text-[0.58rem] font-semibold uppercase tracking-[0.14em]">
              Video
            </span>
          </div>
        )}
      </div>
      <div className="min-w-0 self-center">
        <p className="line-clamp-2 break-words text-base font-semibold leading-tight text-white [overflow-wrap:anywhere]">
          {displayTitle}
        </p>
        <p className="mt-2 line-clamp-2 break-words text-sm font-medium leading-5 text-white/54 [overflow-wrap:anywhere]">
          {displaySummary}
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-white/42">
          <Heart className="size-3.5 text-[#44f26e]" />
          {formatNumber(getContentEngagementScore(item), locale)}
        </div>
      </div>
    </Link>
  );
}

function FanletterRelatedVlogs({
  fallbackImageUrl,
  items,
  locale,
  referralCode,
}: {
  fallbackImageUrl: string | null;
  items: FanletterPublicContentItem[];
  locale: Locale;
  referralCode: string | null;
}) {
  if (items.length === 0) {
    return null;
  }

  const labels =
    locale === "ko"
      ? {
          eyebrow: "같은 캐릭터",
          title: "다음에 볼 공개 브이로그",
        }
      : {
          eyebrow: "Same character",
          title: "Public vlogs to watch next",
        };

  return (
    <section className="mt-6 rounded-lg border border-white/10 bg-[#07100b] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
            {labels.eyebrow}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-normal text-white">
            {labels.title}
          </h2>
        </div>
        <ArrowRight className="size-5 shrink-0 text-white/34" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <FanletterRelatedVlogCard
            fallbackImageUrl={fallbackImageUrl}
            item={item}
            key={item.contentId}
            locale={locale}
            referralCode={referralCode}
          />
        ))}
      </div>
    </section>
  );
}

function FanletterFanRequestSourceCard({
  channelHref,
  content,
  isOwnContent = false,
  locale,
  ownerManageHref,
  requestHref,
}: {
  channelHref: string;
  content: FanletterPublicContentDetail;
  isOwnContent?: boolean;
  locale: Locale;
  ownerManageHref?: string;
  requestHref: string;
}) {
  const source = content.fanRequestSource;

  if (!source) {
    return null;
  }

  const labels =
    locale === "ko"
      ? {
          channelCta: "캐릭터 채널 보기",
          cta: "다음 장면 요청",
          eyebrow: "팬 요청",
          flow: ["팬 요청 접수", "브이로그 제작", "다음 요청 가능"],
          message: "팬 메시지 기반",
          originalRequest: "원 요청 내용",
          requestedBy: "요청",
          result:
            "팬이 남긴 한마디가 실제 브이로그 소재로 반영되었습니다. 같은 방식으로 다음 장면도 요청할 수 있습니다.",
          ownerCta: "요청함에서 관리",
          ownerResult:
            "팬 요청을 반영해 만든 내 브이로그입니다. 요청 상태와 다음 제작 후보는 스튜디오에서 이어서 관리하세요.",
          title: "팬 요청으로 만든 브이로그",
          vlogRequest: "다음 브이로그 요청 기반",
        }
      : {
          channelCta: "View character channel",
          cta: "Request next scene",
          eyebrow: "Fan Request",
          flow: ["Request received", "Vlog produced", "Next request open"],
          message: "Inspired by a fan message",
          originalRequest: "Original request",
          requestedBy: "Request",
          result:
            "A fan note became the idea behind this vlog. You can request the next scene the same way.",
          ownerCta: "Manage in inbox",
          ownerResult:
            "This is your vlog made from a fan request. Continue managing request status and next production candidates in Studio.",
          title: "Vlog made from a fan request",
          vlogRequest: "Inspired by a next-vlog request",
        };
  const typeLabel =
    source.requestType === "message" ? labels.message : labels.vlogRequest;
  const createdLabel = formatDate(source.createdAt, locale);

  return (
    <section className="mt-6 rounded-lg border border-[#44f26e]/34 bg-[#07100b] p-4 text-white shadow-[0_20px_58px_rgba(0,0,0,0.24)] sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
            {source.requestType === "message" ? (
              <MessageCircleHeart className="size-5" />
            ) : (
              <Clapperboard className="size-5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
              {labels.eyebrow}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-normal">
              {labels.title}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#b9ffc8]">
              {isOwnContent ? labels.ownerResult : labels.result}
            </p>
            <div className="mt-4 rounded-lg border border-[#44f26e]/18 bg-[#44f26e]/10 p-3">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[#8dffa5]">
                {labels.originalRequest}
              </p>
              <p className="mt-2 break-words text-sm font-semibold leading-6 text-white [overflow-wrap:anywhere]">
                {source.body}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#44f26e]/26 bg-black/22 px-3 py-1 text-xs font-semibold text-[#b9ffc8]">
                {typeLabel}
              </span>
              {source.requesterDisplayName ? (
                <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/58">
                  {labels.requestedBy} · {source.requesterDisplayName}
                </span>
              ) : null}
              {createdLabel ? (
                <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/58">
                  {createdLabel}
                </span>
              ) : null}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {labels.flow.map((item, index) => (
                <span
                  className="rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-semibold text-white/62"
                  key={item}
                >
                  <span className="mr-2 text-[#44f26e]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:w-56 lg:flex-col">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
            href={isOwnContent ? ownerManageHref ?? channelHref : requestHref}
          >
            <PenLine className="size-4" />
            {isOwnContent ? labels.ownerCta : labels.cta}
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 px-4 text-sm font-semibold !text-white transition hover:bg-white/8"
            href={channelHref}
          >
            {labels.channelCta}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FanletterDetailRequestCta({
  characterName,
  fanRequestHref,
  isOwnContent = false,
  locale,
  ownerManageHref,
}: {
  characterName: string;
  fanRequestHref: string;
  isOwnContent?: boolean;
  locale: Locale;
  ownerManageHref?: string;
}) {
  const labels =
    locale === "ko"
      ? {
          body: `${characterName}에게 보고 싶은 룩, 장소, 질문을 남기면 크리에이터가 스튜디오 요청함에서 바로 다음 브이로그 소재로 확인할 수 있습니다.`,
          cta: "다음 장면 요청",
          eyebrow: "팬 요청",
          ownerBody:
            "이 브이로그는 현재 로그인한 계정의 콘텐츠입니다. 팬 요청을 남기는 대신 스튜디오에서 공개 상태, 팬 반응, 다음 제작 후보를 관리하세요.",
          ownerCta: "스튜디오에서 관리",
          ownerSteps: ["공개 상태 확인", "팬 반응 확인", "다음 소재 관리"],
          ownerTitle: "내 브이로그 관리로 이어가기",
          steps: ["장면 남기기", "제작 후보 검토", "채널에서 공개 확인"],
          title: "이 브이로그 다음 장면을 요청하세요",
        }
      : {
          body: `Leave the outfit, place, or question you want ${characterName} to answer. The creator can review it from the studio inbox as a next-vlog idea.`,
          cta: "Request next scene",
          eyebrow: "Fan Request",
          ownerBody:
            "This vlog belongs to the currently signed-in account. Manage visibility, fan reactions, and next production candidates in Studio instead of leaving a fan request.",
          ownerCta: "Manage in studio",
          ownerSteps: ["Check visibility", "Review reactions", "Plan next idea"],
          ownerTitle: "Continue into my vlog management",
          steps: ["Leave a scene", "Reviewed for production", "Watch it on channel"],
          title: "Request the next scene after this vlog",
        };
  const displayBody = isOwnContent ? labels.ownerBody : labels.body;
  const displayCta = isOwnContent ? labels.ownerCta : labels.cta;
  const displayHref = isOwnContent ? ownerManageHref ?? fanRequestHref : fanRequestHref;
  const displaySteps = isOwnContent ? labels.ownerSteps : labels.steps;
  const displayTitle = isOwnContent ? labels.ownerTitle : labels.title;

  return (
    <section className="mt-6 rounded-lg border border-[#44f26e]/26 bg-[linear-gradient(135deg,rgba(68,242,110,0.16),rgba(255,255,255,0.045)_48%,rgba(3,5,4,0.86))] p-4 text-white sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
            <PenLine className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
              {labels.eyebrow}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-normal [word-break:keep-all]">
              {displayTitle}
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-white/62 [word-break:keep-all]">
              {displayBody}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {displaySteps.map((step, index) => (
                <span
                  className="rounded-full border border-[#44f26e]/22 bg-[#44f26e]/10 px-3 py-1 text-xs font-semibold text-[#b9ffc8]"
                  key={step}
                >
                  {String(index + 1).padStart(2, "0")} · {step}
                </span>
              ))}
            </div>
          </div>
        </div>
        <Link
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
          href={displayHref}
        >
          {displayCta}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

function FanletterContentNextActions({
  channelHref,
  createHref,
  feedHref,
  isOwnContent = false,
  locale,
  manageHref,
  startHref,
}: {
  channelHref: string;
  createHref?: string;
  feedHref: string;
  isOwnContent?: boolean;
  locale: Locale;
  manageHref?: string;
  startHref: string;
}) {
  const labels =
    locale === "ko"
      ? {
          channelBody:
            "이 캐릭터의 공개 브이로그와 팬 전용 유료 브이로그를 같은 채널에서 이어봅니다.",
          channelTitle: "캐릭터 채널",
          feedBody: "다른 AI 캐릭터 브이로그를 최신순으로 둘러봅니다.",
          feedTitle: "전체 피드",
          manageBody: "내 브이로그의 공개 상태, 판매, 팬 반응을 관리합니다.",
          manageTitle: "브이로그 관리",
          open: "열기",
          ownerCreateBody: "같은 캐릭터로 다음 숏폼 브이로그를 바로 만듭니다.",
          ownerCreateTitle: "다음 브이로그 만들기",
          ownerTitle: "작성자 다음 행동",
          title: "더 둘러보기",
        }
      : {
          channelBody:
            "Continue into this character's public vlogs and fan-only paid vlogs inside one channel.",
          channelTitle: "Character channel",
          feedBody: "Browse the latest public vlogs from other AI characters.",
          feedTitle: "Full feed",
          manageBody: "Manage this vlog's visibility, sales, and fan reactions.",
          manageTitle: "Manage vlog",
          open: "Open",
          ownerCreateBody: "Create the next short-form vlog with the same character.",
          ownerCreateTitle: "Create next vlog",
          ownerTitle: "Author next actions",
          title: "Explore more",
        };
  const actions = isOwnContent
    ? [
        {
          body: labels.manageBody,
          href: manageHref ?? startHref,
          icon: Clapperboard,
          title: labels.manageTitle,
        },
        {
          body: labels.ownerCreateBody,
          href: createHref ?? startHref,
          icon: Rocket,
          title: labels.ownerCreateTitle,
        },
        {
          body: labels.channelBody,
          href: channelHref,
          icon: User,
          title: labels.channelTitle,
        },
        {
          body: labels.feedBody,
          href: feedHref,
          icon: Grid2X2,
          title: labels.feedTitle,
        },
      ]
    : [
        {
          body: labels.channelBody,
          href: channelHref,
          icon: User,
          title: labels.channelTitle,
        },
        {
          body: labels.feedBody,
          href: feedHref,
          icon: Grid2X2,
          title: labels.feedTitle,
        },
      ];
  const title = isOwnContent ? labels.ownerTitle : labels.title;

  return (
    <section className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <h2 className="text-xl font-semibold tracking-normal text-white">
        {title}
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              className="group rounded-lg border border-white/10 bg-[#07100b] p-4 transition hover:border-[#44f26e]/46 hover:bg-[#0b1510]"
              href={action.href}
              key={action.title}
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <Icon className="size-5" />
              </span>
              <p className="mt-4 text-base font-semibold text-white">
                {action.title}
              </p>
              <p className="mt-2 text-sm font-medium leading-6 text-white/54">
                {action.body}
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#44f26e]">
                {labels.open}
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FanletterDetailWatchPanel({
  channelHref,
  characterAvatarUrl,
  characterName,
  content,
  locale,
}: {
  channelHref: string;
  characterAvatarUrl: string | null;
  characterName: string;
  content: FanletterPublicContentDetail;
  locale: Locale;
}) {
  const labels =
    locale === "ko"
      ? {
          body: "영상, 캐릭터 채널, 팬 요청을 같은 FanLetter 흐름에서 이어봅니다.",
          detail: "FanLetter 전용 보기",
          publicVlogs: "공개 브이로그",
          title: "지금 보는 캐릭터",
        }
      : {
          body: "Keep the video, character channel, and fan requests inside one FanLetter flow.",
          detail: "FanLetter view",
          publicVlogs: "public vlogs",
          title: "Now watching",
        };

  return (
    <div className="border-t border-white/8 p-3 sm:p-4">
      <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
        <div className="flex items-start gap-3">
          <Avatar
            imageUrl={characterAvatarUrl}
            name={characterName}
            sizeClassName="size-11"
          />
          <div className="min-w-0">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#44f26e]">
              {labels.title}
            </p>
            <Link
              className="mt-1 inline-flex min-w-0 items-center gap-2 text-base font-semibold leading-tight text-white"
              href={channelHref}
            >
              <span className="truncate">{characterName}</span>
              <ArrowRight className="size-4 shrink-0 text-[#44f26e]" />
            </Link>
            <p className="mt-2 text-xs font-medium leading-5 text-white/54">
              {labels.body}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <span className="rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 px-3 py-2 text-xs font-semibold text-[#b9ffc8]">
            {labels.detail}
          </span>
          <span className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/58">
            {formatNumber(content.authorPublicContentCount, locale)}{" "}
            {labels.publicVlogs}
          </span>
        </div>
      </div>
    </div>
  );
}

function FanletterDetailQuickActions({
  characterName,
  createHref,
  creatorActionHref,
  creatorActionLabel,
  detailActionHref,
  detailActionLabel,
  fanRequestHref,
  isOwnContent = false,
  locale,
  startHref,
}: {
  characterName: string;
  createHref?: string;
  creatorActionHref: string;
  creatorActionLabel: string;
  detailActionHref: string;
  detailActionLabel: string;
  fanRequestHref: string;
  isOwnContent?: boolean;
  locale: Locale;
  startHref: string;
}) {
  const labels =
    locale === "ko"
      ? {
          body: "시청 후 바로 캐릭터 채널이나 다음 장면 요청으로 이어가도록 정리했습니다.",
          creatorBody: `${characterName}의 공개 브이로그와 캐릭터 소개를 계속 봅니다.`,
          open: "이동",
          requestBody: "보고 싶은 룩, 장소, 상황을 다음 브이로그 요청으로 남깁니다.",
          requestTitle: "다음 장면 요청",
          ownerBody:
            "작성자 화면에서는 팬 행동 대신 공개 상태, 판매, 반응 데이터를 바로 관리할 수 있게 연결합니다.",
          ownerManageBody:
            "이 브이로그의 공개/유료 상태와 상세 이동 흐름을 스튜디오에서 확인합니다.",
          ownerManageTitle: "브이로그 관리",
          ownerCreateBody:
            "현재 캐릭터 설정을 유지한 채 다음 숏폼 브이로그 제작으로 이동합니다.",
          ownerCreateTitle: "다음 브이로그 만들기",
          ownerTitle: "내 브이로그에서 이어가기",
          eyebrow: "시청 흐름",
          title: "이 브이로그에서 이어가기",
        }
      : {
          body: "After watching, continue into the character channel or a next-scene request.",
          creatorBody: `Keep watching ${characterName}'s public vlogs and character intro.`,
          open: "Open",
          requestBody: "Leave the outfit, place, or scene you want to see as a next-vlog request.",
          requestTitle: "Request next scene",
          ownerBody:
            "Author view replaces fan actions with direct access to visibility, sales, and reaction management.",
          ownerManageBody:
            "Review this vlog's public or paid status and detail flow in Studio.",
          ownerManageTitle: "Manage vlog",
          ownerCreateBody:
            "Keep the current character setup and move into the next short-form vlog.",
          ownerCreateTitle: "Create next vlog",
          ownerTitle: "Continue from my vlog",
          eyebrow: "FanLetter Flow",
          title: "Continue from this vlog",
        };
  const actions = isOwnContent
    ? [
        {
          body: labels.creatorBody,
          href: creatorActionHref,
          icon: User,
          title: creatorActionLabel,
        },
        {
          body: labels.ownerManageBody,
          href: detailActionHref,
          icon: Clapperboard,
          title: labels.ownerManageTitle,
        },
        {
          body: labels.ownerCreateBody,
          href: createHref ?? startHref,
          icon: Rocket,
          title: labels.ownerCreateTitle,
        },
      ]
    : [
        {
          body: labels.creatorBody,
          href: creatorActionHref,
          icon: User,
          title: creatorActionLabel,
        },
        {
          body: labels.requestBody,
          href: fanRequestHref,
          icon: Clapperboard,
          title: labels.requestTitle,
        },
      ];
  const headerBody = isOwnContent ? labels.ownerBody : labels.body;
  const headerTitle = isOwnContent ? labels.ownerTitle : labels.title;
  const headerActionHref = isOwnContent ? detailActionHref : fanRequestHref;
  const headerActionLabel = isOwnContent ? detailActionLabel : labels.requestTitle;

  return (
    <section className="mt-6 rounded-lg border border-[#44f26e]/22 bg-[#07100b] p-4 text-white shadow-[0_20px_58px_rgba(0,0,0,0.24)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
            {labels.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal [word-break:keep-all]">
            {headerTitle}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-white/58">
            {headerBody}
          </p>
        </div>
        <Link
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
          href={headerActionHref}
        >
          {headerActionLabel}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div
        className={
          isOwnContent
            ? "mt-5 grid gap-3 md:grid-cols-3"
            : "mt-5 grid gap-3 md:grid-cols-2"
        }
      >
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              className="group rounded-lg border border-white/10 bg-white/[0.055] p-4 transition hover:border-[#44f26e]/46 hover:bg-white/[0.075]"
              href={action.href}
              key={action.title}
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 break-words text-lg font-semibold leading-tight tracking-normal [overflow-wrap:anywhere]">
                {action.title}
              </h3>
              <p className="mt-3 text-sm font-medium leading-6 text-white/54">
                {action.body}
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#44f26e]">
                {labels.open}
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FanletterOwnerContentPanel({
  channelHref,
  className = "",
  createHref,
  locale,
  manageHref,
}: {
  channelHref: string;
  className?: string;
  createHref: string;
  locale: Locale;
  manageHref: string;
}) {
  const labels =
    locale === "ko"
      ? {
          body:
            "현재 로그인한 계정의 브이로그입니다. 팬 요청을 직접 남기는 화면 대신, 공개 상태와 팬 반응을 확인하고 다음 브이로그 제작으로 이어가세요.",
          channel: "내 캐릭터 채널",
          create: "다음 브이로그 만들기",
          eyebrow: "Creator view",
          manage: "브이로그 관리",
          signals: ["소유자 전체 열람", "팬 요청은 스튜디오에서 관리", "좋아요/저장은 팬 반응만 집계"],
          title: "작성자 관리 모드",
        }
      : {
          body:
            "This vlog belongs to the signed-in account. Instead of leaving fan requests here, review visibility and fan reactions, then continue into the next vlog.",
          channel: "My character channel",
          create: "Create next vlog",
          eyebrow: "Creator view",
          manage: "Manage vlog",
          signals: [
            "Owner full access",
            "Fan requests live in Studio",
            "Likes and saves count fan reactions only",
          ],
          title: "Author management mode",
        };

  return (
    <section
      className={`rounded-lg border border-[#44f26e]/24 bg-[#07100b] p-4 text-white shadow-[0_20px_58px_rgba(0,0,0,0.22)] sm:p-5 ${className}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
            <BadgeCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
              {labels.eyebrow}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-normal [word-break:keep-all]">
              {labels.title}
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-white/62 [word-break:keep-all]">
              {labels.body}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {labels.signals.map((signal) => (
                <span
                  className="rounded-full border border-[#44f26e]/22 bg-[#44f26e]/10 px-3 py-1 text-xs font-semibold text-[#b9ffc8]"
                  key={signal}
                >
                  {signal}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:w-72 lg:grid-cols-1">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
            href={manageHref}
          >
            {labels.manage}
            <ArrowRight className="size-4" />
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 px-4 text-sm font-semibold !text-white transition hover:bg-white/8"
            href={createHref}
          >
            {labels.create}
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 px-4 text-sm font-semibold !text-white transition hover:bg-white/8"
            href={channelHref}
          >
            {labels.channel}
          </Link>
        </div>
      </div>
    </section>
  );
}

function FanletterFeedDiscoveryControls({
  filters,
  locale,
  referralCode,
}: {
  filters: FanletterFeedFilters;
  locale: Locale;
  referralCode: string | null;
}) {
  const labels =
    locale === "ko"
      ? {
          clear: "필터 초기화",
          filter: "검색 및 필터",
          helper:
            "제목, 요약, 캐릭터명으로 찾고 반응 데이터 기준으로 피드를 다시 정렬합니다.",
          page: "페이지",
          placeholder: "캐릭터명, 제목, 장면 검색",
          result: "검색 결과",
          search: "검색",
          sortOptions: {
            comments: "댓글 많은 순",
            latest: "최신순",
            popular: "인기순",
            saves: "저장 많은 순",
          } satisfies Record<FanletterFeedSort, string>,
          title: "브이로그 찾기",
        }
      : {
          clear: "Reset filters",
          filter: "Search and filters",
          helper:
            "Find vlogs by title, summary, or character name, then reorder the feed by fan signals.",
          page: "Page",
          placeholder: "Search character, title, or scene",
          result: "Results",
          search: "Search",
          sortOptions: {
            comments: "Most comments",
            latest: "Latest",
            popular: "Popular",
            saves: "Most saved",
          } satisfies Record<FanletterFeedSort, string>,
          title: "Find vlogs",
        };
  const sortOptions: FanletterFeedSort[] = [
    "latest",
    "popular",
    "comments",
    "saves",
  ];
  const resetHref = getFeedHref({
    locale,
    page: 1,
    query: "",
    referralCode,
    sort: "latest",
  });
  const hasActiveFilters =
    filters.query.length > 0 ||
    (Boolean(filters.sort) && filters.sort !== "latest") ||
    filters.page > 1;
  const renderSearchForm = (isCompact = false) => (
    <form
      action={`/${locale}/fanletter/feed`}
      className={`grid gap-3 ${
        isCompact
          ? ""
          : hasActiveFilters
            ? "lg:grid-cols-[minmax(0,1fr)_auto_auto]"
            : "lg:grid-cols-[minmax(0,1fr)_auto]"
      }`}
      method="get"
    >
      {referralCode ? <input name="ref" type="hidden" value={referralCode} /> : null}
      {filters.sort && filters.sort !== "latest" ? (
        <input name="sort" type="hidden" value={filters.sort} />
      ) : null}
      <label className="min-w-0">
        <span className="sr-only">{labels.search}</span>
        <input
          className="h-12 w-full rounded-lg border border-black/10 bg-[#f6f8f4] px-4 text-sm font-semibold text-black outline-none transition placeholder:text-black/34 focus:border-[#29d85f]/70 focus:bg-white"
          defaultValue={filters.query}
          maxLength={80}
          name="q"
          placeholder={labels.placeholder}
          type="search"
        />
      </label>
      <button
        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/82"
        type="submit"
      >
        <Search className="size-4" />
        {labels.search}
      </button>
      {hasActiveFilters ? (
        <Link
          className="inline-flex h-12 items-center justify-center rounded-lg border border-black/10 px-5 text-sm font-semibold text-black/62 transition hover:border-black/24 hover:text-black"
          href={resetHref}
        >
          {labels.clear}
        </Link>
      ) : null}
    </form>
  );
  const renderSortOptions = () => (
    <div className="mt-4 flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
      {sortOptions.map((option) => {
        const isActive = filters.sort === option;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex h-9 shrink-0 snap-start items-center rounded-full px-4 text-sm font-semibold transition ${
              isActive
                ? "bg-[#44f26e] text-black"
                : "border border-black/10 bg-[#f6f8f4] text-black/58 hover:border-[#29d85f]/60 hover:bg-[#effff3] hover:text-black"
            }`}
            href={getFeedHref({
              filters,
              locale,
              page: 1,
              referralCode,
              sort: option,
            })}
            key={option}
          >
            {labels.sortOptions[option]}
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      <details
        className="mb-8 rounded-lg border border-black/10 bg-white shadow-[0_16px_38px_rgba(8,18,12,0.08)] lg:hidden"
        open={hasActiveFilters}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
              <Search className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-black">
                {labels.filter}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-black/46">
                {labels.result} {formatNumber(filters.totalCount, locale)} ·{" "}
                {labels.sortOptions[filters.sort]}
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-[#f6f8f4] px-3 py-1.5 text-xs font-semibold text-black/58">
            <SlidersHorizontal className="size-3.5 text-[#1f7c38]" />
            {formatNumber(filters.page, locale)} /{" "}
            {formatNumber(filters.pageCount, locale)}
          </span>
        </summary>
        <div className="border-t border-black/10 p-4 pt-3">
          {renderSearchForm(true)}
          {renderSortOptions()}
        </div>
      </details>

      <section className="mb-8 hidden rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_44px_rgba(8,18,12,0.08)] sm:p-5 lg:block">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <Search className="size-5" />
              </span>
              <div>
                <p className="text-[0.68rem] font-semibold text-[#1f7c38]">
                  {labels.result} {formatNumber(filters.totalCount, locale)}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                  {labels.title}
                </h2>
              </div>
            </div>
            <p className="mt-3 hidden max-w-3xl text-sm font-medium leading-6 text-black/58 sm:block">
              {labels.helper}
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 justify-self-start rounded-lg border border-black/10 bg-[#f6f8f4] px-3 py-2 text-sm font-semibold text-black/58 lg:justify-self-end">
            <SlidersHorizontal className="size-4 text-[#1f7c38]" />
            {labels.page} {formatNumber(filters.page, locale)} /{" "}
            {formatNumber(filters.pageCount, locale)}
          </div>
        </div>

        <div className="mt-5">{renderSearchForm()}</div>
        {renderSortOptions()}
      </section>
    </>
  );
}

function FanletterFeedMobileGuide({
  allContentSectionLabel,
  feedHref,
  featuredItem,
  filters,
  latestCount,
  locale,
  rankedCreatorCount,
  referralCode,
  remainingCount,
  videoCount,
}: {
  allContentSectionLabel: string;
  feedHref: string;
  featuredItem: FanletterPublicContentItem | null;
  filters: FanletterFeedFilters;
  latestCount: number;
  locale: Locale;
  rankedCreatorCount: number;
  referralCode: string | null;
  remainingCount: number;
  videoCount: number;
}) {
  const labels =
    locale === "ko"
      ? {
          all: "더 보기",
          allBody: `${formatNumber(remainingCount, locale)}개 공개 브이로그`,
          body:
            "모바일에서는 먼저 보고 싶은 흐름을 고른 뒤 필요한 섹션으로 바로 이동하세요.",
          characters: "캐릭터 랭킹",
          charactersBody: `${formatNumber(rankedCreatorCount, locale)}개 캐릭터`,
          eyebrow: "모바일 탐색",
          latest: "최신 브이로그",
          latestBody: `${formatNumber(latestCount, locale)}개 새 장면`,
          next: "다음 페이지",
          open: "이동",
          page: "페이지",
          popular: "인기 브이로그",
          previous: "이전",
          title: "빠르게 둘러보기",
          videos: "영상만 보기",
          videosBody: `${formatNumber(videoCount, locale)}개 영상`,
        }
      : {
          all: "More",
          allBody: `${formatNumber(remainingCount, locale)} public vlogs`,
          body:
            "On mobile, choose the flow you want first and jump straight to that section.",
          characters: "Character ranking",
          charactersBody: `${formatNumber(rankedCreatorCount, locale)} characters`,
          eyebrow: "Mobile Guide",
          latest: "Latest vlogs",
          latestBody: `${formatNumber(latestCount, locale)} new scenes`,
          next: "Next page",
          open: "Open",
          page: "Page",
          popular: "Popular vlog",
          previous: "Previous",
          title: "Quick browse",
          videos: "Videos only",
          videosBody: `${formatNumber(videoCount, locale)} videos`,
        };
  const guideItems = [
    featuredItem
      ? {
          body: featuredItem.title,
          href: `${feedHref}#popular-vlog`,
          Icon: Trophy,
          title: labels.popular,
        }
      : null,
    rankedCreatorCount > 0
      ? {
          body: labels.charactersBody,
          href: `${feedHref}#popular-characters`,
          Icon: Crown,
          title: labels.characters,
        }
      : null,
    videoCount > 0
      ? {
          body: labels.videosBody,
          href: `${feedHref}#video-vlogs`,
          Icon: Video,
          title: labels.videos,
        }
      : null,
    latestCount > 0
      ? {
          body: labels.latestBody,
          href: `${feedHref}#latest-vlogs`,
          Icon: Sparkles,
          title: labels.latest,
        }
      : null,
    remainingCount > 0
      ? {
          body: labels.allBody,
          href: `${feedHref}#all-vlogs`,
          Icon: Grid2X2,
          title: allContentSectionLabel || labels.all,
        }
      : null,
  ].filter(
    (
      item,
    ): item is {
      body: string;
      href: string;
      Icon: LucideIcon;
      title: string;
    } => Boolean(item),
  );
  const previousHref = getFeedHref({
    filters,
    locale,
    page: Math.max(1, filters.page - 1),
    referralCode,
  });
  const nextHref = getFeedHref({
    filters,
    locale,
    page: Math.min(filters.pageCount, filters.page + 1),
    referralCode,
  });
  const canGoPrevious = filters.page > 1;
  const canGoNext = filters.page < filters.pageCount;

  if (guideItems.length === 0 && filters.pageCount <= 1) {
    return null;
  }

  return (
    <section className="mb-8 rounded-lg border border-black/10 bg-[#07100b] p-4 text-white shadow-[0_18px_44px_rgba(8,18,12,0.16)] lg:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
            {labels.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">
            {labels.title}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-white/58">
            {labels.body}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[#44f26e]/22 bg-[#44f26e]/10 px-3 py-1.5 text-xs font-semibold text-[#b9ffc8]">
          {labels.page} {formatNumber(filters.page, locale)} /{" "}
          {formatNumber(filters.pageCount, locale)}
        </span>
      </div>

      {guideItems.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {guideItems.map(({ Icon, body, href, title }) => (
            <Link
              className="group min-w-0 rounded-lg border border-white/10 bg-white/[0.055] p-3 transition hover:border-[#44f26e]/42 hover:bg-white/[0.075]"
              href={href}
              key={`${href}-${title}`}
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <Icon className="size-4" />
              </span>
              <h3 className="mt-3 truncate text-sm font-semibold">{title}</h3>
              <p className="mt-1 line-clamp-2 min-h-8 break-words text-xs font-medium leading-4 text-white/54 [overflow-wrap:anywhere]">
                {body}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#b9ffc8]">
                {labels.open}
                <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {filters.pageCount > 1 ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {canGoPrevious ? (
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/14 px-4 text-sm font-semibold !text-white transition hover:bg-white/8"
              href={previousHref}
            >
              {labels.previous}
            </Link>
          ) : (
            <span className="inline-flex h-11 items-center justify-center rounded-full border border-white/8 px-4 text-sm font-semibold text-white/28">
              {labels.previous}
            </span>
          )}
          {canGoNext ? (
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
              href={nextHref}
            >
              {labels.next}
            </Link>
          ) : (
            <span className="inline-flex h-11 items-center justify-center rounded-full border border-white/8 px-4 text-sm font-semibold text-white/28">
              {labels.next}
            </span>
          )}
        </div>
      ) : null}
    </section>
  );
}

function FanletterFeedPagination({
  filters,
  locale,
  referralCode,
}: {
  filters: FanletterFeedFilters;
  locale: Locale;
  referralCode: string | null;
}) {
  if (filters.pageCount <= 1) {
    return null;
  }

  const labels =
    locale === "ko"
      ? {
          next: "다음",
          page: "페이지",
          previous: "이전",
        }
      : {
          next: "Next",
          page: "Page",
          previous: "Previous",
        };
  const previousHref = getFeedHref({
    filters,
    locale,
    page: Math.max(1, filters.page - 1),
    referralCode,
  });
  const nextHref = getFeedHref({
    filters,
    locale,
    page: Math.min(filters.pageCount, filters.page + 1),
    referralCode,
  });

  return (
    <nav
      aria-label={labels.page}
      className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm font-semibold text-black/50">
        {labels.page} {formatNumber(filters.page, locale)} /{" "}
        {formatNumber(filters.pageCount, locale)}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Link
          aria-disabled={filters.page <= 1}
          className={`inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold transition ${
            filters.page <= 1
              ? "pointer-events-none border-black/8 !text-black/28"
              : "border-black/10 !text-black/62 hover:border-black/24 hover:!text-black"
          }`}
          href={previousHref}
        >
          {labels.previous}
        </Link>
        <Link
          aria-disabled={filters.page >= filters.pageCount}
          className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
            filters.page >= filters.pageCount
              ? "pointer-events-none border border-black/8 !text-black/28"
              : "bg-black !text-white hover:bg-black/82"
          }`}
          href={nextHref}
        >
          {labels.next}
        </Link>
      </div>
    </nav>
  );
}

export function FanletterFeedPage({
  filters,
  items,
  locale,
  referralCode,
}: {
  filters: FanletterFeedFilters;
  items: FanletterPublicContentItem[];
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const rankedItems = [...items].sort((a, b) => {
    const scoreDelta = getContentEngagementScore(b) - getContentEngagementScore(a);

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return (
      new Date(b.publishedAt ?? 0).getTime() -
      new Date(a.publishedAt ?? 0).getTime()
    );
  });
  const featuredItem = rankedItems[0] ?? items[0] ?? null;
  const featuredContentId = featuredItem?.contentId ?? null;
  const videoCount = items.filter((item) => item.mediaType === "video").length;
  const latestSortedItems = [...items].sort(
    (a, b) =>
      new Date(b.publishedAt ?? 0).getTime() -
      new Date(a.publishedAt ?? 0).getTime(),
  );
  const absoluteLatestItem = latestSortedItems[0] ?? null;
  const commentItem =
    items.filter((item) => item.social.commentCount > 0).sort((a, b) => {
      const commentDelta = b.social.commentCount - a.social.commentCount;

      if (commentDelta !== 0) {
        return commentDelta;
      }

      return getPublishedTime(b.publishedAt) - getPublishedTime(a.publishedAt);
    })[0] ?? null;
  const savedItem =
    items.filter((item) => item.social.saveCount > 0).sort((a, b) => {
      const saveDelta = b.social.saveCount - a.social.saveCount;

      if (saveDelta !== 0) {
        return saveDelta;
      }

      return getPublishedTime(b.publishedAt) - getPublishedTime(a.publishedAt);
    })[0] ?? null;
  const videoItems = items
    .filter(
      (item) =>
        item.mediaType === "video" && item.contentId !== featuredContentId,
    )
    .slice(0, 6);
  const curatedContentIds = new Set([
    ...(featuredContentId ? [featuredContentId] : []),
    ...videoItems.map((item) => item.contentId),
  ]);
  const latestItems = latestSortedItems
    .filter((item) => !curatedContentIds.has(item.contentId))
    .slice(0, 4);
  const highlightedContentIds = new Set([
    ...curatedContentIds,
    ...latestItems.map((item) => item.contentId),
  ]);
  const remainingItems = items.filter(
    (item) => !highlightedContentIds.has(item.contentId),
  );
  const creatorItems = Array.from(
    new Map(
      items.map((item) => [
        item.authorReferralCode ?? item.authorName,
        item,
      ]),
    ).values(),
  ).slice(0, 6);
  const rankedCreatorCount = getRankedCreators(items).length;
  const hasSearchQuery = filters.query.length > 0;
  const feedStatLabels =
    locale === "ko"
      ? {
          pageCreators: "이 페이지 캐릭터",
          pageVideos: "이 페이지 영상",
          total: "전체 공개",
        }
      : {
          pageCreators: "Page creators",
          pageVideos: "Page videos",
          total: "All public",
        };
  const feedStats = [
    {
      label: feedStatLabels.total,
      value: formatNumber(filters.totalCount, locale),
    },
    {
      label: feedStatLabels.pageVideos,
      value: formatNumber(videoCount, locale),
    },
    {
      label: feedStatLabels.pageCreators,
      value: formatNumber(creatorItems.length, locale),
    },
  ];
  const discoveryCopy =
    locale === "ko"
      ? {
          body: "처음 둘러볼 캐릭터를 최신 브이로그와 반응 신호 기준으로 추천합니다.",
          eyebrow: "Character Discovery",
          title: copy.feed.suggestedCreators,
        }
      : {
          body:
            "Start with characters suggested by their latest vlogs and reaction signals.",
          eyebrow: "Character Discovery",
          title: copy.feed.suggestedCreators,
        };
  const feedHref = getFeedHref({ filters, locale, referralCode });
  const resetFeedHref = getFeedHref({
    locale,
    page: 1,
    query: "",
    referralCode,
    sort: "latest",
  });
  const followingHref = buildPathWithReferral(
    `/${locale}/fanletter/following`,
    referralCode,
  );
  const startHref = buildPathWithReferral(
    `/${locale}/fanletter/start`,
    referralCode,
  );
  const emptyFeedMessage = hasSearchQuery
    ? locale === "ko"
      ? `"${filters.query}"에 맞는 브이로그가 없습니다. 검색어를 지우거나 다른 캐릭터명, 제목, 장면으로 다시 찾아보세요.`
      : `No vlogs match "${filters.query}". Clear the search or try another character, title, or scene.`
    : copy.feed.empty;
  const emptyFeedActionHref = hasSearchQuery ? resetFeedHref : startHref;
  const emptyFeedActionLabel = hasSearchQuery
    ? locale === "ko"
      ? "전체 브이로그 보기"
      : "View all vlogs"
    : copy.actions.start;
  const allContentSectionLabel =
    remainingItems.length > 0 && highlightedContentIds.size > 0
      ? locale === "ko"
        ? "더 많은 공개 브이로그"
        : "More public vlogs"
      : copy.feed.allContent;
  const showAllContentSection = items.length === 0 || remainingItems.length > 0;
  const sectionTabCandidates: Array<FanletterChannelSectionTabItem | null> = [
    {
      href: followingHref,
      id: "following",
      label: copy.actions.following,
      sectionId: null,
    },
    featuredItem
      ? {
          href: `${feedHref}#popular-vlog`,
          id: "popular-vlog",
          label: copy.feed.trending,
          mobileLabel: locale === "ko" ? "인기" : "Popular",
        }
      : null,
    rankedCreatorCount > 0
      ? {
          href: `${feedHref}#popular-characters`,
          id: "popular-characters",
          label: locale === "ko" ? "캐릭터 랭킹" : "Character ranking",
          mobileLabel: locale === "ko" ? "랭킹" : "Ranking",
        }
      : null,
    videoItems.length > 0
      ? {
          href: `${feedHref}#video-vlogs`,
          id: "video-vlogs",
          label: copy.feed.videos,
          mobileLabel: locale === "ko" ? "영상" : "Videos",
        }
      : null,
    latestItems.length > 0
      ? {
          href: `${feedHref}#latest-vlogs`,
          id: "latest-vlogs",
          label: copy.feed.latest,
          mobileLabel: locale === "ko" ? "최신" : "Latest",
        }
      : null,
    showAllContentSection
      ? {
          href: `${feedHref}#all-vlogs`,
          id: "all-vlogs",
          label: allContentSectionLabel,
          mobileLabel: locale === "ko" ? "더 보기" : "More",
        }
      : null,
  ];
  const sectionTabs = sectionTabCandidates.filter(
    (tab): tab is FanletterChannelSectionTabItem => tab !== null,
  );

  return (
    <FanletterShell
      currentSection="feed"
      description={copy.feed.title}
      eyebrow={copy.feed.eyebrow}
      locale={locale}
      referralCode={referralCode}
      title={locale === "ko" ? "FanLetter AI 캐릭터 브이로그 피드" : "FanLetter AI Character Vlog Feed"}
      titleClassName="mt-4 max-w-5xl text-[2.35rem] font-semibold leading-[1.04] tracking-normal text-white [word-break:keep-all] sm:text-[4.2rem]"
    >
      <section className="overflow-hidden bg-[#f6f8f4] px-4 py-10 text-black sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-[92rem]">
          <FanletterChannelSectionTabs
            ariaLabel={locale === "ko" ? "피드 섹션" : "Feed sections"}
            items={sectionTabs}
          />

          <FanletterFeedStoryRail
            items={rankedItems}
            locale={locale}
            referralCode={referralCode}
          />

          <FanletterFeedCuriosityBoard
            commentItem={commentItem}
            fallbackItems={rankedItems}
            featuredItem={featuredItem}
            latestItem={absoluteLatestItem}
            locale={locale}
            referralCode={referralCode}
            savedItem={savedItem}
          />

          <FanletterFeedDiscoveryControls
            filters={filters}
            locale={locale}
            referralCode={referralCode}
          />

          <FanletterFeedMobileGuide
            allContentSectionLabel={allContentSectionLabel}
            featuredItem={featuredItem}
            feedHref={feedHref}
            filters={filters}
            latestCount={latestItems.length}
            locale={locale}
            rankedCreatorCount={rankedCreatorCount}
            referralCode={referralCode}
            remainingCount={remainingItems.length}
            videoCount={videoItems.length}
          />

          {featuredItem ? (
            <div
              className="mb-10 grid min-w-0 max-w-full scroll-mt-36 gap-5 sm:scroll-mt-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:items-stretch"
              id="popular-vlog"
            >
              <FeaturedFeedCard
                item={featuredItem}
                locale={locale}
                referralCode={referralCode}
              />

              <div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-4">
                <div className="min-w-0 overflow-hidden rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_44px_rgba(8,18,12,0.08)] sm:p-5">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#1f7c38]">
                    {locale === "ko" ? "캐릭터 브이로그" : "Character Vlog"}
                  </p>
                  <h2 className="mt-3 min-w-0 max-w-full break-words text-[1.85rem] font-semibold leading-[1.08] tracking-normal [overflow-wrap:anywhere] sm:text-3xl sm:[word-break:keep-all]">
                    {copy.feed.title}
                  </h2>
                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {feedStats.map((stat) => (
                      <div
                        className="min-w-0 rounded-lg border border-black/10 bg-[#f6f8f4] p-3"
                        key={stat.label}
                      >
                        <p className="text-2xl font-semibold leading-none">
                          {stat.value}
                        </p>
                        <p className="mt-2 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-black/46">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {creatorItems.length > 0 ? (
                  <section className="min-w-0">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-[#1f7c38]">
                          {discoveryCopy.eyebrow}
                        </p>
                        <h2 className="mt-1 text-xl font-semibold">
                          {discoveryCopy.title}
                        </h2>
                      </div>
                      <p className="max-w-sm text-xs font-medium leading-5 text-black/50">
                        {discoveryCopy.body}
                      </p>
                    </div>
                    <div className="flex max-w-full snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] lg:grid lg:grid-cols-2 lg:overflow-visible">
                      {creatorItems.map((item) => (
                        <CreatorDiscoveryCard
                          item={item}
                          key={item.authorReferralCode ?? item.authorName}
                          locale={locale}
                          referralCode={referralCode}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          ) : null}

          <FanletterCreatorRanking
            items={items}
            locale={locale}
            referralCode={referralCode}
          />

          {videoItems.length > 0 ? (
            <section className="mb-10 scroll-mt-36 sm:scroll-mt-24" id="video-vlogs">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold tracking-normal">
                  {copy.feed.videos}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {videoItems.map((item) => (
                  <ContentCard
                    item={item}
                    key={item.contentId}
                    locale={locale}
                    referralCode={referralCode}
                    showVideoPreview
                  />
                ))}
              </div>
            </section>
          ) : null}

          {latestItems.length > 0 ? (
            <section className="mb-10 scroll-mt-36 sm:scroll-mt-24" id="latest-vlogs">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold tracking-normal">
                  {copy.feed.latest}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {latestItems.map((item) => (
                  <ContentCard
                    item={item}
                    key={item.contentId}
                    locale={locale}
                    referralCode={referralCode}
                    showVideoPreview
                  />
                ))}
              </div>
            </section>
          ) : null}

          {showAllContentSection ? (
            <>
              <div
                className="mb-4 flex scroll-mt-36 items-center justify-between gap-3 sm:scroll-mt-24"
                id="all-vlogs"
              >
                <h2 className="text-2xl font-semibold tracking-normal">
                  {allContentSectionLabel}
                </h2>
              </div>
              <ContentGrid
                empty={emptyFeedMessage}
                emptyActionHref={emptyFeedActionHref}
                emptyActionLabel={emptyFeedActionLabel}
                items={remainingItems}
                locale={locale}
                referralCode={referralCode}
                showVideoPreview
              />
            </>
          ) : null}
          <FanletterFeedPagination
            filters={filters}
            locale={locale}
            referralCode={referralCode}
          />
        </div>
      </section>
    </FanletterShell>
  );
}

function CharacterPersonaShowcase({
  character,
  displayName,
  locale,
  publicContentCount,
}: {
  character: FanletterPublicCharacter;
  displayName: string;
  locale: Locale;
  publicContentCount: number;
}) {
  const copy = getCopy(locale);
  const realismCopy = getFanletterRealismDisclosureCopy(locale);
  const growth = character.growth;
  const stageLevel = growth.level;
  const growthLabels =
    locale === "ko"
      ? {
          fanRequests: "팬 요청",
          next: "다음 성장",
          progress: "성장 진행",
          reactions: "팬 반응",
          skills: "대표 스킬",
          xp: "XP",
        }
      : {
          fanRequests: "Fan requests",
          next: "Next growth",
          progress: "Growth progress",
          reactions: "Fan reactions",
          skills: "Signature skills",
          xp: "XP",
        };
  const evolutionItems = [
    {
      label: copy.creator.characterPublicSignal,
      value: formatNumber(publicContentCount, locale),
    },
    {
      label: copy.creator.characterVideoSignal,
      value: formatNumber(character.videoContentCount, locale),
    },
    {
      label: copy.creator.characterImageSignal,
      value: formatNumber(character.avatarImageSet.length, locale),
    },
    {
      label: copy.creator.characterLatest,
      value: character.latestTitle
        ? getDisplayContentTitleText(character.latestTitle, character.latestTitle, locale)
        : "FanLetter",
    },
  ];
  const growthMetrics = [
    {
      label: growthLabels.xp,
      value: formatNumber(growth.totalXp, locale),
    },
    {
      label: growthLabels.reactions,
      value: formatNumber(growth.metrics.reactionCount, locale),
    },
    {
      label: growthLabels.fanRequests,
      value: formatNumber(growth.metrics.fanRequestCount, locale),
    },
  ];

  return (
    <section
      className="mb-8 grid scroll-mt-36 gap-4 sm:scroll-mt-24 lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.55fr)]"
      id="about"
    >
      <article className="rounded-lg bg-[#07100b] p-5 text-white shadow-[0_24px_70px_rgba(8,18,12,0.18)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
              {copy.creator.characterEyebrow}
            </p>
            <h2 className="mt-3 text-[2rem] font-semibold leading-[1.02] tracking-normal [word-break:keep-all] sm:text-[2.65rem]">
              {character.name}
            </h2>
            <p className="mt-4 text-sm font-medium leading-6 text-white/68 sm:text-base sm:leading-7">
              {character.summary || copy.creator.characterBody}
            </p>
            <div
              className="mt-4 flex w-fit max-w-full items-center gap-2 rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 px-3 py-2 text-xs font-semibold leading-5 text-[#b9ffc8]"
              title={realismCopy.description}
            >
              <BadgeCheck className="size-4 shrink-0" />
              <span className="min-w-0 break-words">{realismCopy.label}</span>
            </div>
            <div className="mt-5 rounded-lg border border-[#44f26e]/22 bg-[#44f26e]/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#9bffad]">
                    {growthLabels.progress}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-normal">
                    {growth.title}
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/62">
                    {growth.summary}
                  </p>
                </div>
                <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1.5 text-xs font-semibold text-black">
                  <Trophy className="size-3.5" />
                  Lv.{growth.level}
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/24">
                <div
                  className="h-full rounded-full bg-[#44f26e]"
                  style={{ width: `${growth.progressPercent}%` }}
                />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {growthMetrics.map((metric) => (
                  <div
                    className="rounded-lg border border-white/10 bg-black/18 p-3"
                    key={metric.label}
                  >
                    <p className="text-lg font-semibold leading-none text-white">
                      {metric.value}
                    </p>
                    <p className="mt-2 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-white/42">
                      {metric.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#44f26e]/28 bg-[#44f26e]/12 px-4 py-2 text-sm font-semibold text-[#b9ffc8]">
            <Sparkles className="size-4" />
            {copy.creator.stage} {stageLevel}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/44">
            {copy.creator.characterTraits}
          </p>
          {character.traits.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {character.traits.map((trait) => (
                <span
                  className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/72"
                  key={trait}
                >
                  {trait}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm font-medium leading-6 text-white/48">
              {copy.creator.characterEmptyTraits}
            </p>
          )}
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {evolutionItems.map((item) => (
            <div
              className="rounded-lg border border-white/10 bg-white/[0.055] p-3"
              key={item.label}
            >
              <p className="line-clamp-2 text-xl font-semibold leading-tight">
                {item.value}
              </p>
              <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white/42">
                {item.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,0.74fr)_minmax(16rem,0.46fr)]">
          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/44">
              {growthLabels.skills}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {growth.skills.map((skill) => (
                <div
                  className="rounded-lg border border-[#44f26e]/22 bg-[#44f26e]/10 p-3"
                  key={skill.label}
                >
                  <p className="text-sm font-semibold text-[#b9ffc8]">
                    {skill.label}
                  </p>
                  <p className="mt-1 text-xs font-medium leading-5 text-white/50">
                    {skill.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {growth.nextMission ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/44">
                {growthLabels.next}
              </p>
              <h3 className="mt-3 text-lg font-semibold tracking-normal">
                {growth.nextMission.title}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-white/54">
                {growth.nextMission.description}
              </p>
              <p className="mt-3 text-xs font-semibold text-[#b9ffc8]">
                {formatNumber(growth.nextMission.progress, locale)} /{" "}
                {formatNumber(growth.nextMission.target, locale)}
              </p>
            </div>
          ) : null}
        </div>
      </article>

      <aside className="rounded-lg border border-black/10 bg-white p-4 text-black shadow-[0_18px_44px_rgba(8,18,12,0.1)] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-black/42">
              {copy.creator.characterTitle}
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-normal">
              {copy.creator.characterAvatars}
            </h3>
          </div>
          <Avatar
            imageUrl={character.avatarImageSet[0]?.url ?? null}
            name={displayName}
            sizeClassName="size-12"
          />
        </div>

        {character.avatarImageSet.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-2">
            {character.avatarImageSet.map((avatar) => (
              <div
                className="overflow-hidden rounded-lg border border-black/10 bg-[#eef3ec]"
                key={avatar.url}
              >
                <div className="relative aspect-square">
                  <Image
                    alt={getAvatarExpressionLabel(
                      avatar.expression,
                      avatar.label,
                      locale,
                    )}
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 40vw, 12rem"
                    src={avatar.url}
                  />
                </div>
                <p className="truncate px-3 py-2 text-xs font-semibold text-black/58">
                  {getAvatarExpressionLabel(avatar.expression, avatar.label, locale)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-lg border border-dashed border-black/12 p-4 text-sm font-medium leading-6 text-black/48">
            {copy.creator.characterBody}
          </p>
        )}

        <div className="mt-5 rounded-lg border border-black/10 bg-[#f6f8f4] p-4">
          <p className="text-sm font-semibold">
            {copy.creator.characterEvolution}
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-black/54">
            {copy.creator.characterBody}
          </p>
        </div>
      </aside>
    </section>
  );
}

export function FanletterCreatorPage({
  data,
  locale,
  referralCode,
}: {
  data: FanletterCreatorPageData;
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const effectiveReferralCode = referralCode ?? data.profile.referralCode;
  const character = data.profile.character;
  const channelName = character?.name ?? data.profile.displayName;
  const channelSummary = character?.summary || data.profile.intro;
  const isOwner = data.viewerRelation === "owner";
  const channelAvatarUrl =
    character?.avatarImageSet[0]?.url ?? data.profile.avatarImageUrl;
  const featuredItem =
    [...data.items].sort((a, b) => {
      const scoreDelta = getContentEngagementScore(b) - getContentEngagementScore(a);

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return (
        new Date(b.publishedAt ?? 0).getTime() -
        new Date(a.publishedAt ?? 0).getTime()
      );
    })[0] ?? null;
  const latestItems = data.items
    .filter((item) => item.contentId !== featuredItem?.contentId)
    .slice(0, 8);
  const contentItems = latestItems.length > 0 ? latestItems : data.items;
  const startHref = buildPathWithReferral(
    `/${locale}/fanletter/start`,
    effectiveReferralCode,
  );
  const channelHref = buildPathWithReferral(
    `/${locale}/fanletter/creator/${data.profile.referralCode}`,
    effectiveReferralCode,
  );
  const publicVlogsHref = `${channelHref}#public-vlogs`;
  const fanRequestsSectionId = "fan-requests";
  const fanRequestsFormId = `${fanRequestsSectionId}-form`;
  const fanRequestsSectionHref = `${channelHref}#${fanRequestsSectionId}`;
  const fanRequestsFormHref = `${channelHref}#${fanRequestsFormId}`;
  const followHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/onboarding`, effectiveReferralCode),
    {
      returnTo: channelHref,
    },
  );
  const fanOnlyHref = `${channelHref}#fan-only`;
  const ownerStudioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    data.profile.referralCode,
  );
  const ownerVlogsHref = buildPathWithReferral(
    `/${locale}/fanletter/studio/vlogs`,
    data.profile.referralCode,
  );
  const ownerCreateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create`, data.profile.referralCode),
    {
      returnTo: channelHref,
    },
  );
  const ownerRequestsHref = `${ownerStudioHref}#fan-requests`;
  const channelActionLabels =
    locale === "ko"
      ? {
          contentDetail: "상세 보기",
          fanRequest: "팬 요청 보내기",
          ownerCreate: "새 브이로그 만들기",
          ownerRequests: "요청함 관리",
          publicVlogs: "공개 브이로그 보기",
        }
      : {
          contentDetail: "View details",
          fanRequest: "Send fan request",
          ownerCreate: "Create new vlog",
          ownerRequests: "Manage requests",
          publicVlogs: "View public vlogs",
        };
  const channelStats = [
    {
      label: copy.creator.publicPosts,
      value: formatNumber(data.publicContentCount, locale),
    },
    {
      label: copy.creator.characterVideoSignal,
      value: formatNumber(character?.videoContentCount ?? data.items.length, locale),
    },
    {
      label: copy.creator.characterImageSignal,
      value: formatNumber(character?.avatarImageSet.length ?? 0, locale),
    },
  ];
  const channelShareTitle =
    locale === "ko"
      ? `${channelName} AI 브이로그 채널`
      : `${channelName} AI vlog channel`;
  const channelShareSummary =
    locale === "ko"
      ? `공개 브이로그 ${formatNumber(data.publicContentCount, locale)}개와 팬 전용 콘텐츠 ${formatNumber(data.fanOnlyContentCount, locale)}개를 볼 수 있는 FanLetter AI 캐릭터 채널입니다.`
      : `A FanLetter AI character channel with ${formatNumber(data.publicContentCount, locale)} public vlogs and ${formatNumber(data.fanOnlyContentCount, locale)} fan-only posts.`;

  return (
    <FanletterShell
      actions={
        <>
          <FanletterFollowCta
            creatorReferralCode={data.profile.referralCode}
            fanOnlyHref={fanOnlyHref}
            followHref={followHref}
            isOwner={isOwner}
            locale={locale}
            ownerCreateHref={ownerCreateHref}
            ownerStudioHref={ownerStudioHref}
          />
          <FanletterChannelShareButton
            href={channelHref}
            locale={locale}
            referralCode={effectiveReferralCode}
            summary={channelShareSummary}
            title={channelShareTitle}
          />
        </>
      }
      aside={
        <FanletterChannelHeroPreview
          channelAvatarUrl={channelAvatarUrl}
          channelName={channelName}
          character={character}
          fanOnlyContentCount={data.fanOnlyContentCount}
          featuredItem={featuredItem}
          locale={locale}
          publicContentCount={data.publicContentCount}
          referralCode={effectiveReferralCode}
        />
      }
      description={channelSummary}
      eyebrow={copy.creator.eyebrow}
      heroGridClassName="lg:items-start"
      heroSpacingClassName="pt-10 sm:pt-16"
      locale={locale}
      referralCode={effectiveReferralCode}
      showStartAction={false}
      title={channelName}
      titleClassName="mt-4 max-w-5xl text-[2.5rem] font-semibold leading-[1.04] tracking-normal text-white [word-break:keep-all] sm:text-[4.6rem]"
    >
      <section className="bg-[#f6f8f4] px-4 py-10 text-black sm:px-6 sm:py-14 lg:px-8">
        <FanletterChannelTabs
          channelHref={channelHref}
          fanOnlyContentCount={data.fanOnlyContentCount}
          hasFeaturedItem={Boolean(featuredItem)}
          locale={locale}
          publicContentCount={data.publicContentCount}
        />
        <div className="mx-auto max-w-[92rem]">
          <div
            className="mb-8 grid scroll-mt-36 gap-5 sm:scroll-mt-24 lg:grid-cols-[minmax(0,0.92fr)_minmax(20rem,0.72fr)]"
            id="channel-home"
          >
            <article className="rounded-lg bg-[#07100b] p-5 text-white shadow-[0_24px_70px_rgba(8,18,12,0.2)] sm:p-6 lg:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
                  <Avatar
                    imageUrl={channelAvatarUrl}
                    name={channelName}
                    sizeClassName="size-16 sm:size-20"
                  />
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
                      {copy.creator.characterTitle}
                    </p>
                    <h2 className="mt-3 break-words text-[1.9rem] font-semibold leading-[1.04] tracking-normal [overflow-wrap:anywhere] sm:text-[2.9rem] sm:[word-break:keep-all]">
                      {channelName}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-white/44">
                      {data.profile.referralCode}
                    </p>
                  </div>
                </div>
                <Link
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
                  href={isOwner ? ownerCreateHref : publicVlogsHref}
                >
                  {isOwner
                    ? channelActionLabels.ownerCreate
                    : channelActionLabels.publicVlogs}
                </Link>
              </div>

              <p className="mt-5 max-w-3xl text-sm font-medium leading-6 text-white/68 sm:text-base sm:leading-7">
                {channelSummary}
              </p>

              {character?.traits.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {character.traits.slice(0, 5).map((trait) => (
                    <span
                      className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/72"
                      key={trait}
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                {channelStats.map((stat) => (
                  <div
                    className="rounded-lg border border-white/10 bg-white/[0.055] p-3"
                    key={stat.label}
                  >
                    <p className="text-2xl font-semibold leading-none">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white/42">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/14 px-4 text-sm font-semibold !text-white transition hover:bg-white/8"
                  href={publicVlogsHref}
                >
                  {channelActionLabels.publicVlogs}
                </Link>
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/14 px-4 text-sm font-semibold !text-white transition hover:bg-white/8"
                  href={isOwner ? ownerRequestsHref : fanRequestsSectionHref}
                >
                  {isOwner
                    ? channelActionLabels.ownerRequests
                    : channelActionLabels.fanRequest}
                </Link>
              </div>
            </article>

            <FanletterCreatorFanAccessPanel
              creatorReferralCode={data.profile.referralCode}
              fanOnlyContentCount={data.fanOnlyContentCount}
              fanOnlyHref={fanOnlyHref}
              followHref={followHref}
              isOwner={isOwner}
              locale={locale}
              ownerCreateHref={ownerCreateHref}
              ownerStudioHref={ownerStudioHref}
              publicVlogsHref={publicVlogsHref}
              startHref={startHref}
            />
          </div>

          {featuredItem ? (
            <section
              className="mb-8 scroll-mt-36 sm:scroll-mt-24"
              id="featured-vlog"
            >
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#1f7c38]">
                    {copy.feed.featured}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                    {copy.feed.trending}
                  </h2>
                </div>
              </div>
              <FeaturedFeedCard
                authorNameOverride={channelName}
                item={featuredItem}
                locale={locale}
                referralCode={effectiveReferralCode}
              />
            </section>
          ) : null}

          <FanletterFanPromptPanel
            characterName={channelName}
            className="mb-8"
            creatorReferralCode={data.profile.referralCode}
            followHref={followHref}
            id={fanRequestsSectionId}
            isOwner={isOwner}
            locale={locale}
            ownerCreateHref={ownerCreateHref}
            ownerRequestsHref={ownerRequestsHref}
            ownerStudioHref={ownerStudioHref}
            previewRequests={data.fanRequestPreviews}
            publicVlogsHref={publicVlogsHref}
            referralCode={effectiveReferralCode}
            requestHref={fanRequestsSectionHref}
            startHref={startHref}
          />

          {!isOwner ? (
            <FanletterRequestStatusPanel
              className="mb-8"
              creatorReferralCode={data.profile.referralCode}
              locale={locale}
              referralCode={effectiveReferralCode}
            />
          ) : null}

          <FanletterFanOnlyPreview
            channelName={channelName}
            fanOnlyHref={fanOnlyHref}
            fanOnlyContentCount={data.fanOnlyContentCount}
            isOwner={isOwner}
            items={data.fanOnlyItems}
            locale={locale}
            ownerCreateHref={ownerCreateHref}
            ownerManageHref={ownerVlogsHref}
            publicVlogsHref={publicVlogsHref}
            referralCode={effectiveReferralCode}
            requestFormId={fanRequestsFormId}
            requestHref={fanRequestsFormHref}
          />

          <section
            className="mb-8 scroll-mt-36 sm:scroll-mt-24"
            id="public-vlogs"
          >
            <div className="mb-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#1f7c38]">
                {copy.creator.characterVideoSignal}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                {copy.creator.characterLatest}
              </h2>
            </div>
            <ContentGrid
              authorNameOverride={channelName}
              contentActionLabel={channelActionLabels.contentDetail}
              empty={copy.creator.empty}
              emptyActionHref={isOwner ? ownerCreateHref : startHref}
              emptyActionLabel={
                isOwner ? channelActionLabels.ownerCreate : copy.actions.start
              }
              items={contentItems}
              locale={locale}
              referralCode={effectiveReferralCode}
              showVideoPreview
            />
          </section>

          {character ? (
            <CharacterPersonaShowcase
              character={character}
              displayName={channelName}
              locale={locale}
              publicContentCount={data.publicContentCount}
            />
          ) : null}
        </div>
      </section>
    </FanletterShell>
  );
}

function FanletterCharacterMiniCard({
  channelHref,
  content,
  locale,
  primaryActionHref,
  primaryActionLabel,
  secondaryActionHref,
  secondaryActionLabel,
}: {
  channelHref: string;
  content: FanletterPublicContentDetail;
  locale: Locale;
  primaryActionHref: string;
  primaryActionLabel: string;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
}) {
  const copy = getCopy(locale);
  const realismCopy = getFanletterRealismDisclosureCopy(locale);
  const character = content.authorCharacter;
  const characterName = character?.name ?? content.authorName;
  const characterSummary = character?.summary || content.summary;
  const avatarUrl =
    character?.avatarImageSet[0]?.url ?? content.authorAvatarImageUrl;
  const traits = (character?.traits.length ? character.traits : content.tags)
    .filter(Boolean)
    .slice(0, 4);
  const labels =
    locale === "ko"
      ? {
          fanOnly:
            content.priceType === "paid"
              ? "팬 전용 유료 브이로그"
              : "팬 전용 요청 가능",
          freeFollow: "무료 공개 채널",
          growth: "성장 상태",
          next: "다음 성장",
          skills: "캐릭터 스킬",
        }
      : {
          fanOnly:
            content.priceType === "paid"
              ? "Fan-only paid vlog"
              : "Fan-only requests open",
          freeFollow: "Free public channel",
          growth: "Growth status",
          next: "Next growth",
          skills: "Character skills",
        };
  const stats = [
    {
      label: copy.creator.stage,
      value: character ? `Lv.${character.growth.level}` : "Lv.1",
    },
    {
      label: copy.creator.publicPosts,
      value: formatNumber(content.authorPublicContentCount, locale),
    },
    {
      label: copy.creator.characterVideoSignal,
      value: formatNumber(character?.videoContentCount ?? 1, locale),
    },
  ];

  return (
    <section className="mt-7 rounded-lg border border-[#44f26e]/24 bg-[#07100b] p-4 text-white shadow-[0_18px_52px_rgba(0,0,0,0.26)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Link className="flex min-w-0 items-start gap-3" href={channelHref}>
          <Avatar
            imageUrl={avatarUrl}
            name={characterName}
            sizeClassName="size-14"
          />
          <div className="min-w-0">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[#44f26e]">
              {copy.creator.characterTitle}
            </p>
            <h2 className="mt-2 break-words text-2xl font-semibold leading-tight tracking-normal [overflow-wrap:anywhere]">
              {characterName}
            </h2>
            <p className="mt-1 text-sm font-semibold text-white/42">
              {content.authorReferralCode ?? "FanLetter"}
            </p>
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-2 sm:w-48">
          {stats.map((stat) => (
            <div
              className="rounded-lg border border-white/10 bg-white/[0.055] p-3"
              key={stat.label}
            >
              <p className="text-xl font-semibold leading-none">{stat.value}</p>
              <p className="mt-2 text-[0.56rem] font-semibold uppercase tracking-[0.12em] text-white/40">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2"
          title={realismCopy.description}
        >
          <BadgeCheck className="size-4 shrink-0 text-[#44f26e]" />
          <span className="min-w-0 truncate text-xs font-semibold text-white/72">
            {realismCopy.label}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2">
          <BellPlus className="size-4 shrink-0 text-[#44f26e]" />
          <span className="min-w-0 truncate text-xs font-semibold text-white/72">
            {labels.freeFollow}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[#44f26e]/18 bg-[#44f26e]/10 px-3 py-2">
          <Crown className="size-4 shrink-0 text-[#44f26e]" />
          <span className="min-w-0 truncate text-xs font-semibold text-[#b9ffc8]">
            {labels.fanOnly}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm font-medium leading-6 text-white/66">
        {characterSummary}
      </p>

      {character ? (
        <div className="mt-4 rounded-lg border border-[#44f26e]/22 bg-[#44f26e]/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[#9bffad]">
                {labels.growth}
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-normal">
                {character.growth.title}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-white/58">
                {character.growth.summary}
              </p>
            </div>
            <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1.5 text-xs font-semibold text-black">
              <Trophy className="size-3.5" />
              Lv.{character.growth.level}
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/24">
            <div
              className="h-full rounded-full bg-[#44f26e]"
              style={{ width: `${character.growth.progressPercent}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {character.growth.skills.map((skill) => (
              <span
                className="rounded-full border border-[#44f26e]/24 bg-black/20 px-3 py-1.5 text-xs font-semibold text-[#b9ffc8]"
                key={skill.label}
                title={skill.description}
              >
                {skill.label}
              </span>
            ))}
          </div>
          {character.growth.nextMission ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white/38">
                {labels.next}
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {character.growth.nextMission.title}
              </p>
              <p className="mt-1 text-xs font-medium leading-5 text-white/52">
                {character.growth.nextMission.description}
              </p>
              <p className="mt-2 text-xs font-semibold text-[#b9ffc8]">
                {formatNumber(character.growth.nextMission.progress, locale)} /{" "}
                {formatNumber(character.growth.nextMission.target, locale)}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {traits.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {traits.map((trait) => (
            <span
              className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/72"
              key={trait}
            >
              {trait}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
          href={primaryActionHref}
        >
          {primaryActionLabel}
          <ArrowRight className="size-4" />
        </Link>
        {secondaryActionHref && secondaryActionLabel ? (
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/14 px-4 text-sm font-semibold !text-white transition hover:bg-white/8"
            href={secondaryActionHref}
          >
            {secondaryActionLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export function FanletterContentDetailPage({
  content,
  locale,
  referralCode,
  returnToHref,
}: {
  content: FanletterPublicContentDetail;
  locale: Locale;
  referralCode: string | null;
  returnToHref: string | null;
}) {
  const copy = getCopy(locale);
  const effectiveReferralCode = referralCode ?? content.authorReferralCode;
  const isOwnContent = content.viewerRelation === "owner";
  const canViewerAccess = content.canViewerAccess || isOwnContent;
  const fallbackBackHref = buildPathWithReferral(
    `/${locale}/fanletter/feed`,
    effectiveReferralCode,
  );
  const homeHref = buildPathWithReferral(
    `/${locale}/fanletter`,
    effectiveReferralCode,
  );
  const startHref = buildPathWithReferral(
    `/${locale}/fanletter/start`,
    effectiveReferralCode,
  );
  const createHref = buildPathWithReferral(
    `/${locale}/fanletter/create`,
    effectiveReferralCode,
  );
  const ownerManageHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/studio/vlogs`, effectiveReferralCode),
    {
      returnTo:
        returnToHref ??
        buildPathWithReferral(
          `/${locale}/fanletter/content/${content.contentId}`,
          effectiveReferralCode,
        ),
    },
  );
  const currentHref = buildPathWithReferral(
    `/${locale}/fanletter/content/${content.contentId}`,
    effectiveReferralCode,
  );
  const onboardingHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/onboarding`, effectiveReferralCode),
    {
      returnTo: returnToHref ?? currentHref,
    },
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, effectiveReferralCode),
    {
      returnTo: returnToHref ?? currentHref,
    },
  );
  const creatorHref = content.authorReferralCode
    ? buildPathWithReferral(
        `/${locale}/fanletter/creator/${content.authorReferralCode}`,
        effectiveReferralCode,
      )
    : fallbackBackHref;
  const fallbackFanRequestHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/onboarding`, effectiveReferralCode),
    {
      returnTo: `${creatorHref}#fan-requests`,
    },
  );
  const fanRequestSectionId = "fanletter-request";
  const fanRequestFormId = `${fanRequestSectionId}-form`;
  const fanRequestHref = content.authorReferralCode
    ? `#${fanRequestFormId}`
    : fallbackFanRequestHref;
  const requestStatusHref = `${buildPathWithReferral(
    `/${locale}/fanletter/requests`,
    effectiveReferralCode,
  )}#fanletter-request-inbox`;
  const backHref = returnToHref ?? fallbackBackHref;
  const primaryVideoUrl = content.contentVideoUrls[0] ?? null;
  const primaryImageUrl = content.coverImageUrl ?? content.contentImageUrls[0] ?? null;
  const paidUnlockSectionId = "fanletter-paid-unlock";
  const shouldShowPaidUnlockPanel = content.priceType === "paid" && !canViewerAccess;
  const detailAccessLabel = isOwnContent
    ? content.priceType === "paid"
      ? locale === "ko"
        ? "내 팬 전용 브이로그"
        : "My fan-only vlog"
      : locale === "ko"
        ? "내 공개 브이로그"
        : "My public vlog"
    : content.priceType === "paid"
      ? canViewerAccess
        ? locale === "ko"
          ? `결제 완료 · ${content.priceUsdt ?? "1"} USDT`
          : `Unlocked · ${content.priceUsdt ?? "1"} USDT`
        : `${copy.content.paid} · ${content.priceUsdt ?? "1"} USDT`
      : copy.content.public;
  const detailActionHref = isOwnContent
    ? ownerManageHref
    : content.priceType === "paid" && !canViewerAccess
      ? `#${paidUnlockSectionId}`
      : fanRequestHref;
  const detailActionLabel = isOwnContent
    ? locale === "ko"
      ? "스튜디오에서 관리"
      : "Manage in studio"
    : content.priceType === "paid" && !canViewerAccess
      ? locale === "ko"
        ? "결제하고 잠금 해제"
        : "Pay to unlock"
      : locale === "ko"
        ? "다음 장면 요청"
        : "Request scene";
  const creatorActionHref = creatorHref;
  const creatorActionLabel = copy.actions.creatorChannel;
  const contentCharacterName = content.authorCharacter?.name ?? content.authorName;
  const contentCharacterAvatarUrl =
    content.authorCharacter?.avatarImageSet[0]?.url ??
    content.authorAvatarImageUrl;
  const displayContentBody = getDisplayContentBody(
    content.body,
    contentCharacterName,
    locale,
  );
  const detailLabels =
    locale === "ko"
      ? {
          character: "캐릭터",
          heroEyebrow: "FanLetter 전용 브이로그",
          ownerManage: "내 브이로그 관리",
          requestCta: "다음 장면 요청",
          requestStatusCta: "내 요청 상태 보기",
          watchBadge: "세로 브이로그",
        }
      : {
          character: "Character",
          heroEyebrow: "FanLetter vlog detail",
          ownerManage: "Manage my vlog",
          requestCta: "Request scene",
          requestStatusCta: "Track my request",
          watchBadge: "Vertical vlog",
        };
  const mobilePrimaryActionHref = shouldShowPaidUnlockPanel
    ? detailActionHref
    : isOwnContent
      ? ownerManageHref
      : fanRequestHref;
  const mobilePrimaryActionLabel = shouldShowPaidUnlockPanel
    ? detailActionLabel
    : isOwnContent
      ? detailLabels.ownerManage
      : detailLabels.requestCta;
  const mobileSecondaryActionHref = creatorActionHref;
  const mobileSecondaryActionLabel = creatorActionLabel;
  const desktopPrimaryActionHref = mobilePrimaryActionHref;
  const desktopPrimaryActionLabel = mobilePrimaryActionLabel;
  const desktopSecondaryActionHref = creatorActionHref;
  const desktopSecondaryActionLabel = creatorActionLabel;
  const shouldShowDetailQuickActions = isOwnContent || !content.fanRequestSource;

  return (
    <main className="min-h-screen bg-[#030504] text-white">
      <section className="px-4 pb-8 pt-3 sm:px-6 sm:pb-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex size-11 items-center justify-center rounded-full border border-white/14 bg-white/[0.04]"
              href={backHref}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <Link
              className="flex min-w-0 items-center gap-2"
              href={homeHref}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <MessageCircleHeart className="size-5" />
              </span>
              <span className="hidden truncate text-xl font-semibold tracking-normal sm:inline">
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
                referralCode={effectiveReferralCode}
              />
              <Link
                className="hidden h-11 items-center justify-center rounded-full border border-[#44f26e]/50 bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84] sm:inline-flex"
                href={detailActionHref}
              >
                {detailActionLabel}
              </Link>
            </div>
          </header>

          <div className="mt-4 flex lg:hidden">
            <FanletterGlobalLanguageSwitcher compact locale={locale} />
          </div>

          <div className="pt-5 lg:hidden">
            <Link
              className="inline-flex max-w-full items-center gap-3 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-white transition hover:border-[#44f26e]/40 hover:bg-white/[0.065]"
              href={creatorHref}
            >
              <Avatar
                imageUrl={contentCharacterAvatarUrl}
                name={contentCharacterName}
                sizeClassName="size-9"
              />
              <span className="min-w-0">
                <span className="block text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[#44f26e]">
                  {detailLabels.character}
                </span>
                <span className="block truncate text-sm font-semibold">
                  {contentCharacterName}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-[#44f26e]" />
            </Link>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-black">
                {content.mediaType === "video" ? (
                  <PlayCircle className="size-3.5" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                {detailAccessLabel}
              </span>
              {formatDate(content.publishedAt, locale) ? (
                <span className="rounded-full border border-white/12 px-3 py-1 text-xs font-semibold text-white/58">
                  {formatDate(content.publishedAt, locale)}
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 break-words text-[2rem] font-semibold leading-[1.04] tracking-normal [overflow-wrap:anywhere] [word-break:keep-all]">
              {content.title}
            </h1>
            <p className="mt-3 line-clamp-2 break-words text-sm font-medium leading-6 text-white/64 [overflow-wrap:anywhere]">
              {content.summary}
            </p>

            <FanletterContentDetailCtaGroup
              creatorReferralCode={content.authorReferralCode}
              defaultPrimaryHref={mobilePrimaryActionHref}
              defaultPrimaryLabel={mobilePrimaryActionLabel}
              primaryIcon={shouldShowPaidUnlockPanel ? "lock" : "pen"}
              requestStatusHref={requestStatusHref}
              requestStatusLabel={detailLabels.requestStatusCta}
              secondaryHref={mobileSecondaryActionHref}
              secondaryLabel={mobileSecondaryActionLabel}
              sourceContentId={content.contentId}
              variant="mobile"
            />
          </div>

          <div className="grid gap-4 pt-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start lg:gap-8 lg:pt-12">
            <section className="overflow-hidden rounded-lg border border-white/10 bg-[#07100b] shadow-[0_24px_80px_rgba(0,0,0,0.34)] lg:sticky lg:top-6">
              <div className="relative h-[52svh] min-h-[20rem] max-h-[28rem] bg-[#07100b] sm:h-auto sm:min-h-0 sm:max-h-none sm:aspect-[4/5]">
                <MediaCard
                  alt={content.title}
                  blurred={shouldShowPaidUnlockPanel}
                  imageUrl={primaryImageUrl}
                  mediaType={content.mediaType}
                  title={content.title}
                  videoUrl={primaryVideoUrl}
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-3">
                  <span className="inline-flex rounded-full bg-black/62 px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
                    {detailLabels.watchBadge}
                  </span>
                  <span className="inline-flex rounded-full bg-[#44f26e] px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-black">
                    FanLetter
                  </span>
                </div>
              </div>
              <div className="border-t border-white/8 p-3">
                <SocialMetrics content={content} locale={locale} />
              </div>
              <div className="hidden sm:block">
                <FanletterDetailWatchPanel
                  channelHref={creatorHref}
                  characterAvatarUrl={contentCharacterAvatarUrl}
                  characterName={contentCharacterName}
                  content={content}
                  locale={locale}
                />
              </div>
            </section>

            <section className="pb-10">
              <div className="hidden lg:block">
                <Link
                  className="mb-4 inline-flex max-w-full items-center gap-3 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-white transition hover:border-[#44f26e]/40 hover:bg-white/[0.065]"
                  href={creatorHref}
                >
                  <Avatar
                    imageUrl={contentCharacterAvatarUrl}
                    name={contentCharacterName}
                    sizeClassName="size-9"
                  />
                  <span className="min-w-0">
                    <span className="block text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[#44f26e]">
                      {detailLabels.character}
                    </span>
                    <span className="block truncate text-sm font-semibold">
                      {contentCharacterName}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-[#44f26e]" />
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-black">
                    {content.mediaType === "video" ? (
                      <PlayCircle className="size-3.5" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    {detailAccessLabel}
                  </span>
                  {formatDate(content.publishedAt, locale) ? (
                    <span className="rounded-full border border-white/12 px-3 py-1 text-xs font-semibold text-white/58">
                      {formatDate(content.publishedAt, locale)}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-white/12 px-3 py-1 text-xs font-semibold text-white/58">
                    {detailLabels.heroEyebrow}
                  </span>
                </div>

                <h1 className="mt-5 break-words text-[2.45rem] font-semibold leading-[1] tracking-normal [overflow-wrap:anywhere] [word-break:keep-all] sm:text-[4.1rem]">
                  {content.title}
                </h1>
                <p className="mt-5 text-base font-medium leading-7 text-white/68 sm:text-lg">
                  {content.summary}
                </p>
                <FanletterContentDetailCtaGroup
                  creatorReferralCode={content.authorReferralCode}
                  defaultPrimaryHref={desktopPrimaryActionHref}
                  defaultPrimaryLabel={desktopPrimaryActionLabel}
                  primaryIcon={shouldShowPaidUnlockPanel ? "lock" : "pen"}
                  requestStatusHref={requestStatusHref}
                  requestStatusLabel={detailLabels.requestStatusCta}
                  secondaryHref={desktopSecondaryActionHref}
                  secondaryLabel={desktopSecondaryActionLabel}
                  sourceContentId={content.contentId}
                  variant="desktop"
                />
              </div>

              {shouldShowPaidUnlockPanel ? (
                <div className="scroll-mt-6 lg:scroll-mt-8" id={paidUnlockSectionId}>
                  <FanletterPaidUnlockPanel
                    connectHref={connectHref}
                    contentImageCount={content.contentImageCount}
                    contentId={content.contentId}
                    contentVideoCount={content.contentVideoCount}
                    creatorHref={creatorHref}
                    currentHref={currentHref}
                    initialBody={content.body}
                    initialCoverImageUrl={primaryImageUrl}
                    initialSummary={content.summary}
                    initialTitle={content.title}
                    locale={locale}
                    onboardingHref={onboardingHref}
                    priceUsdt={content.priceUsdt}
                    referralCode={effectiveReferralCode}
                  />
                </div>
              ) : null}

              <FanletterSocialActions
                contentId={content.contentId}
                initialSocial={content.social}
                isOwnContent={isOwnContent}
                locale={locale}
                shareHref={currentHref}
                summary={content.summary}
                title={content.title}
              />

              {content.fanRequestSource ? (
                <FanletterFanRequestSourceCard
                  channelHref={creatorHref}
                  content={content}
                  isOwnContent={isOwnContent}
                  locale={locale}
                  ownerManageHref={ownerManageHref}
                  requestHref={fanRequestHref}
                />
              ) : (
                <FanletterDetailRequestCta
                  characterName={contentCharacterName}
                  fanRequestHref={fanRequestHref}
                  isOwnContent={isOwnContent}
                  locale={locale}
                  ownerManageHref={ownerManageHref}
                />
              )}

              {canViewerAccess ? (
                <section className="mt-6 rounded-lg border border-white/10 bg-white p-5 text-black sm:p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-black/42">
                    {copy.content.body}
                  </p>
                  <p className="mt-4 whitespace-pre-wrap break-words text-base font-medium leading-8 text-black/74">
                    {displayContentBody}
                  </p>
                </section>
              ) : null}

              {shouldShowDetailQuickActions ? (
                <FanletterDetailQuickActions
                  characterName={contentCharacterName}
                  createHref={createHref}
                  creatorActionHref={creatorActionHref}
                  creatorActionLabel={creatorActionLabel}
                  detailActionHref={detailActionHref}
                  detailActionLabel={detailActionLabel}
                  fanRequestHref={fanRequestHref}
                  isOwnContent={isOwnContent}
                  locale={locale}
                  startHref={startHref}
                />
              ) : null}

              <FanletterCharacterMiniCard
                channelHref={creatorHref}
                content={content}
                locale={locale}
                primaryActionHref={creatorActionHref}
                primaryActionLabel={creatorActionLabel}
                secondaryActionHref={isOwnContent ? createHref : undefined}
                secondaryActionLabel={
                  isOwnContent
                    ? locale === "ko"
                      ? "다음 브이로그 만들기"
                      : "Create next vlog"
                    : undefined
                }
              />

            </section>
          </div>

          <div className="mt-6 pb-10">
            {isOwnContent ? (
              <FanletterOwnerContentPanel
                channelHref={creatorHref}
                createHref={createHref}
                locale={locale}
                manageHref={ownerManageHref}
              />
            ) : (
              <>
                <FanletterFanPromptPanel
                  characterName={contentCharacterName}
                  creatorReferralCode={content.authorReferralCode}
                  followHref={onboardingHref}
                  id={fanRequestSectionId}
                  locale={locale}
                  publicVlogsHref={`${creatorHref}#public-vlogs`}
                  referralCode={effectiveReferralCode}
                  requestHref={fanRequestHref}
                  sourceContentId={content.contentId}
                  startHref={startHref}
                />

                <FanletterRequestStatusPanel
                  className="mt-6"
                  creatorReferralCode={content.authorReferralCode}
                  locale={locale}
                  referralCode={effectiveReferralCode}
                  sourceContentId={content.contentId}
                />
              </>
            )}

            {canViewerAccess &&
            content.contentVideoUrls.length > 1 ? (
              <section className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Grid2X2 className="size-4 text-[#44f26e]" />
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/54">
                    {copy.content.media}
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {content.contentVideoUrls.slice(1).map((videoUrl) => (
                    <div
                      className="overflow-hidden rounded-lg border border-white/10 bg-black"
                      key={videoUrl}
                    >
                      <video
                        className="aspect-[9/14] w-full object-cover"
                        controls
                        muted
                        playsInline
                        preload="metadata"
                        src={videoUrl}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <FanletterRelatedVlogs
              fallbackImageUrl={
                content.authorCharacter?.avatarImageSet[0]?.url ??
                content.authorAvatarImageUrl
              }
              items={content.authorRecentContent}
              locale={locale}
              referralCode={effectiveReferralCode}
            />

            <FanletterContentNextActions
              channelHref={creatorHref}
              createHref={createHref}
              feedHref={fallbackBackHref}
              isOwnContent={isOwnContent}
              locale={locale}
              manageHref={ownerManageHref}
              startHref={startHref}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

export function FanletterOnboardingPage({
  locale,
  referralCode,
}: {
  locale: Locale;
  referralCode: string | null;
}) {
  const onboardingHref = buildPathWithReferral(
    `/${locale}/fanletter/onboarding`,
    referralCode,
  );
  const feedHref = buildPathWithReferral(`/${locale}/fanletter/feed`, referralCode);
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    { returnTo: onboardingHref },
  );
  const profileHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/profile`, referralCode),
    { returnTo: onboardingHref },
  );
  const createHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create`, referralCode),
    { returnTo: onboardingHref },
  );
  const studioHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/studio`, referralCode),
    { returnTo: onboardingHref },
  );
  const activateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/activate`, referralCode),
    { returnTo: onboardingHref },
  );
  const labels =
    locale === "ko"
      ? {
          accountState: "연결된 FanLetter 계정을 기준으로 시작 상태를 확인합니다.",
          asideBody:
            "처음 방문한 사용자도 필요한 작업만 순서대로 진행할 수 있게 정리했습니다.",
          asideTitle: "시작 준비",
          completeBody:
            "계정 연결, 캐릭터 만들기, 첫 브이로그 생성을 끝내면 피드와 스튜디오에서 바로 운영을 이어갈 수 있습니다.",
          completeTitle: "3단계 시작 체크리스트",
          description:
            "계정 연결, 캐릭터 만들기, 첫 숏폼 브이로그 생성까지 한 화면에서 순서대로 진행하세요.",
          eyebrow: "FanLetter 온보딩",
          feedCta: "브이로그 피드 보기",
          helper: "계정 연결, 캐릭터 준비, 첫 브이로그 생성을 한 흐름으로 묶어 처음 시작하는 사용자가 길을 잃지 않게 합니다.",
          homeCta: "브이로그 스튜디오",
          progress: "빠른 시작",
          readyValue: "3단계",
          title: "AI 캐릭터 브이로그 시작하기",
          steps: [
            {
              body: "FanLetter 계정과 시작 준비 상태를 확인합니다. 완료 후 다시 이 온보딩 화면으로 돌아옵니다.",
              cta: "계정 연결하기",
              href: connectHref,
              Icon: User,
              meta: "01 · 계정",
              title: "FanLetter 계정 연결",
            },
            {
              body: "표시 이름과 분위기만 정하면 캐릭터 설정과 대표 아바타를 자동으로 저장합니다.",
              cta: "캐릭터 만들기",
              href: profileHref,
              Icon: PenLine,
              meta: "02 · 캐릭터",
              title: "AI 캐릭터 만들기",
            },
            {
              body: "오늘의 셀피, 루틴, 외출, 대화 장면을 세로형 브이로그로 만들고 공개 범위와 가격을 정합니다.",
              cta: "첫 브이로그 만들기",
              href: createHref,
              Icon: Clapperboard,
              meta: "03 · 브이로그",
              title: "첫 숏폼 브이로그 생성",
            },
          ],
        }
      : {
          accountState: "FanLetter checks readiness from the connected account.",
          asideBody:
            "A focused path for new creators to start an AI character vlogger channel quickly.",
          asideTitle: "Start today's channel",
          completeBody:
            "After account connection, character creation, and first vlog, continue directly into the FanLetter vlog feed and studio.",
          completeTitle: "3-step start checklist",
          description:
            "Move through account connection, character creation, and first short-form vlog creation inside FanLetter.",
          eyebrow: "FanLetter Onboarding",
          feedCta: "View vlog feed",
          helper: "Account connection, character setup, and first vlog creation stay in one guided FanLetter flow.",
          homeCta: "Vlog studio",
          progress: "Quick start",
          readyValue: "3 steps",
          title: "Start your AI character vlog",
          steps: [
            {
              body: "Confirm the FanLetter account and readiness state. After completion, return to this onboarding page.",
              cta: "Connect account",
              href: connectHref,
              Icon: User,
              meta: "01 · Account",
              title: "Connect FanLetter account",
            },
            {
              body: "Choose a display name and mood to save the character setup and representative avatar automatically.",
              cta: "Create character",
              href: profileHref,
              Icon: PenLine,
              meta: "02 · Character",
              title: "Create AI character",
            },
            {
              body: "Create today's selfie, routine, outing, or dialogue scene as a vertical vlog, then set visibility and pricing.",
              cta: "Create first vlog",
              href: createHref,
              Icon: Clapperboard,
              meta: "03 · Vlog",
              title: "Create first short-form vlog",
            },
          ],
        };
  const progressItems = labels.steps.map((step) => ({
    label: step.meta.split("·")[1]?.trim() ?? step.title,
    title: step.title,
  }));
  const heroAside = (
    <div className="rounded-lg border border-white/12 bg-white/[0.055] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">{labels.asideTitle}</p>
          <p className="mt-1 text-xs font-medium leading-5 text-white/52">
            {labels.asideBody}
          </p>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-[#44f26e] px-3 py-1 text-[0.66rem] font-semibold uppercase text-black">
          {labels.readyValue}
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {labels.steps.map((step, index) => {
          const Icon = step.Icon;

          return (
            <FanletterSetupStepNavLink
              activateHref={activateHref}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/34 p-3 transition hover:border-[#44f26e]/54 hover:bg-black/48"
              connectHref={connectHref}
              createHref={createHref}
              key={step.title}
              locale={locale}
              onboardingHref={onboardingHref}
              profileHref={profileHref}
              stepIndex={index}
              studioHref={studioHref}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mt-1 block truncate text-sm font-semibold text-white">
                  {step.title}
                </span>
                {index <= 2 ? (
                  <span className="mt-2 block">
                    <FanletterSetupStepBadge
                      locale={locale}
                      surface="dark"
                      stepIndex={index}
                    />
                  </span>
                ) : null}
              </span>
              <ArrowRight className="size-4 shrink-0 text-white/42" />
            </FanletterSetupStepNavLink>
          );
        })}
      </div>
    </div>
  );

  return (
    <FanletterSetupStatusProvider>
      <FanletterShell
        actions={
          <FanletterSetupHeroActions
            activateHref={activateHref}
            connectHref={connectHref}
            createHref={createHref}
            locale={locale}
            onboardingHref={onboardingHref}
            profileHref={profileHref}
            studioHref={studioHref}
            surface="dark"
            variant="onboarding"
          />
        }
        aside={heroAside}
        description={
          <FanletterSetupHeroDescription
            defaultText={labels.description}
            locale={locale}
          />
        }
        eyebrow={labels.eyebrow}
        currentSection="start"
        locale={locale}
        referralCode={referralCode}
        title={labels.title}
        titleClassName="mt-4 max-w-4xl text-[2.3rem] font-semibold leading-[1.06] tracking-normal text-white [word-break:keep-all] sm:text-[3.45rem] lg:text-[4rem]"
      >
      <section className="bg-[#f6f8f4] px-4 py-10 text-black sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <aside className="rounded-lg border border-black/10 bg-[#07100b] p-5 text-white shadow-[0_22px_60px_rgba(8,18,12,0.18)] sm:p-6 lg:sticky lg:top-6">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
              {labels.progress}
            </p>
            <h2 className="mt-4 text-[2rem] font-semibold leading-[1.05] tracking-normal [word-break:keep-all] sm:text-[2.35rem]">
              {labels.completeTitle}
            </h2>
            <p className="mt-4 text-sm font-medium leading-6 text-white/62">
              {labels.completeBody}
            </p>
            <FanletterSetupProgressTiles items={progressItems} locale={locale} />
            <p className="mt-5 rounded-lg border border-white/10 bg-white/[0.055] p-3 text-xs font-medium leading-5 text-white/58">
              <FanletterSetupStatusNote
                defaultText={labels.accountState}
                locale={locale}
              />
            </p>
          </aside>

          <div className="grid gap-3">
            {labels.steps.map((step, index) => {
              const Icon = step.Icon;

              return (
                <article
                  className="rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_42px_rgba(8,18,12,0.06)] sm:p-5"
                  key={step.title}
                >
                  <div className="grid gap-4 sm:grid-cols-[4rem_1fr_auto] sm:items-center">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                      <Icon className="size-7" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-black px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white">
                          {step.meta}
                        </span>
                        {index <= 2 ? (
                          <FanletterSetupStepBadge
                            locale={locale}
                            stepIndex={index}
                          />
                        ) : null}
                      </div>
                      <FanletterSetupStepText
                        body={step.body}
                        locale={locale}
                        stepIndex={index}
                        title={step.title}
                      />
                    </div>
                    <FanletterSetupStepAction
                      activateHref={activateHref}
                      connectHref={connectHref}
                      createHref={createHref}
                      defaultLabel={step.cta}
                      locale={locale}
                      onboardingHref={onboardingHref}
                      profileHref={profileHref}
                      stepIndex={index}
                      studioHref={studioHref}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mx-auto mt-8 grid max-w-6xl gap-3 md:grid-cols-2">
          <Link
            className="flex min-h-[9rem] items-end justify-between gap-4 rounded-lg border border-black/10 bg-white p-5 text-black shadow-[0_18px_42px_rgba(8,18,12,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(8,18,12,0.08)]"
            href={studioHref}
          >
            <span>
              <span className="flex size-11 items-center justify-center rounded-lg bg-black text-white">
                <Rocket className="size-5" />
              </span>
              <span className="mt-4 block text-2xl font-semibold leading-tight">
                {labels.homeCta}
              </span>
              <span className="mt-2 block text-sm font-medium leading-6 text-black/54">
                {labels.helper}
              </span>
            </span>
            <ArrowRight className="size-5 shrink-0" />
          </Link>
          <Link
            className="flex min-h-[9rem] items-end justify-between gap-4 rounded-lg border border-black/10 bg-[#07100b] p-5 !text-white shadow-[0_18px_42px_rgba(8,18,12,0.14)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(8,18,12,0.18)]"
            href={feedHref}
          >
            <span>
              <span className="flex size-11 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <MessageCircleHeart className="size-5" />
              </span>
              <span className="mt-4 block text-2xl font-semibold leading-tight">
                {labels.feedCta}
              </span>
              <span className="mt-2 block text-sm font-medium leading-6 text-white/56">
                {labels.completeBody}
              </span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-[#44f26e]" />
          </Link>
        </div>
      </section>
      </FanletterShell>
    </FanletterSetupStatusProvider>
  );
}

export function FanletterStartPage({
  locale,
  referralCode,
}: {
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const onboardingHref = buildPathWithReferral(
    `/${locale}/fanletter/onboarding`,
    referralCode,
  );
  const profileHref = buildPathWithReferral(
    `/${locale}/fanletter/profile`,
    referralCode,
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    { returnTo: onboardingHref },
  );
  const createHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create`, referralCode),
    { returnTo: onboardingHref },
  );
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );
  const activateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/activate`, referralCode),
    { returnTo: onboardingHref },
  );
  const startLabels =
    locale === "ko"
      ? {
          flowEyebrow: "Quick setup",
          flowBody:
            "완료된 단계와 다음 단계를 자동으로 확인하면서 순서대로 진행합니다.",
          flowTitle: "현재 시작 상태",
          previewTitle: "오늘 할 일",
          previewBody:
            "계정, 캐릭터, 첫 브이로그 중 지금 필요한 단계만 확인하세요.",
          readyLabel: "전체 단계",
          readyValue: "3단계",
          stepMeta: ["계정", "캐릭터", "브이로그"],
          stepStatus: "상태 기반 안내",
        }
      : {
          flowEyebrow: "Quick setup",
          flowBody:
            "Move through the flow while completed steps and the next action update automatically.",
          flowTitle: "Current start status",
          previewTitle: "Today’s path",
          previewBody:
            "Check only the account, character, or first-vlog step needed right now.",
          readyLabel: "Total steps",
          readyValue: "3 steps",
          stepMeta: ["Account", "Character", "Vlog"],
          stepStatus: "Status-aware guide",
        };
  const startIcons = [User, Sparkles, Clapperboard] as const;
  const startProgressItems = copy.start.steps.map((step, index) => ({
    label: startLabels.stepMeta[index] ?? step.title,
    title: step.title,
  }));
  const heroAside = (
    <div className="rounded-lg border border-white/12 bg-white/[0.055] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">
            {startLabels.previewTitle}
          </p>
          <p className="mt-1 text-xs font-medium leading-5 text-white/52">
            {startLabels.previewBody}
          </p>
        </div>
        <span className="rounded-full bg-[#44f26e] px-3 py-1 text-[0.66rem] font-semibold uppercase text-black">
          {startLabels.readyValue}
        </span>
      </div>
      <FanletterSetupProgressTiles items={startProgressItems} locale={locale} />
      <p className="mt-4 rounded-lg border border-white/10 bg-black/24 p-3 text-xs font-medium leading-5 text-white/58">
        <FanletterSetupStatusNote
          defaultText={startLabels.flowBody}
          locale={locale}
        />
      </p>
    </div>
  );

  return (
    <FanletterSetupStatusProvider>
      <FanletterShell
        actions={
          <FanletterSetupHeroActions
            activateHref={activateHref}
            connectHref={connectHref}
            createHref={createHref}
            locale={locale}
            onboardingHref={onboardingHref}
            profileHref={profileHref}
            studioHref={studioHref}
            surface="dark"
            variant="start"
          />
        }
        aside={heroAside}
        description={
          <FanletterSetupHeroDescription
            defaultText={copy.start.body}
            locale={locale}
          />
        }
        eyebrow={copy.start.eyebrow}
        currentSection="start"
        locale={locale}
        referralCode={referralCode}
        title={copy.start.title}
        titleClassName="mt-4 max-w-4xl text-[2.15rem] font-semibold leading-[1.08] tracking-normal text-white [word-break:keep-all] sm:text-[3.35rem] lg:text-[3.7rem]"
      >
      <section className="bg-[#f6f8f4] px-4 py-10 text-black sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div className="rounded-lg border border-black/10 bg-[#07100b] p-5 text-white shadow-[0_22px_60px_rgba(8,18,12,0.18)] sm:p-6 lg:sticky lg:top-6">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
              {startLabels.flowEyebrow}
            </p>
            <h2 className="mt-3 text-[1.85rem] font-semibold leading-[1.12] tracking-normal [word-break:keep-all] sm:text-[2.15rem]">
              {startLabels.flowTitle}
            </h2>
            <p className="mt-3 max-w-md text-sm font-medium leading-6 text-white/62">
              {startLabels.flowBody}
            </p>
            <FanletterSetupProgressTiles
              items={startProgressItems}
              locale={locale}
            />
            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.055] p-3 text-xs font-medium leading-5 text-white/58">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#44f26e]">
                {startLabels.stepStatus}
              </p>
              <p className="mt-2">
                <FanletterSetupStatusNote
                  defaultText={startLabels.flowBody}
                  locale={locale}
                />
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5">
                <p className="text-xl font-semibold leading-none">
                  {copy.start.steps.length}
                </p>
                <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white/48">
                  {startLabels.readyLabel}
                </p>
              </div>
              <Link
                className="rounded-lg border border-[#44f26e] bg-[#44f26e] px-3 py-2.5 text-black transition hover:bg-[#67ff88]"
                href={onboardingHref}
              >
                <p className="text-xl font-semibold leading-none">→</p>
                <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-black/58">
                  {copy.actions.start}
                </p>
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            {copy.start.steps.map((step, index) => {
              const Icon = startIcons[index] ?? Sparkles;

              return (
                <FanletterSetupStepNavLink
                  activateHref={activateHref}
                  className="group block rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_42px_rgba(8,18,12,0.06)] transition hover:-translate-y-0.5 hover:border-[#44f26e]/70 hover:shadow-[0_24px_52px_rgba(8,18,12,0.1)] sm:p-5"
                  connectHref={connectHref}
                  createHref={createHref}
                  key={step.title}
                  locale={locale}
                  onboardingHref={onboardingHref}
                  profileHref={profileHref}
                  stepIndex={index}
                  studioHref={studioHref}
                >
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                        <Icon className="size-6" />
                      </span>
                      {index < copy.start.steps.length - 1 ? (
                        <span className="mt-3 hidden h-12 w-px bg-black/10 sm:block" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-black px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="rounded-full bg-black/5 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-black/46">
                          {startLabels.stepMeta[index]}
                        </span>
                        {index <= 2 ? (
                          <FanletterSetupStepBadge
                            locale={locale}
                            stepIndex={index}
                          />
                        ) : null}
                      </div>
                      <FanletterSetupStepText
                        body={step.body}
                        locale={locale}
                        stepIndex={index}
                        title={step.title}
                      />
                    </div>
                    <ArrowRight className="mt-3 size-5 shrink-0 text-black/24 transition group-hover:translate-x-1 group-hover:text-black" />
                  </div>
                </FanletterSetupStepNavLink>
              );
            })}
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-3 sm:flex-row lg:justify-end">
          <FanletterSetupHeroActions
            activateHref={activateHref}
            connectHref={connectHref}
            createHref={createHref}
            locale={locale}
            onboardingHref={onboardingHref}
            profileHref={profileHref}
            studioHref={studioHref}
            surface="light"
            variant="start"
          />
        </div>
      </section>
      </FanletterShell>
    </FanletterSetupStatusProvider>
  );
}
