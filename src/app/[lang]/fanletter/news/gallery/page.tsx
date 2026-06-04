import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Clapperboard,
  Images,
  Play,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { FanletterBrandMark } from "@/components/fanletter-brand-mark";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import {
  getFanletterNewsTeaserGalleryItems,
  type FanletterNewsTeaserGalleryItem,
} from "@/lib/fanletter-news-report-service";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
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

type FanletterNewsGallerySearchParams = {
  ref?: string | string[];
};

type TeaserGalleryGroup = {
  groupKey: string;
  items: FanletterNewsTeaserGalleryItem[];
  primary: FanletterNewsTeaserGalleryItem;
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        emptyBody:
          "공개 가능한 뉴스 브이로그 티저가 준비되면 이곳에 먼저 표시됩니다.",
        emptyTitle: "아직 공개할 뉴스 티저가 없습니다.",
        eyebrow: "AIAVpark News Preview Gallery",
        heroBody:
          "회원가입 전에도 원본 브이로그의 짧은 공개 티저만 빠르게 훑어볼 수 있는 뉴스 화보입니다. NSFW 콘텐츠와 원본 영상 URL은 이 페이지에서 제외합니다.",
        heroTitle: "뉴스 티저 화보",
        labels: {
          cutCollection: "컷 모음",
          representative: "대표 티저",
          sameSource: "같은 브이로그 컷",
          fanOnly: "팬 전용",
          free: "공개",
          news: "뉴스",
          reporter: "팬 기자",
          safe: "NSFW 제외",
          teasers: "티저",
        },
        gallery: {
          groupedBody:
            "같은 브이로그의 비슷한 티저는 하나의 대표 카드로 묶고, 나머지 컷은 썸네일로 압축했습니다.",
          groupedTitle: "대표 티저 모음",
          sameSourceBody:
            "대표 티저와 같은 원본에서 뽑힌 다른 공개 컷입니다. 반복 설명 없이 이미지 흐름만 빠르게 확인하세요.",
          sameSourceTitle: "같은 브이로그의 다른 컷",
        },
        nav: {
          characters: "AI 캐릭터",
          gallery: "티저 화보",
          home: "뉴스 홈",
          purchases: "구매함",
          reports: "리포터 데스크",
        },
        openNews: "뉴스 보기",
        openVlog: "원본 브이로그 열기",
        siteName: "AIAVpark News",
        stats: {
          characters: "캐릭터",
          reporters: "팬 기자",
          teasers: "공개 티저",
          vlogs: "대표 묶음",
        },
      }
    : {
        emptyBody:
          "Public AIAVpark News vlog teasers will appear here as they become available.",
        emptyTitle: "No public news teasers yet.",
        eyebrow: "AIAVpark News Preview Gallery",
        heroBody:
          "A public news gallery where visitors can preview short source-vlog teasers before joining. NSFW content and original video URLs are excluded from this page.",
        heroTitle: "News Teaser Gallery",
        labels: {
          cutCollection: "Cut set",
          representative: "Lead teaser",
          sameSource: "Same-vlog cuts",
          fanOnly: "Fan-only",
          free: "Public",
          news: "News",
          reporter: "Fan reporter",
          safe: "NSFW excluded",
          teasers: "Teasers",
        },
        gallery: {
          groupedBody:
            "Similar teasers from the same vlog are grouped into one lead card, while extra cuts are compressed into thumbnails.",
          groupedTitle: "Representative teaser sets",
          sameSourceBody:
            "More public cuts from the same source as the lead teaser, shown as image flow without repeated descriptions.",
          sameSourceTitle: "More cuts from the same vlog",
        },
        nav: {
          characters: "AI characters",
          gallery: "Teaser gallery",
          home: "News home",
          purchases: "Purchases",
          reports: "Reporter desk",
        },
        openNews: "Read news",
        openVlog: "Open source vlog",
        siteName: "AIAVpark News",
        stats: {
          characters: "Characters",
          reporters: "Fan reporters",
          teasers: "Public teasers",
          vlogs: "Lead sets",
        },
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

function getGalleryStats(
  items: FanletterNewsTeaserGalleryItem[],
  groups: TeaserGalleryGroup[],
) {
  return {
    characters: new Set(
      items
        .map((item) => item.creatorReferralCode ?? item.creatorName)
        .filter(Boolean),
    ).size,
    reporters: new Set(items.map((item) => item.reporterReferralCode)).size,
    teasers: items.length,
    vlogs: groups.length,
  };
}

function getTeaserImageUrl(item: FanletterNewsTeaserGalleryItem) {
  return item.teaserImageUrls[0] ?? item.coverImageUrl;
}

function getTeaserGroupKey(item: FanletterNewsTeaserGalleryItem) {
  const creator =
    item.creatorReferralCode?.trim() ||
    item.creatorName.trim() ||
    item.reporterReferralCode;
  const sourceVideoUrl = item.previewClipVideoUrl.trim();
  const sourceTitle = item.sourceTitle.trim().toLocaleLowerCase("en-US");
  const sourceKey = sourceVideoUrl || sourceTitle || item.contentId;

  return `${creator.toLocaleLowerCase("en-US")}:${sourceKey}`;
}

function getTeaserGalleryGroups(items: FanletterNewsTeaserGalleryItem[]) {
  const groupByKey = new Map<string, TeaserGalleryGroup>();

  for (const item of items) {
    const groupKey = getTeaserGroupKey(item);
    const existingGroup = groupByKey.get(groupKey);

    if (existingGroup) {
      existingGroup.items.push(item);
      continue;
    }

    groupByKey.set(groupKey, {
      groupKey,
      items: [item],
      primary: item,
    });
  }

  return Array.from(groupByKey.values());
}

function getReportHref({
  item,
  locale,
  referralCode,
}: {
  item: FanletterNewsTeaserGalleryItem;
  locale: Locale;
  referralCode: string | null;
}) {
  return buildPathWithReferral(
    `/${locale}/fanletter/news/${item.reportId}`,
    referralCode,
  );
}

function getVlogHref({
  item,
  locale,
  referralCode,
  returnTo,
}: {
  item: FanletterNewsTeaserGalleryItem;
  locale: Locale;
  referralCode: string | null;
  returnTo: string;
}) {
  return setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/vlogs/${item.contentId}`,
      referralCode,
    ),
    { returnTo },
  );
}

function GalleryVideo({
  className,
  featured = false,
  item,
}: {
  className?: string;
  featured?: boolean;
  item: FanletterNewsTeaserGalleryItem;
}) {
  return (
    <video
      aria-label={item.sourceTitle}
      autoPlay={featured}
      className={className}
      controls
      loop={featured}
      muted
      playsInline
      poster={item.coverImageUrl ?? undefined}
      preload="metadata"
      src={item.previewClipVideoUrl}
    />
  );
}

function TeaserCard({
  copy,
  group,
  locale,
  referralCode,
  returnTo,
}: {
  copy: ReturnType<typeof getCopy>;
  group: TeaserGalleryGroup;
  locale: Locale;
  referralCode: string | null;
  returnTo: string;
}) {
  const item = group.primary;
  const reportHref = getReportHref({ item, locale, referralCode });
  const vlogHref = getVlogHref({ item, locale, referralCode, returnTo });
  const publishedAt = formatDate(item.publishedAt, locale);
  const imageUrl = getTeaserImageUrl(item);
  const extraCuts = group.items.slice(1, 5);

  return (
    <article className="grid min-w-0 overflow-hidden border border-black/10 bg-white shadow-[0_16px_36px_rgba(17,21,16,0.06)]">
      <Link
        aria-label={`${copy.openNews}: ${item.sourceTitle}`}
        className="group relative aspect-[9/13] bg-[#111510]"
        href={reportHref}
      >
        {imageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover transition duration-500 group-hover:scale-[1.035]"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 22rem"
            src={imageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(imageUrl)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-white/62">
            <Clapperboard className="size-8" />
          </span>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,21,16,0.02)_28%,rgba(17,21,16,0.74)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="inline-flex items-center gap-1.5 bg-[#44f26e] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-black">
            <Play className="size-3" />
            {group.items.length > 1 ? copy.labels.cutCollection : copy.labels.teasers}
          </span>
          <span className="inline-flex bg-white/92 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#111510]">
            {item.priceType === "paid" ? copy.labels.fanOnly : copy.labels.free}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[0.62rem] font-black uppercase tracking-[0.12em] text-white/78">
            {copy.labels.representative}
          </span>
          <span className="shrink-0 bg-white/92 px-2 py-1 text-[0.6rem] font-black text-[#111510]">
            {formatNumber(group.items.length, locale)} {copy.labels.teasers}
          </span>
        </div>
      </Link>
      <div className="grid min-h-[13rem] content-between gap-4 p-4">
        <div>
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[0.65rem] font-black uppercase tracking-[0.1em] text-black/42">
            <span className="text-[#16702e]">{item.creatorName}</span>
            {publishedAt ? <span>{publishedAt}</span> : null}
          </div>
          <h3 className="mt-2 line-clamp-3 break-words text-lg font-black leading-6 tracking-normal [word-break:keep-all]">
            {item.sourceTitle}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-black/58">
            {item.dek}
          </p>
          {extraCuts.length > 0 ? (
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {extraCuts.map((cut) => {
                const cutImageUrl = getTeaserImageUrl(cut);

                return (
                  <span
                    className="relative aspect-square overflow-hidden bg-[#111510]"
                    key={`${cut.contentId}-${cut.reportId}`}
                  >
                    {cutImageUrl ? (
                      <Image
                        alt=""
                        aria-hidden="true"
                        className="object-cover"
                        fill
                        sizes="4rem"
                        src={cutImageUrl}
                        unoptimized={shouldBypassFanletterImageOptimization(
                          cutImageUrl,
                        )}
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-white/50">
                        <Images className="size-4" />
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 bg-[#111510] px-3 text-center text-xs font-black !text-white transition hover:bg-[#183121]"
            href={reportHref}
          >
            {copy.openNews}
            <ArrowRight className="size-3.5 text-[#44f26e]" />
          </Link>
          <Link
            className="inline-flex h-9 items-center justify-center gap-2 border border-black/12 px-3 text-center text-xs font-black text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
            href={vlogHref}
          >
            {copy.openVlog}
          </Link>
        </div>
      </div>
    </article>
  );
}

function TeaserStrip({
  copy,
  group,
  locale,
  referralCode,
}: {
  copy: ReturnType<typeof getCopy>;
  group: TeaserGalleryGroup;
  locale: Locale;
  referralCode: string | null;
}) {
  const item = group.primary;
  const reportHref = getReportHref({ item, locale, referralCode });
  const publishedAt = formatDate(item.publishedAt, locale);
  const imageUrl = getTeaserImageUrl(item);

  return (
    <Link
      className="group grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-3 border border-black/10 bg-white p-2 transition hover:border-[#19b84b] hover:bg-[#f7fbf5]"
      href={reportHref}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[#111510]">
        {imageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover transition duration-300 group-hover:scale-[1.04]"
            fill
            sizes="5rem"
            src={imageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(imageUrl)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-white/62">
            <Clapperboard className="size-6" />
          </span>
        )}
      </div>
      <div className="min-w-0 py-1">
        <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#16702e]">
          {copy.labels.cutCollection} · {formatNumber(group.items.length, locale)}
        </p>
        <h3 className="mt-1 line-clamp-2 break-words text-sm font-black leading-5 [word-break:keep-all] group-hover:text-[#16702e]">
          {item.sourceTitle}
        </h3>
        <p className="mt-1 truncate text-xs font-semibold text-black/44">
          {item.reporterName}
          {publishedAt ? ` · ${publishedAt}` : ""}
        </p>
      </div>
    </Link>
  );
}

function SameSourceCutGrid({
  copy,
  group,
  locale,
  referralCode,
}: {
  copy: ReturnType<typeof getCopy>;
  group: TeaserGalleryGroup;
  locale: Locale;
  referralCode: string | null;
}) {
  const cuts = group.items.slice(1);

  if (cuts.length === 0) {
    return null;
  }

  return (
    <section className="border border-black/10 bg-white p-3 shadow-[0_14px_32px_rgba(17,21,16,0.045)] sm:p-4">
      <div className="mb-3 grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
            {copy.labels.sameSource}
          </p>
          <h2 className="mt-1 text-xl font-black leading-tight [word-break:keep-all]">
            {copy.gallery.sameSourceTitle}
          </h2>
          <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-black/52 sm:text-sm sm:leading-6">
            {copy.gallery.sameSourceBody}
          </p>
        </div>
        <span className="inline-flex min-h-8 items-center justify-center border border-black/10 px-2.5 text-xs font-black text-black/54">
          {formatNumber(cuts.length, locale)} {copy.labels.teasers}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {cuts.map((cut, index) => {
          const imageUrl = getTeaserImageUrl(cut);

          return (
            <Link
              aria-label={`${copy.openNews}: ${cut.sourceTitle}`}
              className="group relative aspect-square overflow-hidden bg-[#111510]"
              href={getReportHref({ item: cut, locale, referralCode })}
              key={`${cut.contentId}-${cut.reportId}`}
            >
              {imageUrl ? (
                <Image
                  alt=""
                  aria-hidden="true"
                  className="object-cover transition duration-300 group-hover:scale-[1.04]"
                  fill
                  sizes="(max-width: 640px) 30vw, 8rem"
                  src={imageUrl}
                  unoptimized={shouldBypassFanletterImageOptimization(imageUrl)}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-white/50">
                  <Images className="size-5" />
                </span>
              )}
              <span className="absolute left-1.5 top-1.5 bg-[#44f26e] px-1.5 py-0.5 font-mono text-[0.58rem] font-black text-black">
                {String(index + 1).padStart(2, "0")}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsGallerySearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const copy = getCopy(locale);
  const url = buildPathWithReferral(
    `/${locale}/fanletter/news/gallery`,
    referralCode,
  );
  const ogImagePath = buildFanletterOgImagePath({
    description: copy.heroBody,
    locale,
    referralCode,
    title: copy.heroTitle,
    variant: "feed",
    version: "fanletter-news-gallery-v1",
  });
  const ogImage = {
    alt: getFanletterOgAlt(locale, "feed"),
    height: FANLETTER_OG_IMAGE_SIZE.height,
    type: "image/png",
    url: ogImagePath,
    width: FANLETTER_OG_IMAGE_SIZE.width,
  };

  return {
    title: `${copy.heroTitle} | ${copy.siteName}`,
    description: copy.heroBody,
    alternates: {
      canonical: url,
    },
    openGraph: {
      description: copy.heroBody,
      images: [ogImage],
      siteName: copy.siteName,
      title: copy.heroTitle,
      type: "website",
      url,
    },
    twitter: {
      card: "summary_large_image",
      description: copy.heroBody,
      images: [ogImage],
      title: copy.heroTitle,
    },
  };
}

export default async function LocalizedFanletterNewsGalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsGallerySearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const galleryHref = buildPathWithReferral(
    `/${locale}/fanletter/news/gallery`,
    referralCode,
  );
  const navItems = [
    { href: newsHomeHref, label: copy.nav.home },
    { href: galleryHref, label: copy.nav.gallery },
    {
      href: buildPathWithReferral(
        `/${locale}/fanletter/news/characters`,
        referralCode,
      ),
      label: copy.nav.characters,
    },
    {
      href: buildPathWithReferral(
        `/${locale}/fanletter/news/purchases`,
        referralCode,
      ),
      label: copy.nav.purchases,
    },
    {
      href: buildPathWithReferral(
        `/${locale}/fanletter/news/reports`,
        referralCode,
      ),
      label: copy.nav.reports,
    },
  ];
  const items = await getFanletterNewsTeaserGalleryItems({
    limit: 36,
    locale,
  });
  const groups = getTeaserGalleryGroups(items);
  const [featuredGroup, ...otherGroups] = groups;
  const featuredItem = featuredGroup?.primary ?? null;
  const stats = getGalleryStats(items, groups);
  const secondaryGroups = otherGroups.slice(0, 4);
  const galleryGroups = otherGroups.slice(4);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef1ec] text-[#111510]">
      <header className="border-b border-black/12 bg-white">
        <div className="mx-auto max-w-[92rem] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-[#111510] pb-3">
            <Link
              className="inline-flex min-h-11 min-w-0 items-center gap-3 text-[1.65rem] font-black leading-none tracking-normal !text-[#111510] sm:text-[3.6rem]"
              href={newsHomeHref}
            >
              <FanletterBrandMark className="size-9 sm:size-14" />
              <span className="truncate">{copy.siteName}</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 border border-black/12 px-3 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
              <ShieldCheck className="size-3.5" />
              {copy.labels.safe}
            </span>
          </div>
          <nav
            aria-label={copy.siteName}
            className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] sm:gap-3 [&::-webkit-scrollbar]:hidden"
          >
            {navItems.map((item) => (
              <Link
                className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-black/10 bg-[#f6f8f4] px-3 text-[0.7rem] font-black uppercase tracking-[0.08em] !text-black/62 transition hover:border-[#19b84b] hover:bg-[#ecfff0] hover:!text-[#16702e] sm:min-h-10"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-[92rem] px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {featuredItem ? (
          <div className="space-y-7">
            <section className="grid overflow-hidden border-y-2 border-[#111510] bg-white shadow-[0_18px_44px_rgba(17,21,16,0.06)] lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.72fr)]">
              <div className="relative order-2 min-h-[24rem] bg-[#111510] sm:min-h-[42rem] lg:order-1 lg:min-h-[46rem]">
                <GalleryVideo
                  featured
                  className="absolute inset-0 h-full w-full object-cover"
                  item={featuredItem}
                />
              </div>
              <div className="order-1 grid content-between gap-6 border-t border-black/12 p-5 lg:order-2 lg:border-l lg:border-t-0 lg:p-7">
                <div>
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
                    {copy.eyebrow}
                  </p>
                  <h1 className="mt-3 break-words text-[2rem] font-black leading-[1.08] tracking-normal [word-break:keep-all] sm:text-[3rem] lg:text-[3.25rem]">
                    {copy.heroTitle}
                  </h1>
                  <p className="mt-3 text-sm font-semibold leading-6 text-black/58 sm:text-base sm:leading-7">
                    {copy.heroBody}
                  </p>
                  <div className="mt-6 grid grid-cols-3 gap-px bg-black/10">
                    {[
                      [copy.stats.teasers, stats.teasers],
                      [copy.stats.vlogs, stats.vlogs],
                      [copy.stats.reporters, stats.reporters],
                    ].map(([label, value]) => (
                      <div className="bg-[#f7faf4] p-3" key={label}>
                        <p className="text-2xl font-black leading-none">
                          {formatNumber(Number(value), locale)}
                        </p>
                        <p className="mt-1 text-[0.56rem] font-black uppercase tracking-[0.09em] text-black/42">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-[#44f26e] px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-black">
                      <Images className="size-3.5" />
                      {copy.labels.teasers}
                    </span>
                    <span className="inline-flex items-center gap-1.5 border border-black/12 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-black/54">
                      <Sparkles className="size-3.5 text-[#16702e]" />
                      {featuredItem.priceType === "paid"
                        ? copy.labels.fanOnly
                        : copy.labels.free}
                    </span>
                  </div>
                  <h2 className="mt-4 break-words text-2xl font-black leading-tight [word-break:keep-all]">
                    {featuredItem.sourceTitle}
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-black/58">
                    {featuredItem.dek}
                  </p>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Link
                      className="inline-flex h-11 items-center justify-center gap-2 border border-black/14 px-4 text-sm font-black text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                      href={getReportHref({
                        item: featuredItem,
                        locale,
                        referralCode,
                      })}
                    >
                      {copy.openNews}
                      <ArrowRight className="size-4" />
                    </Link>
                    <Link
                      className="inline-flex h-11 items-center justify-center gap-2 bg-[#111510] px-4 text-sm font-black !text-white transition hover:bg-[#183121]"
                      href={getVlogHref({
                        item: featuredItem,
                        locale,
                        referralCode,
                        returnTo: galleryHref,
                      })}
                    >
                      {copy.openVlog}
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {featuredGroup ? (
              <SameSourceCutGrid
                copy={copy}
                group={featuredGroup}
                locale={locale}
                referralCode={referralCode}
              />
            ) : null}

            {secondaryGroups.length > 0 ? (
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {secondaryGroups.map((group) => (
                  <TeaserStrip
                    copy={copy}
                    group={group}
                    key={group.groupKey}
                    locale={locale}
                    referralCode={referralCode}
                  />
                ))}
              </section>
            ) : null}

            {galleryGroups.length > 0 ? (
              <section>
                <div className="mb-4 grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div className="min-w-0">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                      {copy.labels.cutCollection}
                    </p>
                    <h2 className="mt-1 text-2xl font-black leading-tight [word-break:keep-all]">
                      {copy.gallery.groupedTitle}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-black/54">
                      {copy.gallery.groupedBody}
                    </p>
                  </div>
                  <span className="inline-flex min-h-9 items-center border border-black/10 bg-white px-3 text-xs font-black text-black/54">
                    {formatNumber(galleryGroups.length, locale)}{" "}
                    {copy.stats.vlogs}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {galleryGroups.map((group) => (
                    <TeaserCard
                      copy={copy}
                      group={group}
                      key={group.groupKey}
                      locale={locale}
                      referralCode={referralCode}
                      returnTo={galleryHref}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <section className="mx-auto mt-10 max-w-2xl border border-black/10 bg-white p-8 text-center shadow-[0_16px_36px_rgba(17,21,16,0.06)]">
            <UserRound className="mx-auto size-12 text-[#16702e]" />
            <h1 className="mt-4 text-2xl font-black">{copy.emptyTitle}</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-black/58">
              {copy.emptyBody}
            </p>
            <Link
              className="mt-5 inline-flex h-11 items-center justify-center border border-black/14 px-4 text-sm font-black text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
              href={newsHomeHref}
            >
              {copy.nav.home}
            </Link>
          </section>
        )}
      </section>
    </main>
  );
}
