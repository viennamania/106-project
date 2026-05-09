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
  User,
  Video,
} from "lucide-react";
import type { ReactNode } from "react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { FanletterAutoplayVideo } from "@/components/fanletter-autoplay-video";
import { FanletterFanRequestForm } from "@/components/fanletter-fan-request-form";
import { FanletterFollowButton } from "@/components/fanletter-follow-button";
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
import { LanguageSwitcher } from "@/components/language-switcher";
import type {
  FanletterCreatorPageData,
  FanletterFeedFilters,
  FanletterFeedSort,
  FanletterPublicCharacter,
  FanletterPublicContentDetail,
  FanletterPublicContentItem,
} from "@/lib/fanletter-content-service";
import type { Locale } from "@/lib/i18n";
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
  languageLabel: string;
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

const koCopy: FanletterSubpageCopy = {
  actions: {
    creatorChannel: "캐릭터 채널 보기",
    creatorStudio: "브이로그 스튜디오",
    existingDetail: "FanLetter에서 권한 확인",
    feed: "브이로그 피드",
    following: "팔로잉",
    home: "홈",
    openContent: "브이로그 보기",
    start: "채널 시작",
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
    eyebrow: "AI Character Channel",
    publicPosts: "공개 브이로그",
    stage: "Stage",
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
  languageLabel: "언어",
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
        body: "회원 세션과 지갑 연결 상태를 확인합니다. 완료 후 캐릭터 준비로 이어집니다.",
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
    start: "Start channel",
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
  languageLabel: "Language",
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
        body: "Confirm the member session and wallet connection, then continue into character setup.",
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
  if (label?.trim()) {
    return label;
  }

  if (expression === "smile") {
    return locale === "ko" ? "미소" : "Smile";
  }

  if (expression === "serious") {
    return locale === "ko" ? "차분함" : "Calm";
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
  description,
  eyebrow,
  locale,
  referralCode,
  title,
  titleClassName,
}: {
  actions?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  eyebrow: string;
  locale: Locale;
  referralCode: string | null;
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
  const startHref = buildPathWithReferral(`/${locale}/fanletter/start`, referralCode);
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );

  return (
    <main className="min-h-screen bg-[#030504] text-white">
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

            <nav className="hidden items-center gap-7 text-sm font-semibold text-white/74 md:flex">
              <Link href={homeHref}>{copy.actions.home}</Link>
              <Link href={feedHref}>{copy.actions.feed}</Link>
              <Link href={followingHref}>{copy.actions.following}</Link>
              <Link href={studioHref}>{copy.actions.creatorStudio}</Link>
              <Link href={startHref}>{copy.actions.start}</Link>
            </nav>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <LanguageSwitcher label={copy.languageLabel} locale={locale} />
              </div>
              <FanletterAccountStatusLink
                locale={locale}
                referralCode={referralCode}
              />
              <Link
                className="hidden h-10 items-center justify-center rounded-full border border-white/16 px-4 text-sm font-semibold !text-white transition hover:border-white/36 lg:inline-flex"
                href={startHref}
              >
                {copy.actions.start}
              </Link>
            </div>
          </header>

          <div
            className={`pt-14 sm:pt-24 ${
              aside
                ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,25rem)] lg:items-end"
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
  controls = true,
  imageUrl,
  mediaType,
  title,
  videoUrl,
}: {
  alt: string;
  controls?: boolean;
  imageUrl: string | null;
  mediaType: FanletterPublicContentItem["mediaType"];
  title: string;
  videoUrl: string | null;
}) {
  if (videoUrl) {
    return (
      <FanletterAutoplayVideo
        className="h-full w-full object-cover"
        controls={controls}
        poster={imageUrl ?? undefined}
        src={videoUrl}
        title={title}
      />
    );
  }

  if (imageUrl) {
    return (
      <Image
        alt={alt}
        className="object-cover"
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        src={imageUrl}
      />
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
  item,
  locale,
  referralCode,
  showVideoPreview = false,
}: {
  item: FanletterPublicContentItem;
  locale: Locale;
  referralCode: string | null;
  showVideoPreview?: boolean;
}) {
  const copy = getCopy(locale);
  const href = getContentHref({ item, locale, referralCode });
  const creatorHref = getCreatorHref({ item, locale, referralCode });

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-black/10 bg-white text-black shadow-[0_18px_44px_rgba(8,18,12,0.12)]">
      <Link className="block" href={href}>
        <div className="relative aspect-[9/14] overflow-hidden bg-[#07100b]">
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
          <span className="absolute left-3 top-3 inline-flex rounded-full bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-black">
            Video
          </span>
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
            <Avatar
              imageUrl={item.authorAvatarImageUrl}
              name={item.authorName}
              sizeClassName="size-8"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {item.authorName}
              </p>
              <p className="text-xs font-medium text-white/62">
                {formatDate(item.publishedAt, locale) ?? "FanLetter"}
              </p>
            </div>
          </div>
        </div>
      </Link>

      <div className="p-4">
        <h2 className="break-words text-xl font-semibold leading-tight tracking-normal [overflow-wrap:anywhere]">
          {item.title}
        </h2>
        <p className="mt-2 min-h-[4.5rem] break-words text-sm font-medium leading-6 text-black/58 [overflow-wrap:anywhere]">
          {item.summary}
        </p>
        <FanletterSocialActions
          commentsHref={`${href}#fanletter-comments`}
          contentId={item.contentId}
          initialSocial={item.social}
          locale={locale}
          shareHref={href}
          summary={item.summary}
          title={item.title}
          variant="compact"
        />
        <div className="mt-4 flex items-center justify-between gap-2">
          {creatorHref ? (
            <Link
              className="inline-flex h-9 min-w-0 items-center gap-2 rounded-lg border border-black/10 px-3 text-xs font-semibold text-black/62"
              href={creatorHref}
            >
              <User className="size-3.5 shrink-0" />
              <span className="truncate">{item.authorName}</span>
            </Link>
          ) : (
            <span />
          )}
          <Link
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-black px-3 text-xs font-semibold !text-white"
            href={href}
          >
            {copy.actions.openContent}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function ContentGrid({
  empty,
  emptyActionHref,
  emptyActionLabel,
  items,
  locale,
  referralCode,
  showVideoPreview = false,
}: {
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <ContentCard
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
  item,
  locale,
  referralCode,
}: {
  item: FanletterPublicContentItem;
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const href = getContentHref({ item, locale, referralCode });
  const creatorHref = getCreatorHref({ item, locale, referralCode });
  const publishedAt = formatDate(item.publishedAt, locale);
  const engagementScore = getContentEngagementScore(item);

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
              alt={item.title}
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
              fill
              sizes="(max-width: 1024px) 100vw, 46vw"
              src={item.coverImageUrl}
            />
          ) : (
            <MediaCard
              alt={item.title}
              imageUrl={null}
              mediaType={item.mediaType}
              title={item.title}
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
              {item.title}
            </h2>
            <p className="mt-3 line-clamp-3 max-w-2xl break-words text-sm font-medium leading-6 text-white/72 [overflow-wrap:anywhere] sm:text-base sm:leading-7">
              {item.summary}
            </p>
            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar
                  imageUrl={item.authorAvatarImageUrl}
                  name={item.authorName}
                  sizeClassName="size-9"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {item.authorName}
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
            {item.authorName}
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

  return (
    <Link
      className="flex min-w-[11.75rem] max-w-[82vw] snap-start items-center gap-3 rounded-lg border border-black/10 bg-white p-3 text-black shadow-[0_14px_34px_rgba(8,18,12,0.08)] sm:min-w-0 sm:max-w-none"
      href={href}
    >
      <Avatar
        imageUrl={item.authorAvatarImageUrl}
        name={item.authorName}
        sizeClassName="size-12"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{item.authorName}</p>
        <p className="mt-1 truncate text-xs font-medium text-black/48">
          {item.title}
        </p>
      </div>
    </Link>
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
          body: "좋아요, 댓글, 저장 반응이 높은 캐릭터를 먼저 보여줍니다.",
          cta: "채널 보기",
          eyebrow: "Character Ranking",
          latest: "최근 브이로그",
          publicPosts: "공개",
          reactions: "반응",
          title: "인기 AI 캐릭터 랭킹",
          videos: "영상",
        }
      : {
          body: "Characters with stronger likes, comments, and saves surface first.",
          cta: "View channel",
          eyebrow: "Character Ranking",
          latest: "Latest vlog",
          publicPosts: "Public",
          reactions: "Reactions",
          title: "Popular AI character ranking",
          videos: "Videos",
        };

  return (
    <section className="mb-10 scroll-mt-6" id="popular-characters">
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

      <div className="grid gap-3 lg:grid-cols-5">
        {rankedCreators.map((creator, index) => {
          const isLeader = index === 0;
          const href = creator.authorReferralCode
            ? buildPathWithReferral(
                `/${locale}/fanletter/creator/${creator.authorReferralCode}`,
                referralCode ?? creator.authorReferralCode,
              )
            : buildPathWithReferral(
                `/${locale}/fanletter/content/${creator.latestContentId}`,
                referralCode,
              );
          const metrics = [
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
          ];

          return (
            <Link
              className={`group flex min-h-[18rem] flex-col rounded-lg border p-4 transition ${
                isLeader
                  ? "border-[#44f26e]/34 bg-[#07100b] !text-white shadow-[0_22px_64px_rgba(8,18,12,0.22)] hover:border-[#44f26e]/60"
                  : "border-black/10 bg-white text-black shadow-[0_14px_34px_rgba(8,18,12,0.08)] hover:border-[#29d85f]/60"
              }`}
              href={href}
              key={creator.key}
            >
              <div className="flex items-start justify-between gap-3">
                <Avatar
                  imageUrl={creator.authorAvatarImageUrl}
                  name={creator.authorName}
                  sizeClassName="size-12"
                />
                <span
                  className={`inline-flex h-8 shrink-0 items-center rounded-full px-3 text-xs font-semibold ${
                    isLeader
                      ? "bg-[#44f26e] text-black"
                      : "border border-black/10 bg-[#f6f8f4] text-black/62"
                  }`}
                >
                  #{String(index + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="mt-4 min-w-0">
                <h3 className="truncate text-xl font-semibold tracking-normal">
                  {creator.authorName}
                </h3>
                <p
                  className={`mt-1 text-xs font-semibold ${
                    isLeader ? "text-[#44f26e]" : "text-[#1f7c38]"
                  }`}
                >
                  {creator.authorReferralCode ?? "FanLetter"}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {metrics.map((metric) => (
                  <div
                    className={`rounded-lg border p-2 ${
                      isLeader
                        ? "border-white/10 bg-white/[0.055]"
                        : "border-black/10 bg-[#f6f8f4]"
                    }`}
                    key={metric.label}
                  >
                    <p className="text-lg font-semibold leading-none">
                      {metric.value}
                    </p>
                    <p
                      className={`mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.1em] ${
                        isLeader ? "text-white/42" : "text-black/42"
                      }`}
                    >
                      {metric.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-5">
                <p
                  className={`text-[0.66rem] font-semibold uppercase tracking-[0.16em] ${
                    isLeader ? "text-white/40" : "text-black/42"
                  }`}
                >
                  {labels.latest}
                </p>
                <p
                  className={`mt-2 line-clamp-2 break-words text-sm font-semibold leading-5 [overflow-wrap:anywhere] ${
                    isLeader ? "text-white/72" : "text-black/62"
                  }`}
                >
                  {creator.latestTitle}
                </p>
                <span
                  className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold ${
                    isLeader ? "text-[#44f26e]" : "text-black"
                  }`}
                >
                  {labels.cta}
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          );
        })}
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
  featuredItem,
  locale,
  publicContentCount,
  referralCode,
}: {
  channelAvatarUrl: string | null;
  channelName: string;
  character: FanletterPublicCharacter | null;
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
          freeWall: "무료 공개 피드",
          latest: "대표 브이로그",
          paidReady: "팬 전용 준비 중",
        }
      : {
          aiCreator: "AI character",
          freeWall: "Free public feed",
          latest: "Featured vlog",
          paidReady: "Fan-only coming soon",
        };
  const heroTitle = featuredItem?.title ?? character?.latestTitle ?? copy.creator.empty;
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
            {labels.paidReady}
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
  feedHref,
  followHref,
  locale,
  startHref,
}: {
  creatorReferralCode: string;
  feedHref: string;
  followHref: string;
  locale: Locale;
  startHref: string;
}) {
  const labels =
    locale === "ko"
      ? {
          body: "공개 브이로그는 바로 둘러보고, 더 깊은 팬 전용 흐름은 같은 캐릭터 채널 안에서 이어가도록 정리했습니다.",
          create: "내 캐릭터 만들기",
          freeBody: "가입 전에도 공개 브이로그와 캐릭터 분위기를 먼저 확인합니다.",
          freeTitle: "무료 공개 보기",
          messageBody: "댓글과 메시지는 FanLetter 안에서 이어질 수 있게 권한 확인으로 연결합니다.",
          messageTitle: "팬 대화 흐름",
          paidBody: "준비되는 팬 전용 콘텐츠를 같은 캐릭터 채널에서 이어봅니다.",
          paidTitle: "팬 전용 준비 중",
          title: "팬이 바로 이해하는 채널 구조",
          view: "공개 브이로그 보기",
        }
      : {
          body: "Public vlogs are easy to browse, while deeper fan-only flows stay inside the same character channel.",
          create: "Create my character",
          freeBody: "Fans can preview public vlogs and the character mood before signing up.",
          freeTitle: "Free public view",
          messageBody: "Comments and messages stay inside FanLetter through access checks.",
          messageTitle: "Fan conversation flow",
          paidBody: "Upcoming fan-only content can continue inside this character channel.",
          paidTitle: "Fan-only coming soon",
          title: "A channel structure fans understand",
          view: "View public vlogs",
        };
  const accessItems = [
    {
      body: labels.freeBody,
      icon: BellPlus,
      title: labels.freeTitle,
    },
    {
      body: labels.paidBody,
      icon: Crown,
      title: labels.paidTitle,
    },
    {
      body: labels.messageBody,
      icon: MessageCircleHeart,
      title: labels.messageTitle,
    },
  ];

  return (
    <aside className="rounded-lg border border-black/10 bg-white p-5 text-black shadow-[0_18px_44px_rgba(8,18,12,0.1)] sm:p-6">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#1f7c38]">
        Fan Access
      </p>
      <h2 className="mt-3 text-[1.9rem] font-semibold leading-[1.05] tracking-normal [word-break:keep-all]">
        {labels.title}
      </h2>
      <p className="mt-3 text-sm font-medium leading-6 text-black/58">
        {labels.body}
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
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-sm font-medium leading-5 text-black/52">
                  {item.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <FanletterFollowButton
          creatorReferralCode={creatorReferralCode}
          fallbackHref={followHref}
          locale={locale}
          theme="dark"
        />
        <Link
          className="inline-flex h-11 items-center justify-center rounded-full border border-black/12 px-4 text-sm font-semibold text-black transition hover:border-black/28"
          href={feedHref}
        >
          {labels.view}
        </Link>
      </div>
      <Link
        className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-full border border-black/12 px-4 text-sm font-semibold text-black transition hover:border-black/28"
        href={startHref}
      >
        {labels.create}
      </Link>
    </aside>
  );
}

function FanletterChannelTabs({
  channelHref,
  locale,
  publicContentCount,
}: {
  channelHref: string;
  locale: Locale;
  publicContentCount: number;
}) {
  const labels =
    locale === "ko"
      ? {
          about: "소개",
          fanOnly: "팬 전용",
          fanRequests: "요청",
          home: "홈",
          publicVlogs: "공개 브이로그",
        }
      : {
          about: "About",
          fanOnly: "Fan-only",
          fanRequests: "Requests",
          home: "Home",
          publicVlogs: "Public vlogs",
        };
  const tabs = [
    { href: `${channelHref}#channel-home`, label: labels.home },
    {
      href: `${channelHref}#public-vlogs`,
      label: `${labels.publicVlogs} ${formatNumber(publicContentCount, locale)}`,
    },
    { href: `${channelHref}#fan-requests`, label: labels.fanRequests },
    { href: `${channelHref}#fan-only`, label: labels.fanOnly },
    { href: `${channelHref}#about`, label: labels.about },
  ];

  return (
    <nav
      aria-label={locale === "ko" ? "캐릭터 채널 섹션" : "Character channel sections"}
      className="sticky top-0 z-20 -mx-4 mb-8 border-b border-black/10 bg-[#f6f8f4]/94 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div className="mx-auto flex max-w-[92rem] gap-2 overflow-x-auto [scrollbar-width:none]">
        {tabs.map((tab, index) => (
          <Link
            className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
              index === 0
                ? "bg-black !text-white"
                : "border border-black/10 bg-white text-black/62 hover:border-[#29d85f]/60 hover:text-black"
            }`}
            href={tab.href}
            key={tab.href}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function FanletterFollowCta({
  creatorReferralCode,
  fanOnlyHref,
  followHref,
  locale,
}: {
  creatorReferralCode: string;
  fanOnlyHref: string;
  followHref: string;
  locale: Locale;
}) {
  const labels =
    locale === "ko"
      ? {
          fanOnly: "팬 전용 보기",
        }
      : {
          fanOnly: "View fan-only",
        };

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
  followHref,
  locale,
}: {
  channelName: string;
  followHref: string;
  locale: Locale;
}) {
  const labels =
    locale === "ko"
      ? {
          body: "아직 실제 구독 결제 기능은 열지 않고, 캐릭터 채널 안에서 팬 전용 콘텐츠가 어디에 붙을지 먼저 보여줍니다.",
          cta: "오픈 알림 받기",
          eyebrow: "Fan-only Preview",
          locked: "준비 중",
          title: "팬 전용 브이로그 공간",
        }
      : {
          body: "Paid subscription is not open yet. This shows where fan-only character content can live inside the channel.",
          cta: "Get launch updates",
          eyebrow: "Fan-only Preview",
          locked: "Coming soon",
          title: "Fan-only vlog space",
        };
  const cards =
    locale === "ko"
      ? [
          {
            body: `${channelName}의 비공개 하루 루틴과 짧은 근황을 모아 보여줍니다.`,
            title: "비공개 루틴",
          },
          {
            body: "댓글보다 더 가까운 팬 메시지와 답장 흐름을 준비합니다.",
            title: "팬 메시지",
          },
          {
            body: "공개 피드에 올리기 전의 미리보기와 제작 노트를 담습니다.",
            title: "선공개 노트",
          },
        ]
      : [
          {
            body: `${channelName}'s private routines and short updates can live here.`,
            title: "Private routine",
          },
          {
            body: "A closer fan message and reply flow can continue here.",
            title: "Fan messages",
          },
          {
            body: "Preview notes before public feed release can be collected here.",
            title: "Early notes",
          },
        ];

  return (
    <section className="mb-8 scroll-mt-24" id="fan-only">
      <div className="rounded-lg bg-[#07100b] p-5 text-white shadow-[0_24px_70px_rgba(8,18,12,0.18)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
              {labels.eyebrow}
            </p>
            <h2 className="mt-3 text-[2rem] font-semibold leading-[1.05] tracking-normal [word-break:keep-all] sm:text-[2.6rem]">
              {labels.title}
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-white/62 sm:text-base sm:leading-7">
              {labels.body}
            </p>
          </div>
          <Link
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
            href={followHref}
          >
            <BellPlus className="size-4" />
            {labels.cta}
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {cards.map((card) => (
            <article
              className="min-h-[12rem] rounded-lg border border-white/10 bg-white/[0.055] p-4"
              key={card.title}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                  <LockKeyhole className="size-5" />
                </span>
                <span className="rounded-full border border-[#44f26e]/22 bg-[#44f26e]/10 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#b9ffc8]">
                  {labels.locked}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-normal">
                {card.title}
              </h3>
              <p className="mt-3 text-sm font-medium leading-6 text-white/56">
                {card.body}
              </p>
            </article>
          ))}
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
  locale,
  requestHref,
  sourceContentId,
  startHref,
}: {
  characterName: string;
  className?: string;
  creatorReferralCode: string | null;
  followHref: string;
  id?: string;
  locale: Locale;
  requestHref: string;
  sourceContentId?: string | null;
  startHref: string;
}) {
  const labels =
    locale === "ko"
      ? {
          body: "좋아요만 누르고 끝나지 않게, 응원 메시지와 다음 브이로그 요청을 FanLetter 흐름으로 이어갑니다.",
          eyebrow: "Fan Request",
          messageBody: "팔로우와 권한 확인을 거쳐 캐릭터 대화 흐름으로 이어집니다.",
          messageCta: "메시지 남기기",
          messageTitle: "응원 메시지",
          requestBody: "보고 싶은 장소, 룩, 상황을 다음 브이로그 요청으로 연결합니다.",
          requestCta: "요청하기",
          requestTitle: "다음 브이로그 요청",
          startBody: "내 AI 캐릭터를 만들고 같은 방식으로 팬 참여를 받을 수 있습니다.",
          startCta: "채널 시작",
          startTitle: "내 캐릭터로 답장",
          title: `${characterName}에게 한마디 남기기`,
        }
      : {
          body: "Move beyond likes by connecting fan messages and next-vlog requests into the FanLetter flow.",
          eyebrow: "Fan Request",
          messageBody: "Follow and access checks lead into the character conversation flow.",
          messageCta: "Leave a message",
          messageTitle: "Support message",
          requestBody: "Turn places, outfits, and scenes fans want to see into next-vlog requests.",
          requestCta: "Request vlog",
          requestTitle: "Next vlog request",
          startBody: "Create your own AI character and collect fan participation the same way.",
          startCta: "Start channel",
          startTitle: "Reply with my character",
          title: `Leave a note for ${characterName}`,
        };
  const actions = [
    {
      body: labels.messageBody,
      cta: labels.messageCta,
      href: followHref,
      icon: MessageCircleHeart,
      title: labels.messageTitle,
    },
    {
      body: labels.requestBody,
      cta: labels.requestCta,
      href: requestHref,
      icon: Clapperboard,
      title: labels.requestTitle,
    },
    {
      body: labels.startBody,
      cta: labels.startCta,
      href: startHref,
      icon: Rocket,
      title: labels.startTitle,
    },
  ];

  return (
    <section
      className={`scroll-mt-24 rounded-lg border border-[#44f26e]/22 bg-[#07100b] p-5 text-white shadow-[0_24px_70px_rgba(8,18,12,0.18)] sm:p-6 ${className}`}
      id={id}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
            {labels.eyebrow}
          </p>
          <h2 className="mt-3 text-[2rem] font-semibold leading-[1.05] tracking-normal [word-break:keep-all] sm:text-[2.55rem]">
            {labels.title}
          </h2>
          <p className="mt-3 text-sm font-medium leading-6 text-white/62 sm:text-base sm:leading-7">
            {labels.body}
          </p>
        </div>
        <Link
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
          href={requestHref}
        >
          <PenLine className="size-4" />
          {labels.requestCta}
        </Link>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
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
              <h3 className="mt-5 text-xl font-semibold tracking-normal">
                {action.title}
              </h3>
              <p className="mt-3 text-sm font-medium leading-6 text-white/56">
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

      {creatorReferralCode ? (
        <FanletterFanRequestForm
          characterName={characterName}
          creatorReferralCode={creatorReferralCode}
          locale={locale}
          sourceContentId={sourceContentId}
        />
      ) : null}
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
            className="object-cover transition duration-500 group-hover:scale-[1.025]"
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
          {item.title}
        </p>
        <p className="mt-2 line-clamp-2 break-words text-sm font-medium leading-5 text-white/54 [overflow-wrap:anywhere]">
          {item.summary}
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
  content,
  locale,
}: {
  content: FanletterPublicContentDetail;
  locale: Locale;
}) {
  const source = content.fanRequestSource;

  if (!source) {
    return null;
  }

  const labels =
    locale === "ko"
      ? {
          eyebrow: "Fan Request",
          message: "팬 메시지 기반",
          requestedBy: "요청",
          title: "팬 요청으로 만든 브이로그",
          vlogRequest: "다음 브이로그 요청 기반",
        }
      : {
          eyebrow: "Fan Request",
          message: "Inspired by a fan message",
          requestedBy: "Request",
          title: "Vlog made from a fan request",
          vlogRequest: "Inspired by a next-vlog request",
        };
  const typeLabel =
    source.requestType === "message" ? labels.message : labels.vlogRequest;

  return (
    <section className="mt-6 rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 p-4 text-white sm:p-5">
      <div className="flex items-start gap-3">
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
          <p className="mt-2 text-sm font-medium leading-6 text-white/66">
            {source.body}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#44f26e]/26 bg-black/22 px-3 py-1 text-xs font-semibold text-[#b9ffc8]">
              {typeLabel}
            </span>
            <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/58">
              {source.requesterDisplayName
                ? `${labels.requestedBy} · ${source.requesterDisplayName}`
                : formatDate(source.createdAt, locale)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function FanletterContentNextActions({
  channelHref,
  feedHref,
  followHref,
  locale,
  startHref,
}: {
  channelHref: string;
  feedHref: string;
  followHref: string;
  locale: Locale;
  startHref: string;
}) {
  const labels =
    locale === "ko"
      ? {
          channelBody: "이 캐릭터의 공개 브이로그와 팬 전용 예정 콘텐츠를 이어봅니다.",
          channelTitle: "캐릭터 채널",
          feedBody: "다른 AI 캐릭터 브이로그를 최신순으로 둘러봅니다.",
          feedTitle: "전체 피드",
          followBody: "FanLetter 온보딩 후 이 캐릭터 흐름으로 다시 돌아옵니다.",
          followTitle: "팔로우/알림",
          open: "열기",
          startBody: "복잡한 설정 없이 내 AI 캐릭터 브이로그 채널을 시작합니다.",
          startTitle: "내 채널 시작",
          title: "다음 행동",
        }
      : {
          channelBody: "Continue into this character's public vlogs and fan-only preview.",
          channelTitle: "Character channel",
          feedBody: "Browse the latest public vlogs from other AI characters.",
          feedTitle: "Full feed",
          followBody: "Complete FanLetter onboarding, then return to this character flow.",
          followTitle: "Follow updates",
          open: "Open",
          startBody: "Start your own AI character vlog channel without complex setup.",
          startTitle: "Start my channel",
          title: "Next actions",
        };
  const actions = [
    {
      body: labels.channelBody,
      href: channelHref,
      icon: User,
      title: labels.channelTitle,
    },
    {
      body: labels.followBody,
      href: followHref,
      icon: BellPlus,
      title: labels.followTitle,
    },
    {
      body: labels.feedBody,
      href: feedHref,
      icon: Grid2X2,
      title: labels.feedTitle,
    },
    {
      body: labels.startBody,
      href: startHref,
      icon: Rocket,
      title: labels.startTitle,
    },
  ];

  return (
    <section className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <h2 className="text-xl font-semibold tracking-normal text-white">
        {labels.title}
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
  creatorActionHref,
  creatorActionLabel,
  detailActionHref,
  detailActionLabel,
  fanRequestHref,
  locale,
  startHref,
}: {
  characterName: string;
  creatorActionHref: string;
  creatorActionLabel: string;
  detailActionHref: string;
  detailActionLabel: string;
  fanRequestHref: string;
  locale: Locale;
  startHref: string;
}) {
  const labels =
    locale === "ko"
      ? {
          body: "시청 후 바로 캐릭터 채널, 다음 장면 요청, 내 채널 시작으로 이어가도록 정리했습니다.",
          creatorBody: `${characterName}의 공개 브이로그와 캐릭터 소개를 계속 봅니다.`,
          open: "이동",
          requestBody: "보고 싶은 룩, 장소, 상황을 다음 브이로그 요청으로 남깁니다.",
          requestTitle: "다음 장면 요청",
          startBody: "복잡한 설정 없이 내 AI 캐릭터 브이로그 채널을 만듭니다.",
          startTitle: "내 채널 시작",
          title: "이 브이로그에서 이어가기",
        }
      : {
          body: "After watching, continue into the character channel, next-scene request, or your own channel setup.",
          creatorBody: `Keep watching ${characterName}'s public vlogs and character intro.`,
          open: "Open",
          requestBody: "Leave the outfit, place, or scene you want to see as a next-vlog request.",
          requestTitle: "Request next scene",
          startBody: "Create your own AI character vlog channel without complex setup.",
          startTitle: "Start my channel",
          title: "Continue from this vlog",
        };
  const actions = [
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
    {
      body: labels.startBody,
      href: startHref,
      icon: Rocket,
      title: labels.startTitle,
    },
  ];

  return (
    <section className="mt-6 rounded-lg border border-[#44f26e]/22 bg-[#07100b] p-4 text-white shadow-[0_20px_58px_rgba(0,0,0,0.24)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
            FanLetter Flow
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal [word-break:keep-all]">
            {labels.title}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-white/58">
            {labels.body}
          </p>
        </div>
        <Link
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
          href={detailActionHref}
        >
          {detailActionLabel}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
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
          helper:
            "제목, 요약, 캐릭터명으로 찾고 반응 데이터 기준으로 피드를 다시 정렬합니다.",
          page: "페이지",
          placeholder: "캐릭터명, 제목, 장면 검색",
          result: "검색 결과",
          search: "검색",
          sort: "정렬",
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
          helper:
            "Find vlogs by title, summary, or character name, then reorder the feed by fan signals.",
          page: "Page",
          placeholder: "Search character, title, or scene",
          result: "Results",
          search: "Search",
          sort: "Sort",
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

  return (
    <section className="mb-8 rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_44px_rgba(8,18,12,0.08)] sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
              <Search className="size-5" />
            </span>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#1f7c38]">
                {labels.result} {formatNumber(filters.totalCount, locale)}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                {labels.title}
              </h2>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-black/58">
            {labels.helper}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-[#f6f8f4] px-3 py-2 text-sm font-semibold text-black/58">
          <SlidersHorizontal className="size-4 text-[#1f7c38]" />
          {labels.page} {formatNumber(filters.page, locale)} /{" "}
          {formatNumber(filters.pageCount, locale)}
        </div>
      </div>

      <form
        action={`/${locale}/fanletter/feed`}
        className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_auto_auto]"
        method="get"
      >
        {referralCode ? <input name="ref" type="hidden" value={referralCode} /> : null}
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
        <label className="min-w-0">
          <span className="sr-only">{labels.sort}</span>
          <select
            className="h-12 w-full rounded-lg border border-black/10 bg-[#f6f8f4] px-4 text-sm font-semibold text-black outline-none transition focus:border-[#29d85f]/70 focus:bg-white"
            defaultValue={filters.sort}
            name="sort"
          >
            {sortOptions.map((option) => (
              <option key={option} value={option}>
                {labels.sortOptions[option]}
              </option>
            ))}
          </select>
        </label>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/82"
          type="submit"
        >
          <Search className="size-4" />
          {labels.search}
        </button>
        <Link
          className="inline-flex h-12 items-center justify-center rounded-lg border border-black/10 px-5 text-sm font-semibold text-black/62 transition hover:border-black/24 hover:text-black"
          href={resetHref}
        >
          {labels.clear}
        </Link>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {sortOptions.map((option) => {
          const isActive = filters.sort === option;

          return (
            <Link
              className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition ${
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
              ? "pointer-events-none border-black/8 text-black/28"
              : "border-black/10 text-black/62 hover:border-black/24 hover:text-black"
          }`}
          href={previousHref}
        >
          {labels.previous}
        </Link>
        <Link
          aria-disabled={filters.page >= filters.pageCount}
          className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
            filters.page >= filters.pageCount
              ? "pointer-events-none border border-black/8 text-black/28"
              : "bg-black text-white hover:bg-black/82"
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
  const latestItems = [...items]
    .sort(
      (a, b) =>
        new Date(b.publishedAt ?? 0).getTime() -
        new Date(a.publishedAt ?? 0).getTime(),
    )
    .filter((item) => !curatedContentIds.has(item.contentId))
    .slice(0, 8);
  const creatorItems = Array.from(
    new Map(
      items.map((item) => [
        item.authorReferralCode ?? item.authorName,
        item,
      ]),
    ).values(),
  ).slice(0, 6);
  const rankedCreatorCount = getRankedCreators(items).length;
  const feedStats = [
    {
      label: copy.feed.freePublic,
      value: formatNumber(filters.totalCount, locale),
    },
    {
      label: copy.feed.videos,
      value: formatNumber(videoCount, locale),
    },
    {
      label: copy.feed.suggestedCreators,
      value: formatNumber(creatorItems.length, locale),
    },
  ];
  const feedHref = getFeedHref({ filters, locale, referralCode });
  const followingHref = buildPathWithReferral(
    `/${locale}/fanletter/following`,
    referralCode,
  );
  const startHref = buildPathWithReferral(
    `/${locale}/fanletter/start`,
    referralCode,
  );
  const sectionLinks = [
    { href: followingHref, label: copy.actions.following },
    featuredItem
      ? { href: `${feedHref}#popular-vlog`, label: copy.feed.trending }
      : null,
    rankedCreatorCount > 0
      ? {
          href: `${feedHref}#popular-characters`,
          label: locale === "ko" ? "캐릭터 랭킹" : "Character ranking",
        }
      : null,
    videoItems.length > 0
      ? { href: `${feedHref}#video-vlogs`, label: copy.feed.videos }
      : null,
    latestItems.length > 0
      ? { href: `${feedHref}#latest-vlogs`, label: copy.feed.latest }
      : null,
    { href: `${feedHref}#all-vlogs`, label: copy.feed.allContent },
  ].filter((link): link is { href: string; label: string } => Boolean(link));

  return (
    <FanletterShell
      description={copy.feed.title}
      eyebrow={copy.feed.eyebrow}
      locale={locale}
      referralCode={referralCode}
      title={locale === "ko" ? "FanLetter AI 캐릭터 브이로그 피드" : "FanLetter AI Character Vlog Feed"}
      titleClassName="mt-4 max-w-5xl text-[2.35rem] font-semibold leading-[1.04] tracking-normal text-white [word-break:keep-all] sm:text-[4.2rem]"
    >
      <section className="overflow-hidden bg-[#f6f8f4] px-4 py-10 text-black sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-[92rem]">
          <nav
            aria-label={locale === "ko" ? "피드 섹션" : "Feed sections"}
            className="mb-8 flex flex-wrap gap-2 pb-1"
          >
            {sectionLinks.map((link) => (
              <Link
                className="inline-flex h-9 shrink-0 snap-start items-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black/70 transition hover:border-[#29d85f]/70 hover:bg-[#effff3] hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29d85f]"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <FanletterFeedDiscoveryControls
            filters={filters}
            locale={locale}
            referralCode={referralCode}
          />

          {featuredItem ? (
            <div
              className="mb-10 grid min-w-0 max-w-full scroll-mt-6 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:items-stretch"
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
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h2 className="text-xl font-semibold">
                        {copy.feed.suggestedCreators}
                      </h2>
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
                  </div>
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
            <section className="mb-10 scroll-mt-6" id="video-vlogs">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold tracking-normal">
                  {copy.feed.videos}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <section className="mb-10 scroll-mt-6" id="latest-vlogs">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold tracking-normal">
                  {copy.feed.latest}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {latestItems.slice(0, 4).map((item) => (
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

          <div
            className="mb-4 flex scroll-mt-6 items-center justify-between gap-3"
            id="all-vlogs"
          >
            <h2 className="text-2xl font-semibold tracking-normal">
              {copy.feed.allContent}
            </h2>
          </div>
          <ContentGrid
            empty={copy.feed.empty}
            emptyActionHref={startHref}
            emptyActionLabel={copy.actions.start}
            items={items}
            locale={locale}
            referralCode={referralCode}
            showVideoPreview
          />
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
  const stageLevel = Math.min(
    4,
    Math.max(1, Math.floor(publicContentCount / 6) + 1),
  );
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
      value: character.latestTitle ?? "FanLetter",
    },
  ];

  return (
    <section
      className="mb-8 grid scroll-mt-24 gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.55fr)]"
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
  const feedHref = buildPathWithReferral(
    `/${locale}/fanletter/feed`,
    effectiveReferralCode,
  );
  const channelHref = buildPathWithReferral(
    `/${locale}/fanletter/creator/${data.profile.referralCode}`,
    effectiveReferralCode,
  );
  const followHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/onboarding`, effectiveReferralCode),
    {
      returnTo: channelHref,
    },
  );
  const fanRequestHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/onboarding`, effectiveReferralCode),
    {
      returnTo: `${channelHref}#fan-requests`,
    },
  );
  const fanOnlyHref = `${channelHref}#fan-only`;
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

  return (
    <FanletterShell
      actions={
        <FanletterFollowCta
          creatorReferralCode={data.profile.referralCode}
          fanOnlyHref={fanOnlyHref}
          followHref={followHref}
          locale={locale}
        />
      }
      aside={
        <FanletterChannelHeroPreview
          channelAvatarUrl={channelAvatarUrl}
          channelName={channelName}
          character={character}
          featuredItem={featuredItem}
          locale={locale}
          publicContentCount={data.publicContentCount}
          referralCode={effectiveReferralCode}
        />
      }
      description={channelSummary}
      eyebrow={copy.creator.eyebrow}
      locale={locale}
      referralCode={effectiveReferralCode}
      title={channelName}
      titleClassName="mt-4 max-w-5xl text-[2.5rem] font-semibold leading-[1.04] tracking-normal text-white [word-break:keep-all] sm:text-[4.6rem]"
    >
      <section className="bg-[#f6f8f4] px-4 py-10 text-black sm:px-6 sm:py-14 lg:px-8">
        <FanletterChannelTabs
          channelHref={channelHref}
          locale={locale}
          publicContentCount={data.publicContentCount}
        />
        <div className="mx-auto max-w-[92rem]">
          <div
            className="mb-8 grid scroll-mt-24 gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(20rem,0.72fr)]"
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
                  href={startHref}
                >
                  {copy.actions.start}
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
                  href={channelHref}
                >
                  {copy.actions.creatorChannel}
                </Link>
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/14 px-4 text-sm font-semibold !text-white transition hover:bg-white/8"
                  href={feedHref}
                >
                  {copy.actions.feed}
                </Link>
              </div>
            </article>

            <FanletterCreatorFanAccessPanel
              creatorReferralCode={data.profile.referralCode}
              feedHref={feedHref}
              followHref={followHref}
              locale={locale}
              startHref={startHref}
            />
          </div>

          {character ? (
            <CharacterPersonaShowcase
              character={character}
              displayName={data.profile.displayName}
              locale={locale}
              publicContentCount={data.publicContentCount}
            />
          ) : null}

          {featuredItem ? (
            <section className="mb-8">
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
            id="fan-requests"
            locale={locale}
            requestHref={fanRequestHref}
            startHref={startHref}
          />

          <FanletterFanOnlyPreview
            channelName={channelName}
            followHref={followHref}
            locale={locale}
          />

          <section className="scroll-mt-24" id="public-vlogs">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#1f7c38]">
                  {copy.creator.characterVideoSignal}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                  {copy.creator.characterLatest}
                </h2>
              </div>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black/70 transition hover:border-black/24 hover:text-black"
                href={feedHref}
              >
                {copy.actions.feed}
              </Link>
            </div>
            <ContentGrid
              empty={copy.creator.empty}
              emptyActionHref={startHref}
              emptyActionLabel={copy.actions.start}
              items={contentItems}
              locale={locale}
              referralCode={effectiveReferralCode}
              showVideoPreview
            />
          </section>
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
  startHref,
}: {
  channelHref: string;
  content: FanletterPublicContentDetail;
  locale: Locale;
  primaryActionHref: string;
  primaryActionLabel: string;
  startHref: string;
}) {
  const copy = getCopy(locale);
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
          aiLabel: "AI 캐릭터",
          fanOnly: "팬 전용 준비 중",
          freeFollow: "무료 공개 채널",
        }
      : {
          aiLabel: "AI character",
          fanOnly: "Fan-only coming soon",
          freeFollow: "Free public channel",
        };
  const stats = [
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
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2">
          <BadgeCheck className="size-4 shrink-0 text-[#44f26e]" />
          <span className="min-w-0 truncate text-xs font-semibold text-white/72">
            {labels.aiLabel}
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
        <Link
          className="inline-flex h-11 items-center justify-center rounded-full border border-white/14 px-4 text-sm font-semibold !text-white transition hover:bg-white/8"
          href={startHref}
        >
          {copy.actions.start}
        </Link>
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
  const creatorHref = content.authorReferralCode
    ? buildPathWithReferral(
        `/${locale}/fanletter/creator/${content.authorReferralCode}`,
        effectiveReferralCode,
      )
    : fallbackBackHref;
  const fanRequestHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/onboarding`, effectiveReferralCode),
    {
      returnTo: `${creatorHref}#fan-requests`,
    },
  );
  const backHref = returnToHref ?? fallbackBackHref;
  const primaryVideoUrl = content.contentVideoUrls[0] ?? null;
  const primaryImageUrl = content.coverImageUrl ?? content.contentImageUrls[0] ?? null;
  const detailAccessLabel =
    content.priceType === "paid"
      ? `${copy.content.paid} · ${content.priceUsdt ?? "1"} USDT`
      : copy.content.public;
  const detailActionHref = content.canPubliclyAccess ? startHref : onboardingHref;
  const detailActionLabel = content.canPubliclyAccess
    ? copy.actions.start
    : copy.actions.existingDetail;
  const creatorActionHref = content.canPubliclyAccess ? creatorHref : onboardingHref;
  const creatorActionLabel = content.canPubliclyAccess
    ? copy.actions.creatorChannel
    : copy.actions.existingDetail;
  const contentCharacterName = content.authorCharacter?.name ?? content.authorName;
  const contentCharacterAvatarUrl =
    content.authorCharacter?.avatarImageSet[0]?.url ??
    content.authorAvatarImageUrl;
  const detailLabels =
    locale === "ko"
      ? {
          character: "캐릭터",
          heroEyebrow: "FanLetter 전용 브이로그",
          watchBadge: "세로 브이로그",
        }
      : {
          character: "Character",
          heroEyebrow: "FanLetter vlog detail",
          watchBadge: "Vertical vlog",
        };

  return (
    <main className="min-h-screen bg-[#030504] text-white">
      <section className="px-4 pb-8 pt-3 sm:px-6 lg:px-8">
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
              <span className="truncate text-xl font-semibold tracking-normal">
                FanLetter
              </span>
            </Link>
            <div className="flex items-center gap-2">
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

          <div className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start lg:pt-12">
            <section className="overflow-hidden rounded-lg border border-white/10 bg-[#07100b] shadow-[0_24px_80px_rgba(0,0,0,0.34)] lg:sticky lg:top-6">
              <div className="relative aspect-[9/14] bg-[#07100b] sm:aspect-[4/5]">
                <MediaCard
                  alt={content.title}
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
              <FanletterDetailWatchPanel
                channelHref={creatorHref}
                characterAvatarUrl={contentCharacterAvatarUrl}
                characterName={contentCharacterName}
                content={content}
                locale={locale}
              />
            </section>

            <section className="pb-10">
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

              <FanletterSocialActions
                contentId={content.contentId}
                initialSocial={content.social}
                locale={locale}
                shareHref={currentHref}
                summary={content.summary}
                title={content.title}
              />

              <FanletterDetailQuickActions
                characterName={contentCharacterName}
                creatorActionHref={creatorActionHref}
                creatorActionLabel={creatorActionLabel}
                detailActionHref={detailActionHref}
                detailActionLabel={detailActionLabel}
                fanRequestHref={fanRequestHref}
                locale={locale}
                startHref={startHref}
              />

              <FanletterFanRequestSourceCard
                content={content}
                locale={locale}
              />

              <FanletterCharacterMiniCard
                channelHref={creatorHref}
                content={content}
                locale={locale}
                primaryActionHref={creatorActionHref}
                primaryActionLabel={creatorActionLabel}
                startHref={startHref}
              />

              <FanletterFanPromptPanel
                characterName={contentCharacterName}
                className="mt-6"
                creatorReferralCode={content.authorReferralCode}
                followHref={onboardingHref}
                locale={locale}
                requestHref={fanRequestHref}
                sourceContentId={content.contentId}
                startHref={startHref}
              />

              {!content.canPubliclyAccess ? (
                <section className="mt-6 rounded-lg border border-[#44f26e]/30 bg-[#44f26e]/10 p-5">
                  <div className="flex items-start gap-3">
                    <LockKeyhole className="mt-1 size-5 shrink-0 text-[#44f26e]" />
                    <div>
                      <h2 className="text-xl font-semibold">
                        {copy.content.lockedTitle}
                      </h2>
                      <p className="mt-2 text-sm font-medium leading-6 text-white/64">
                        {copy.content.lockedDescription}
                      </p>
                      <p className="mt-4 text-sm font-medium leading-6 text-white/78">
                        {copy.content.lockedBody}
                      </p>
                      <Link
                        className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
                        href={onboardingHref}
                      >
                        {copy.actions.existingDetail}
                      </Link>
                    </div>
                  </div>
                </section>
              ) : null}

              {content.canPubliclyAccess &&
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

              <section className="mt-6 rounded-lg border border-white/10 bg-white p-5 text-black sm:p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-black/42">
                  {copy.content.body}
                </p>
                <p className="mt-4 whitespace-pre-wrap break-words text-base font-medium leading-8 text-black/74">
                  {content.body}
                </p>
              </section>

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
                feedHref={fallbackBackHref}
                followHref={onboardingHref}
                locale={locale}
                startHref={startHref}
              />
            </section>
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
          accountState: "기존 회원 세션과 지갑 연결을 그대로 사용합니다.",
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
          helper: "각 단계는 기존 검증 API와 크리에이터 스튜디오 기능을 그대로 사용하면서 FanLetter AI 캐릭터 브이로그 흐름으로 묶습니다.",
          homeCta: "브이로그 스튜디오",
          progress: "빠른 시작",
          readyValue: "3단계",
          title: "AI 캐릭터 브이로그 시작하기",
          steps: [
            {
              body: "회원 가입과 지갑 연결 상태를 확인합니다. 완료 후 다시 이 온보딩 화면으로 돌아옵니다.",
              cta: "계정 연결하기",
              href: connectHref,
              Icon: User,
              meta: "01 · 계정",
              title: "계정과 지갑 연결",
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
          accountState: "This keeps the existing member session and wallet flow.",
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
          helper: "Each step reuses the existing verification APIs and Creator Studio flow inside the FanLetter AI character vlog experience.",
          homeCta: "Vlog studio",
          progress: "Quick start",
          readyValue: "3 steps",
          title: "Start your AI character vlog",
          steps: [
            {
              body: "Confirm membership and wallet connection. After completion, return to this onboarding page.",
              cta: "Connect account",
              href: connectHref,
              Icon: User,
              meta: "01 · Account",
              title: "Connect account and wallet",
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
