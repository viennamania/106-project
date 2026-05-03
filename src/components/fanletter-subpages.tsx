import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clapperboard,
  Grid2X2,
  Heart,
  ImageIcon,
  LockKeyhole,
  MessageCircle,
  MessageCircleHeart,
  PlayCircle,
  Share2,
  Sparkles,
  User,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import type {
  FanletterCreatorPageData,
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
    empty: string;
    eyebrow: string;
    publicPosts: string;
    titleSuffix: string;
  };
  feed: {
    empty: string;
    eyebrow: string;
    title: string;
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
    creatorStudio: "크리에이터 스튜디오",
    existingDetail: "지갑 연결 상세로 이동",
    feed: "피드",
    home: "홈",
    openContent: "콘텐츠 보기",
    start: "시작하기",
  },
  content: {
    body: "본문",
    lockedBody: "전체 콘텐츠는 기존 상세 화면에서 권한 확인 후 열람할 수 있습니다.",
    lockedDescription:
      "결제, 지갑 연결, 회원 권한 확인은 기존 콘텐츠 상세 API와 화면을 그대로 사용합니다.",
    lockedTitle: "권한 확인이 필요한 콘텐츠입니다.",
    media: "콘텐츠 미디어",
    paid: "유료",
    public: "무료 공개",
  },
  creator: {
    empty: "이 크리에이터의 공개 콘텐츠가 준비되면 이곳에 표시됩니다.",
    eyebrow: "Creator Channel",
    publicPosts: "공개 콘텐츠",
    titleSuffix: "의 FanLetter",
  },
  feed: {
    empty: "공개 콘텐츠가 준비되면 이곳에 표시됩니다.",
    eyebrow: "FanLetter Feed",
    title: "공개된 AI 콘텐츠를 FanLetter 흐름 안에서 둘러보세요.",
  },
  languageLabel: "언어",
  metrics: {
    comments: "댓글",
    likes: "좋아요",
    saves: "저장",
  },
  start: {
    body: "가입, 프로필 설정, AI 콘텐츠 생성, 게시와 판매까지 기존 기능을 FanLetter 흐름 안에서 이어갑니다.",
    eyebrow: "Start FanLetter",
    steps: [
      {
        body: "가입을 완료하고 크리에이터 프로필의 표시 이름과 인물 페르소나를 정리합니다.",
        title: "프로필 준비",
      },
      {
        body: "AI 이미지 또는 동영상을 만들고, 공개 범위와 가격을 정합니다.",
        title: "콘텐츠 생성",
      },
      {
        body: "FanLetter 피드와 공유 링크로 팬에게 보여주고 판매 흐름으로 연결합니다.",
        title: "게시와 판매",
      },
    ],
    title: "처음 시작하는 사람도 바로 따라갈 수 있게 정리했습니다.",
  },
};

