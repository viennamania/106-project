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

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        emptyBody:
          "공개 가능한 뉴스 브이로그 티저가 준비되면 이곳에 먼저 표시됩니다.",
        emptyTitle: "아직 공개할 뉴스 티저가 없습니다.",
        eyebrow: "FanLetter News Preview Gallery",
        heroBody:
          "회원가입 전에도 원본 브이로그의 짧은 공개 티저만 빠르게 훑어볼 수 있는 뉴스 화보입니다. NSFW 콘텐츠와 원본 영상 URL은 이 페이지에서 제외합니다.",
        heroTitle: "뉴스 티저 화보",
        labels: {
          fanOnly: "팬 전용",
          free: "공개",
          news: "뉴스",
          reporter: "팬 기자",
          safe: "NSFW 제외",
          teasers: "티저",
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
        siteName: "FanLetter News",
        stats: {
          characters: "캐릭터",
          reporters: "팬 기자",
          teasers: "공개 티저",
        },
      }
    : {
        emptyBody:
          "Public FanLetter News vlog teasers will appear here as they become available.",
        emptyTitle: "No public news teasers yet.",
        eyebrow: "FanLetter News Preview Gallery",
        heroBody:
          "A public news gallery where visitors can preview short source-vlog teasers before joining. NSFW content and original video URLs are excluded from this page.",
        heroTitle: "News Teaser Gallery",
        labels: {
          fanOnly: "Fan-only",
          free: "Public",
          news: "News",
          reporter: "Fan reporter",
          safe: "NSFW excluded",
          teasers: "Teasers",
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
        siteName: "FanLetter News",
        stats: {
          characters: "Characters",
          reporters: "Fan reporters",
          teasers: "Public teasers",
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

function getGalleryStats(items: FanletterNewsTeaserGalleryItem[]) {
  return {
    characters: new Set(
      items
        .map((item) => item.creatorReferralCode ?? item.creatorName)
        .filter(Boolean),
    ).size,
    reporters: new Set(items.map((item) => item.reporterReferralCode)).size,
    teasers: items.length,
  };
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
  item,
  locale,
  referralCode,
  returnTo,
}: {
  copy: ReturnType<typeof getCopy>;
  item: FanletterNewsTeaserGalleryItem;
  locale: Locale;
  referralCode: string | null;
  returnTo: string;
}) {
  const reportHref = getReportHref({ item, locale, referralCode });
  const vlogHref = getVlogHref({ item, locale, referralCode, returnTo });
  const publishedAt = formatDate(item.publishedAt, locale);

  return (
    <article className="grid min-w-0 overflow-hidden border border-black/10 bg-white shadow-[0_16px_36px_rgba(17,21,16,0.06)]">
      <div className="relative aspect-[9/13] bg-[#111510]">
        <GalleryVideo
          className="absolute inset-0 h-full w-full object-cover"
          item={item}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="inline-flex items-center gap-1.5 bg-[#44f26e] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-black">
            <Play className="size-3" />
            {copy.labels.teasers}
          </span>
          <span className="inline-flex bg-white/92 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#111510]">
            {item.priceType === "paid" ? copy.labels.fanOnly : copy.labels.free}
          </span>
        </div>
      </div>
      <div className="grid min-h-[13rem] content-between gap-4 p-4">
        <div>
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[0.65rem] font-black uppercase tracking-[0.1em] text-black/42">
            <span className="text-[#16702e]">{item.creatorName}</span>
            {publishedAt ? <span>{publishedAt}</span> : null}
          </div>
          <h2 className="mt-2 line-clamp-3 break-words text-lg font-black leading-6 tracking-normal [word-break:keep-all]">
            {item.sourceTitle}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-black/58">
            {item.dek}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 border border-black/12 px-3 text-center text-xs font-black text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
            href={reportHref}
          >
            {copy.openNews}
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 bg-[#111510] px-3 text-center text-xs font-black !text-white transition hover:bg-[#183121]"
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
  item,
  locale,
  referralCode,
}: {
  copy: ReturnType<typeof getCopy>;
  item: FanletterNewsTeaserGalleryItem;
  locale: Locale;
  referralCode: string | null;
}) {
  const reportHref = getReportHref({ item, locale, referralCode });
  const publishedAt = formatDate(item.publishedAt, locale);

  return (
    <Link
      className="group grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-3 border border-black/10 bg-white p-2 transition hover:border-[#19b84b] hover:bg-[#f7fbf5]"
      href={reportHref}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[#111510]">
        {item.coverImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover transition duration-300 group-hover:scale-[1.04]"
            fill
            sizes="5rem"
            src={item.coverImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(
              item.coverImageUrl,
            )}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-white/62">
            <Clapperboard className="size-6" />
          </span>
        )}
      </div>
      <div className="min-w-0 py-1">
        <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#16702e]">
          {copy.labels.news}
        </p>
        <h3 className="mt-1 line-clamp-2 break-words text-sm font-black leading-5 [word-break:keep-all] group-hover:text-[#16702e]">
          {item.title}
        </h3>
        <p className="mt-1 truncate text-xs font-semibold text-black/44">
          {item.reporterName}
          {publishedAt ? ` · ${publishedAt}` : ""}
        </p>
      </div>
    </Link>
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
  const [featuredItem, ...galleryItems] = items;
  const stats = getGalleryStats(items);
  const secondaryItems = galleryItems.slice(0, 4);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef1ec] text-[#111510]">
      <header className="border-b border-black/12 bg-white">
        <div className="mx-auto max-w-[92rem] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-[#111510] pb-3">
            <Link
              className="inline-flex min-w-0 items-center gap-3 text-[1.65rem] font-black leading-none tracking-normal !text-[#111510] sm:text-[3.6rem]"
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
            className="flex gap-4 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {navItems.map((item) => (
              <Link
                className="shrink-0 border-r border-black/10 pr-4 text-[0.7rem] font-black uppercase tracking-[0.1em] text-black/58 transition last:border-r-0 last:pr-0 hover:text-[#16702e]"
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
              <div className="relative min-h-[32rem] bg-[#111510] sm:min-h-[42rem] lg:min-h-[46rem]">
                <GalleryVideo
                  featured
                  className="absolute inset-0 h-full w-full object-cover"
                  item={featuredItem}
                />
              </div>
              <div className="grid content-between gap-8 border-t border-black/12 p-5 lg:border-l lg:border-t-0 lg:p-7">
                <div>
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
                    {copy.eyebrow}
                  </p>
                  <h1 className="mt-3 break-words text-[2rem] font-black leading-[1.08] tracking-normal [word-break:keep-all] sm:text-[3rem] lg:text-[3.25rem]">
                    {copy.heroTitle}
                  </h1>
                  <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-black/58 sm:text-base sm:leading-7">
                    {copy.heroBody}
                  </p>
                  <div className="mt-6 grid grid-cols-3 gap-px bg-black/10">
                    {[
                      [copy.stats.teasers, stats.teasers],
                      [copy.stats.characters, stats.characters],
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

            {secondaryItems.length > 0 ? (
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {secondaryItems.map((item) => (
                  <TeaserStrip
                    copy={copy}
                    item={item}
                    key={item.contentId}
                    locale={locale}
                    referralCode={referralCode}
                  />
                ))}
              </section>
            ) : null}

            {galleryItems.length > 0 ? (
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {galleryItems.map((item) => (
                  <TeaserCard
                    copy={copy}
                    item={item}
                    key={`${item.contentId}-${item.reportId}`}
                    locale={locale}
                    referralCode={referralCode}
                    returnTo={galleryHref}
                  />
                ))}
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
