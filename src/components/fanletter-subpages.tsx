import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clapperboard,
  CheckCircle2,
  Grid2X2,
  Heart,
  ImageIcon,
  LockKeyhole,
  MessageCircle,
  MessageCircleHeart,
  PenLine,
  PlayCircle,
  Rocket,
  Share2,
  Sparkles,
  User,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import type {
  FanletterCreatorPageData,
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
    continue: string;
    creatorStudio: string;
    existingDetail: string;
    feed: string;
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
    continue: "계속 진행",
    creatorStudio: "브이로그 스튜디오",
    existingDetail: "지갑 연결 상세로 이동",
    feed: "브이로그 피드",
    home: "홈",
    openContent: "브이로그 보기",
    start: "채널 시작",
  },
  content: {
    body: "브이로그 본문",
    lockedBody: "전체 브이로그는 기존 상세 화면에서 권한 확인 후 열람할 수 있습니다.",
    lockedDescription:
      "결제, 지갑 연결, 회원 권한 확인은 기존 상세 API와 화면을 그대로 사용합니다.",
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
    characterImageSignal: "이미지 브이로그",
    characterLatest: "최근 브이로그",
    characterPublicSignal: "공개 브이로그",
    characterTitle: "AI 캐릭터 채널",
    characterTraits: "캐릭터 키워드",
    characterVideoSignal: "동영상 브이로그",
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
    featured: "추천 브이로그",
    freePublic: "무료 공개",
    latest: "최신 브이로그",
    suggestedCreators: "추천 캐릭터",
    title: "AI 캐릭터의 공개 숏폼 브이로그를 FanLetter 흐름 안에서 둘러보세요.",
    trending: "인기 브이로그",
    videos: "동영상 브이로그",
  },
  languageLabel: "언어",
  metrics: {
    comments: "댓글",
    likes: "좋아요",
    saves: "저장",
  },
  start: {
    body: "가입, AI 캐릭터 설정, 첫 숏폼 브이로그 생성, 게시와 판매까지 기존 기능을 FanLetter 흐름 안에서 이어갑니다.",
    eyebrow: "Start FanLetter",
    steps: [
      {
        body: "가입을 완료하고 표시 이름, 캐릭터 페르소나, 아바타를 정리해 같은 브이로그 캐릭터가 유지되게 준비합니다.",
        title: "AI 캐릭터 준비",
      },
      {
        body: "오늘의 셀피, 외출, 루틴, 대화 장면을 이미지 또는 동영상 브이로그로 만듭니다.",
        title: "첫 브이로그 생성",
      },
      {
        body: "FanLetter 브이로그 피드와 공유 링크로 팬에게 보여주고 유료 커뮤니티 흐름으로 이어갑니다.",
        title: "게시와 수익화",
      },
    ],
    title: "처음 시작하는 사람도 AI 캐릭터 브이로그 채널을 바로 따라갈 수 있게 정리했습니다.",
  },
};