const enCopy: FanletterSubpageCopy = {
  actions: {
    continue: "Continue",
    creatorStudio: "Creator Studio",
    existingDetail: "Open wallet detail",
    feed: "Feed",
    home: "Home",
    openContent: "View content",
    start: "Start",
  },
  content: {
    body: "Body",
    lockedBody: "Open the existing detail view to verify access and view the full content.",
    lockedDescription:
      "Payments, wallet connection, and access checks keep using the existing content detail APIs and flow.",
    lockedTitle: "This content requires access verification.",
    media: "Content media",
    paid: "Paid",
    public: "Free public",
  },
  creator: {
    empty: "This creator's public content will appear here when it is ready.",
    eyebrow: "Creator Channel",
    publicPosts: "public content",
    titleSuffix: "'s FanLetter",
  },
  feed: {
    empty: "Public content will appear here when it is ready.",
    eyebrow: "FanLetter Feed",
    title: "Browse public AI content inside the FanLetter experience.",
  },
  languageLabel: "Language",
  metrics: {
    comments: "comments",
    likes: "likes",
    saves: "saves",
  },
  start: {
    body: "Signup, profile setup, AI content creation, publishing, and sales continue through the existing product flow.",
    eyebrow: "Start FanLetter",
    steps: [
      {
        body: "Complete signup and prepare your display name and character persona.",
        title: "Prepare profile",
      },
      {
        body: "Create AI images or videos, then choose visibility and pricing.",
        title: "Create content",
      },
      {
        body: "Publish to FanLetter and share links that lead into the sales flow.",
        title: "Publish and sell",
      },
    ],
    title: "A simple path for new creators to start quickly.",
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

function getAvatarInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "F";
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
  imageUrl,
  mediaType,
  title,
  videoUrl,
}: {
  alt: string;
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
        controls
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
  const effectiveReferralCode = referralCode ?? item.authorReferralCode;
  const href = buildPathWithReferral(
    `/${locale}/fanletter/content/${item.contentId}`,
    effectiveReferralCode,
  );
  const creatorHref = item.authorReferralCode
    ? buildPathWithReferral(
        `/${locale}/fanletter/creator/${item.authorReferralCode}`,
        effectiveReferralCode,
      )
    : null;

  return (
    <article className="overflow-hidden rounded-lg border border-black/10 bg-white text-black shadow-[0_18px_44px_rgba(8,18,12,0.12)]">
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
              videoUrl={null}
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
        <h2 className="text-xl font-semibold leading-tight tracking-normal">
          {item.title}
        </h2>
        <p className="mt-2 min-h-[4.5rem] text-sm font-medium leading-6 text-black/58">
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
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-black px-3 text-xs font-semibold text-white"
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

  return (
    <FanletterShell
      description={copy.feed.title}
      eyebrow={copy.feed.eyebrow}
      locale={locale}
      referralCode={referralCode}
      title="FanLetter Feed"
    >
      <section className="bg-[#f6f8f4] px-4 py-10 text-black sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
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
      description={data.profile.intro}
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

export function FanletterStartPage({
  locale,
  referralCode,
}: {
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const studioHref = buildPathWithReferral(
    `/${locale}/creator/studio/profile`,
    referralCode,
  );
  const startLabels =
    locale === "ko"
      ? {
          flowEyebrow: "Quick setup",
          flowTitle: "3단계만 끝내면 FanLetter 홈을 바로 시작할 수 있습니다.",
          primary: "가입하고 시작하기",
          secondary: "프로필 설정하기",
          previewTitle: "오늘 할 일",
          previewBody: "처음 방문한 사용자도 순서대로 따라가면 됩니다.",
          nextLabel: "다음 단계",
          readyLabel: "시작 준비",
          readyValue: "3 steps",
          stepMeta: ["계정 확인", "AI 생성 준비", "공개와 판매"],
        }
      : {
          flowEyebrow: "Quick setup",
          flowTitle: "Complete three steps to launch your FanLetter home.",
          primary: "Start with signup",
          secondary: "Set up profile",
          previewTitle: "Today’s path",
          previewBody: "New creators can follow the flow in order.",
          nextLabel: "Next step",
          readyLabel: "Ready path",
          readyValue: "3 steps",
          stepMeta: ["Account check", "AI creation setup", "Publish and sell"],
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
            href={activateHref}
          >
            {startLabels.primary}
          </Link>
          <Link
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/18 bg-white/8 px-6 text-sm font-semibold !text-white transition hover:bg-white/12 sm:w-fit"
            href={studioHref}
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
            href={activateHref}
          >
            {startLabels.primary}
          </Link>
          <Link
            className="inline-flex h-12 items-center justify-center rounded-full border border-black/12 bg-white px-5 text-sm font-semibold !text-black transition hover:bg-black/[0.03] sm:min-w-[12rem]"
            href={studioHref}
          >
            {startLabels.secondary}
          </Link>
        </div>
      </section>
    </FanletterShell>
  );
}