const enCopy: FanletterSubpageCopy = {
  actions: {
    continue: "Continue",
    creatorStudio: "Vlog Studio",
    existingDetail: "Open wallet detail",
    feed: "Vlog Feed",
    home: "Home",
    openContent: "View vlog",
    start: "Start channel",
  },
  content: {
    body: "Vlog body",
    lockedBody: "Open the existing detail view to verify access and view the full vlog.",
    lockedDescription:
      "Payments, wallet connection, and access checks keep using the existing content detail APIs and flow.",
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
    characterImageSignal: "Image vlogs",
    characterLatest: "Latest vlog",
    characterPublicSignal: "Public vlogs",
    characterTitle: "AI character channel",
    characterTraits: "Character keywords",
    characterVideoSignal: "Video vlogs",
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
    featured: "Featured vlog",
    freePublic: "Free public",
    latest: "Latest vlogs",
    suggestedCreators: "Suggested characters",
    title: "Browse public short-form vlogs from AI characters inside FanLetter.",
    trending: "Popular vlogs",
    videos: "Video vlogs",
  },
  languageLabel: "Language",
  metrics: {
    comments: "comments",
    likes: "likes",
    saves: "saves",
  },
  start: {
    body: "Signup, AI character setup, first short-form vlog creation, publishing, and sales continue through the existing product flow.",
    eyebrow: "Start FanLetter",
    steps: [
      {
        body: "Complete signup and prepare display name, character persona, and avatar so the same vlogger stays consistent.",
        title: "Prepare AI character",
      },
      {
        body: "Create today's selfie, routine, outing, or dialogue scene as an image or video vlog.",
        title: "Create first vlog",
      },
      {
        body: "Publish to the FanLetter vlog feed and connect fans to paid community flows.",
        title: "Publish and monetise",
      },
    ],
    title: "A simple path to start an AI character vlogger channel.",
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

function getContentEngagementScore(item: FanletterPublicContentItem) {
  return (
    item.social.likeCount * 3 +
    item.social.saveCount * 2 +
    item.social.commentCount * 4
  );
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
}: {
  actions?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  description?: string;
  eyebrow: string;
  locale: Locale;
  referralCode: string | null;
  title: string;
}) {
  const copy = getCopy(locale);
  const homeHref = buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const feedHref = buildPathWithReferral(`/${locale}/fanletter/feed`, referralCode);
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
              <Link href={studioHref}>{copy.actions.creatorStudio}</Link>
              <Link href={startHref}>{copy.actions.start}</Link>
            </nav>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <LanguageSwitcher label={copy.languageLabel} locale={locale} />
              </div>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/16 px-4 text-sm font-semibold !text-white transition hover:border-white/36"
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
              <h1 className="mt-4 max-w-5xl text-[2.65rem] font-semibold leading-[0.98] tracking-normal text-white [word-break:keep-all] sm:text-[4.7rem]">
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
      <video
        autoPlay
        className="h-full w-full object-cover"
        controls={controls}
        loop
        muted
        playsInline
        poster={imageUrl ?? undefined}
        preload="metadata"
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

  const Icon = mediaType === "image" ? ImageIcon : Clapperboard;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(145deg,#07100b,#101820_54%,#1b2b20)] text-white/74">
      <Icon className="size-14 text-[#44f26e]" />
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
}: {
  item: FanletterPublicContentItem;
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const href = getContentHref({ item, locale, referralCode });
  const creatorHref = getCreatorHref({ item, locale, referralCode });

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-black/10 bg-white text-black shadow-[0_18px_44px_rgba(8,18,12,0.12)]">
      <Link className="block" href={href}>
        <div className="relative aspect-[9/14] overflow-hidden bg-[#07100b]">
          {item.coverImageUrl ? (
            <Image
              alt={item.title}
              className="object-cover"
              fill
              sizes="(max-width: 640px) 76vw, (max-width: 1024px) 32vw, 22vw"
              src={item.coverImageUrl}
            />
          ) : (
            <MediaCard
              alt={item.title}
              imageUrl={null}
              mediaType={item.mediaType}
              title={item.title}
              videoUrl={item.primaryVideoUrl}
              controls={false}
            />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.18)_45%,rgba(0,0,0,0.76)_100%)]" />
          <span className="absolute left-3 top-3 inline-flex rounded-full bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-black">
            {item.mediaType === "video" ? "Video" : copy.content.public}
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
  items,
  locale,
  referralCode,
}: {
  empty: string;
  items: FanletterPublicContentItem[];
  locale: Locale;
  referralCode: string | null;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-black/10 bg-white p-6 text-sm font-semibold text-black/58">
        {empty}
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
            <video
              aria-hidden="true"
              autoPlay
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              loop
              muted
              playsInline
              poster={item.coverImageUrl ?? undefined}
              preload="metadata"
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
      className="flex min-w-[13rem] snap-start items-center gap-3 rounded-lg border border-black/10 bg-white p-3 text-black shadow-[0_14px_34px_rgba(8,18,12,0.08)] sm:min-w-0"
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

export function FanletterFeedPage({
  items,
  locale,
  referralCode,
}: {
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
  const videoItems = items.filter((item) => item.mediaType === "video").slice(0, 6);
  const latestItems = [...items]
    .sort(
      (a, b) =>
        new Date(b.publishedAt ?? 0).getTime() -
        new Date(a.publishedAt ?? 0).getTime(),
    )
    .slice(0, 8);
  const creatorItems = Array.from(
    new Map(
      items.map((item) => [
        item.authorReferralCode ?? item.authorName,
        item,
      ]),
    ).values(),
  ).slice(0, 6);
  const feedStats = [
    {
      label: copy.feed.freePublic,
      value: formatNumber(items.length, locale),
    },
    {
      label: copy.feed.videos,
      value: formatNumber(videoItems.length, locale),
    },
    {
      label: copy.feed.suggestedCreators,
      value: formatNumber(creatorItems.length, locale),
    },
  ];

  return (
    <FanletterShell
      description={copy.feed.title}
      eyebrow={copy.feed.eyebrow}
      locale={locale}
      referralCode={referralCode}
      title={locale === "ko" ? "FanLetter AI 캐릭터 브이로그 피드" : "FanLetter AI Character Vlog Feed"}
    >
      <section className="bg-[#f6f8f4] px-4 py-10 text-black sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-[92rem]">
          <div className="mb-8 flex flex-wrap gap-2 pb-1">
            {[copy.feed.trending, copy.feed.latest, copy.feed.videos, copy.feed.freePublic].map(
              (filter, index) => (
                <span
                  className={`inline-flex h-9 shrink-0 snap-start items-center rounded-full border px-4 text-sm font-semibold ${
                    index === 0
                      ? "border-black bg-black text-white"
                      : "border-black/10 bg-white text-black/62"
                  }`}
                  key={filter}
                >
                  {filter}
                </span>
              ),
            )}
          </div>

          {featuredItem ? (
            <div className="mb-10 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:items-stretch">
              <FeaturedFeedCard
                item={featuredItem}
                locale={locale}
                referralCode={referralCode}
              />

              <div className="grid min-w-0 gap-4">
                <div className="rounded-lg border border-black/10 bg-white p-5 shadow-[0_18px_44px_rgba(8,18,12,0.08)]">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#1f7c38]">
                    {locale === "ko" ? "캐릭터 브이로그" : "Character Vlog"}
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold leading-[1.02] tracking-normal [word-break:keep-all]">
                    {copy.feed.title}
                  </h2>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {feedStats.map((stat) => (
                      <div
                        className="rounded-lg border border-black/10 bg-[#f6f8f4] p-3"
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
                    <div className="flex snap-x gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-2 lg:overflow-visible">
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

          {videoItems.length > 0 ? (
            <section className="mb-10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold tracking-normal">
                  {copy.feed.videos}
                </h2>
              </div>
              <div className="flex snap-x gap-4 overflow-x-auto pb-2">
                {videoItems.map((item) => (
                  <div className="min-w-[17rem] snap-start sm:min-w-[20rem]" key={item.contentId}>
                    <ContentCard
                      item={item}
                      locale={locale}
                      referralCode={referralCode}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {latestItems.length > 0 ? (
            <section className="mb-10">
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
                  />
                ))}
              </div>
            </section>
          ) : null}

          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-normal">
              {copy.feed.allContent}
            </h2>
          </div>
          <ContentGrid
            empty={copy.feed.empty}
            items={items}
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
      value: formatNumber(character.imageContentCount, locale),
    },
    {
      label: copy.creator.characterLatest,
      value: character.latestTitle ?? "FanLetter",
    },
  ];

  return (
    <section className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.55fr)]">
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

  return (
    <FanletterShell
      description={data.profile.character?.summary ?? data.profile.intro}
      eyebrow={copy.creator.eyebrow}
      locale={locale}
      referralCode={effectiveReferralCode}
      title={`${data.profile.displayName}${copy.creator.titleSuffix}`}
    >
      <section className="bg-[#f6f8f4] px-4 py-10 text-black sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 rounded-lg border border-black/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar
                imageUrl={data.profile.avatarImageUrl}
                name={data.profile.displayName}
                sizeClassName="size-16"
              />
              <div>
                <p className="text-2xl font-semibold leading-tight">
                  {data.profile.displayName}
                </p>
                <p className="mt-1 text-sm font-semibold text-black/50">
                  {data.profile.referralCode}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-black px-4 py-3 text-white">
              <p className="text-2xl font-semibold leading-none">
                {formatNumber(data.publicContentCount, locale)}
              </p>
              <p className="mt-1 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-white/48">
                {copy.creator.publicPosts}
              </p>
            </div>
          </div>
          {data.profile.character ? (
            <CharacterPersonaShowcase
              character={data.profile.character}
              displayName={data.profile.displayName}
              locale={locale}
              publicContentCount={data.publicContentCount}
            />
          ) : null}
          <ContentGrid
            empty={copy.creator.empty}
            items={data.items}
            locale={locale}
            referralCode={effectiveReferralCode}
          />
        </div>
      </section>
    </FanletterShell>
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
  const currentHref = buildPathWithReferral(
    `/${locale}/fanletter/content/${content.contentId}`,
    effectiveReferralCode,
  );
  const existingDetailHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/content/${content.contentId}`, effectiveReferralCode),
    {
      returnTo: returnToHref ?? currentHref,
    },
  );
  const backHref = returnToHref ?? fallbackBackHref;
  const primaryVideoUrl = content.contentVideoUrls[0] ?? null;
  const primaryImageUrl = content.coverImageUrl ?? content.contentImageUrls[0] ?? null;
  const detailAccessLabel =
    content.priceType === "paid"
      ? `${copy.content.paid} · ${content.priceUsdt ?? "1"} USDT`
      : copy.content.public;

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
              href={buildPathWithReferral(`/${locale}/fanletter`, effectiveReferralCode)}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <MessageCircleHeart className="size-5" />
              </span>
              <span className="truncate text-xl font-semibold tracking-normal">
                FanLetter
              </span>
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/14 px-4 text-sm font-semibold"
              href={existingDetailHref}
            >
              {copy.actions.continue}
            </Link>
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
              </div>
              <div className="border-t border-white/8 p-3">
                <SocialMetrics content={content} locale={locale} />
              </div>
            </section>

            <section className="pb-10">
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
              </div>

              <h1 className="mt-5 text-[2.45rem] font-semibold leading-[1] tracking-normal sm:text-[4.1rem]">
                {content.title}
              </h1>
              <p className="mt-5 text-base font-medium leading-7 text-white/68 sm:text-lg">
                {content.summary}
              </p>

              <div className="mt-7 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <Link
                  className="flex min-w-0 items-center gap-3"
                  href={
                    content.authorReferralCode
                      ? buildPathWithReferral(
                          `/${locale}/fanletter/creator/${content.authorReferralCode}`,
                          effectiveReferralCode,
                        )
                      : fallbackBackHref
                  }
                >
                  <Avatar
                    imageUrl={content.authorAvatarImageUrl}
                    name={content.authorName}
                    sizeClassName="size-12"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">
                      {content.authorName}
                    </p>
                    <p className="text-sm font-medium text-white/48">
                      {content.authorReferralCode ?? "FanLetter"}
                    </p>
                  </div>
                </Link>
                <Link
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold !text-black"
                  href={existingDetailHref}
                >
                  {copy.actions.existingDetail}
                  <ArrowRight className="size-4" />
                </Link>
              </div>

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
                    </div>
                  </div>
                </section>
              ) : null}

              {content.canPubliclyAccess &&
              (content.contentVideoUrls.length > 1 ||
                content.contentImageUrls.length > 0) ? (
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
                    {content.contentImageUrls.map((imageUrl) => (
                      <div
                        className="relative aspect-[9/14] overflow-hidden rounded-lg border border-white/10 bg-black"
                        key={imageUrl}
                      >
                        <Image
                          alt={content.title}
                          className="object-cover"
                          fill
                          sizes="(max-width: 640px) 100vw, 40vw"
                          src={imageUrl}
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
  const labels =
    locale === "ko"
      ? {
          accountState: "기존 회원 세션과 지갑 연결을 그대로 사용합니다.",
          asideBody:
            "처음 방문한 사용자가 AI 캐릭터 브이로그 채널을 바로 시작할 수 있도록 필요한 작업만 순서대로 모았습니다.",
          asideTitle: "오늘 채널 시작하기",
          completeBody:
            "가입, 캐릭터 페르소나, 첫 브이로그까지 끝내면 FanLetter 브이로그 피드와 스튜디오에서 바로 이어서 운영할 수 있습니다.",
          completeTitle: "완료 후 바로 캐릭터 채널 운영으로 이어집니다.",
          description:
            "FanLetter 전용 화면에서 계정 연결, AI 캐릭터 페르소나, 첫 숏폼 브이로그 생성까지 순서대로 진행하세요.",
          eyebrow: "FanLetter Onboarding",
          feedCta: "브이로그 피드 보기",
          helper: "각 단계는 기존 검증 API와 크리에이터 스튜디오 기능을 그대로 사용하면서 FanLetter AI 캐릭터 브이로그 흐름으로 묶습니다.",
          homeCta: "브이로그 스튜디오",
          primary: "계정 연결부터 시작",
          progress: "Launch checklist",
          requiredLabel: "필수",
          secondary: "프로필부터 설정",
          title: "AI 캐릭터 브이로그 채널을 한 화면에서 시작하세요.",
          steps: [
            {
              body: "회원 가입과 지갑 연결 상태를 확인합니다. 완료 후 다시 이 온보딩 화면으로 돌아옵니다.",
              cta: "계정 연결하기",
              href: connectHref,
              Icon: User,
              meta: "01 · Account",
              title: "계정과 지갑 연결",
            },
            {
              body: "표시 이름, 캐릭터 페르소나, AI 아바타를 정리해 같은 브이로그 캐릭터의 첫 인상을 만듭니다.",
              cta: "프로필 설정하기",
              href: profileHref,
              Icon: PenLine,
              meta: "02 · Profile",
              title: "AI 캐릭터 프로필 준비",
            },
            {
              body: "오늘의 셀피, 루틴, 외출, 대화 장면을 이미지나 동영상 브이로그로 만들고 공개 범위와 가격을 정합니다.",
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
            "After signup, character persona, and first vlog, continue directly into the FanLetter vlog feed and studio.",
          completeTitle: "Launch work continues into character channel operation.",
          description:
            "Move through account connection, AI character persona setup, and first short-form vlog creation inside FanLetter.",
          eyebrow: "FanLetter Onboarding",
          feedCta: "View vlog feed",
          helper: "Each step reuses the existing verification APIs and Creator Studio flow inside the FanLetter AI character vlog experience.",
          homeCta: "Vlog studio",
          primary: "Start with account",
          progress: "Launch checklist",
          requiredLabel: "Required",
          secondary: "Set up profile",
          title: "Start an AI character vlogger channel in one guided flow.",
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
              body: "Prepare display name, character persona, and AI avatar so the same vlogger feels consistent.",
              cta: "Set up profile",
              href: profileHref,
              Icon: PenLine,
              meta: "02 · Profile",
              title: "Prepare AI character profile",
            },
            {
              body: "Create today's selfie, routine, outing, or dialogue scene as an image or video vlog, then set visibility and pricing.",
              cta: "Create first vlog",
              href: createHref,
              Icon: Clapperboard,
              meta: "03 · Vlog",
              title: "Create first short-form vlog",
            },
          ],
        };
  const heroAside = (
    <div className="rounded-lg border border-white/12 bg-white/[0.055] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">{labels.asideTitle}</p>
          <p className="mt-1 text-xs font-medium leading-5 text-white/52">
            {labels.asideBody}
          </p>
        </div>
        <span className="rounded-full bg-[#44f26e] px-3 py-1 text-[0.66rem] font-semibold uppercase text-black">
          3 steps
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {labels.steps.map((step, index) => {
          const Icon = step.Icon;

          return (
            <Link
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/34 p-3 transition hover:border-[#44f26e]/54 hover:bg-black/48"
              href={step.href}
              key={step.title}
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
              </span>
              <ArrowRight className="size-4 shrink-0 text-white/42" />
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <FanletterShell
      actions={
        <>
          <Link
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#44f26e] px-6 text-sm font-semibold !text-black transition hover:bg-[#67ff88] sm:w-fit"
            href={connectHref}
          >
            {labels.primary}
          </Link>
          <Link
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/18 bg-white/8 px-6 text-sm font-semibold !text-white transition hover:bg-white/12 sm:w-fit"
            href={profileHref}
          >
            {labels.secondary}
          </Link>
        </>
      }
      aside={heroAside}
      description={labels.description}
      eyebrow={labels.eyebrow}
      locale={locale}
      referralCode={referralCode}
      title={labels.title}
    >
      <section className="bg-[#f6f8f4] px-4 py-10 text-black sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <aside className="rounded-lg border border-black/10 bg-[#07100b] p-5 text-white shadow-[0_22px_60px_rgba(8,18,12,0.18)] sm:p-6 lg:sticky lg:top-6">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
              {labels.progress}
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-[1.02] tracking-normal [word-break:keep-all] sm:text-[2.8rem]">
              {labels.completeTitle}
            </h2>
            <p className="mt-4 text-sm font-medium leading-6 text-white/62">
              {labels.completeBody}
            </p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {labels.steps.map((step, index) => (
                <div
                  className={`rounded-lg border p-3 ${
                    index === 0
                      ? "border-[#44f26e] bg-[#44f26e] text-black"
                      : "border-white/10 bg-white/[0.06] text-white"
                  }`}
                  key={step.meta}
                >
                  <p className="text-xl font-semibold leading-none">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-2 text-[0.56rem] font-semibold uppercase tracking-[0.1em] opacity-70">
                    {step.meta.split("·")[1]?.trim() ?? step.title}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-5 rounded-lg border border-white/10 bg-white/[0.055] p-3 text-xs font-medium leading-5 text-white/58">
              {labels.accountState}
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
                        {index === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f9ed] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#16702e]">
                            <CheckCircle2 className="size-3.5" />
                            {labels.requiredLabel}
                          </span>
                        ) : null}
                      </div>
                      <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-normal">
                        {step.title}
                      </h2>
                      <p className="mt-2 text-sm font-medium leading-6 text-black/58">
                        {step.body}
                      </p>
                    </div>
                    <Link
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-black/82 sm:w-fit"
                      href={step.href}
                    >
                      {step.cta}
                      <ArrowRight className="size-4" />
                    </Link>
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
            className="flex min-h-[9rem] items-end justify-between gap-4 rounded-lg border border-black/10 bg-[#07100b] p-5 text-white shadow-[0_18px_42px_rgba(8,18,12,0.14)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(8,18,12,0.18)]"
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
  const startLabels =
    locale === "ko"
      ? {
          flowEyebrow: "Quick setup",
          flowTitle: "3단계만 끝내면 AI 캐릭터 브이로그 채널을 바로 시작할 수 있습니다.",
          primary: "가입하고 채널 시작",
          secondary: "프로필 설정하기",
          previewTitle: "오늘 할 일",
          previewBody: "처음 방문한 사용자도 순서대로 따라가면 됩니다.",
          nextLabel: "다음 단계",
          readyLabel: "시작 준비",
          readyValue: "3 steps",
          stepMeta: ["계정 확인", "캐릭터 준비", "첫 브이로그"],
        }
      : {
          flowEyebrow: "Quick setup",
          flowTitle: "Complete three steps to start an AI character vlogger channel.",
          primary: "Start channel with signup",
          secondary: "Set up profile",
          previewTitle: "Today’s path",
          previewBody: "New creators can follow the flow in order.",
          nextLabel: "Next step",
          readyLabel: "Ready path",
          readyValue: "3 steps",
          stepMeta: ["Account check", "Character setup", "First vlog"],
        };
  const startIcons = [User, Sparkles, WalletCards] as const;
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
      <div className="mt-5 space-y-3">
        {copy.start.steps.map((step, index) => {
          const Icon = startIcons[index] ?? Sparkles;

          return (
            <div
              className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/34 p-3"
              key={step.title}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {step.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <FanletterShell
      actions={
        <>
          <Link
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#44f26e] px-6 text-sm font-semibold !text-black transition hover:bg-[#67ff88] sm:w-fit"
            href={onboardingHref}
          >
            {startLabels.primary}
          </Link>
          <Link
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/18 bg-white/8 px-6 text-sm font-semibold !text-white transition hover:bg-white/12 sm:w-fit"
            href={profileHref}
          >
            {startLabels.secondary}
          </Link>
        </>
      }
      aside={heroAside}
      description={copy.start.body}
      eyebrow={copy.start.eyebrow}
      locale={locale}
      referralCode={referralCode}
      title={copy.start.title}
    >
      <section className="bg-[#f6f8f4] px-4 py-10 text-black sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div className="rounded-lg border border-black/10 bg-[#07100b] p-5 text-white shadow-[0_22px_60px_rgba(8,18,12,0.18)] sm:p-6 lg:sticky lg:top-6">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
              {startLabels.flowEyebrow}
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-[1.02] tracking-normal [word-break:keep-all] sm:text-[2.8rem]">
              {startLabels.flowTitle}
            </h2>
            <p className="mt-4 text-sm font-medium leading-6 text-white/62">
              {copy.start.body}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.06] p-3">
                <p className="text-2xl font-semibold leading-none">
                  {copy.start.steps.length}
                </p>
                <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white/48">
                  {startLabels.readyLabel}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#44f26e] p-3 text-black">
                <p className="text-2xl font-semibold leading-none">01</p>
                <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-black/58">
                  {startLabels.nextLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
          {copy.start.steps.map((step, index) => {
            const Icon = startIcons[index] ?? Sparkles;

            return (
              <article
                className="rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_42px_rgba(8,18,12,0.06)] sm:p-5"
                key={step.title}
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
                    </div>
                    <p className="mt-4 text-2xl font-semibold leading-tight">
                      {step.title}
                    </p>
                    <p className="mt-3 text-sm font-medium leading-6 text-black/58">
                      {step.body}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-3 sm:flex-row lg:justify-end">
          <Link
            className="inline-flex h-12 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold !text-white transition hover:bg-black/82 sm:min-w-[12rem]"
            href={onboardingHref}
          >
            {startLabels.primary}
          </Link>
          <Link
            className="inline-flex h-12 items-center justify-center rounded-full border border-black/12 bg-white px-5 text-sm font-semibold !text-black transition hover:bg-black/[0.03] sm:min-w-[12rem]"
            href={profileHref}
          >
            {startLabels.secondary}
          </Link>
        </div>
      </section>
    </FanletterShell>
  );
}
