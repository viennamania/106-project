import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clapperboard,
  Crown,
  HeartHandshake,
  MessageCircleHeart,
  Search,
  ShieldAlert,
  Sparkles,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import { FanletterNsfwOptInControl } from "@/components/fanletter-nsfw-opt-in-control";
import type {
  FanletterCharacterDirectoryItem,
  FanletterCharacterDirectoryPageData,
  FanletterCharacterDirectorySort,
} from "@/lib/fanletter-content-service";
import { fanletterCharacterDirectorySortOptions } from "@/lib/fanletter-content-service";
import { getFanletterNsfwCopy } from "@/lib/fanletter-nsfw";
import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { cn } from "@/lib/utils";

type CharacterDirectoryCopy = ReturnType<typeof getCopy>;

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        actions: {
          clear: "전체 캐릭터 보기",
          feed: "브이로그 피드",
          open: "채널 보기",
          search: "검색",
          start: "내 캐릭터 만들기",
        },
        empty: {
          body:
            "검색어를 지우거나 다른 캐릭터명, 소개, 추천 키워드로 다시 찾아보세요.",
          title: "조건에 맞는 AI 캐릭터가 없습니다.",
        },
        hero: {
          body:
            "FanLetter에서 팬 요청과 공개 브이로그, 팬 전용 콘텐츠로 성장 중인 AI 캐릭터 채널을 탐색하세요.",
          eyebrow: "AI Character Directory",
          title: "AI 캐릭터 전체 목록",
        },
        labels: {
          fanClub: "팬클럽",
          fanOnly: "팬 전용",
          latest: "최신 브이로그",
          level: "Lv.",
          noLatest: "아직 공개된 브이로그가 없습니다.",
          publicVlogs: "공개 브이로그",
          searchPlaceholder: "캐릭터명, 소개, 코드 검색",
          totalCharacters: "활성 캐릭터",
        },
        nsfw: {
          disabledBody:
            "목록은 유지하고 NSFW 팬 전용 커버만 블러 처리합니다. 켜면 커버를 선명하게 볼 수 있습니다.",
          disabledTitle: "NSFW 캐릭터 커버 블러 처리",
          hiddenCountText: (count: string) =>
            `블러 처리된 NSFW 팬 전용 콘텐츠 ${count}개`,
        },
        sort: {
          "fan-only": "팬 전용 많은순",
          featured: "추천순",
          latest: "최신 활동순",
          vlogs: "공개 브이로그 많은순",
        } satisfies Record<FanletterCharacterDirectorySort, string>,
        stats: {
          fanClub: "팬클럽 멤버",
          fanOnly: "팬 전용 콘텐츠",
          publicVlogs: "공개 브이로그",
          totalCharacters: "활성 캐릭터",
        },
      }
    : {
        actions: {
          clear: "View all characters",
          feed: "Vlog feed",
          open: "View channel",
          search: "Search",
          start: "Start my character",
        },
        empty: {
          body:
            "Clear the search or try another character name, intro, or keyword.",
          title: "No AI characters match this view.",
        },
        hero: {
          body:
            "Browse AI character channels growing through fan requests, public vlogs, and fan-only content inside FanLetter.",
          eyebrow: "AI Character Directory",
          title: "All AI Characters",
        },
        labels: {
          fanClub: "Fan club",
          fanOnly: "Fan-only",
          latest: "Latest vlog",
          level: "Lv.",
          noLatest: "No public vlog has been published yet.",
          publicVlogs: "Public vlogs",
          searchPlaceholder: "Search name, intro, or code",
          totalCharacters: "Active characters",
        },
        nsfw: {
          disabledBody:
            "The list stays visible while NSFW fan-only covers are blurred. Turn this on to show covers clearly.",
          disabledTitle: "NSFW character covers blurred",
          hiddenCountText: (count: string) => `${count} NSFW fan-only covers blurred`,
        },
        sort: {
          "fan-only": "Most fan-only",
          featured: "Featured",
          latest: "Latest activity",
          vlogs: "Most public vlogs",
        } satisfies Record<FanletterCharacterDirectorySort, string>,
        stats: {
          fanClub: "Fan club members",
          fanOnly: "Fan-only posts",
          publicVlogs: "Public vlogs",
          totalCharacters: "Active characters",
        },
      };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getCharactersHref({
  locale,
  page,
  query,
  referralCode,
  sort,
}: {
  locale: Locale;
  page?: number | null;
  query?: string | null;
  referralCode: string | null;
  sort?: FanletterCharacterDirectorySort | null;
}) {
  return setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/characters`, referralCode),
    {
      page: page && page > 1 ? String(page) : null,
      q: query,
      sort: sort && sort !== "featured" ? sort : null,
    },
  );
}

function DirectoryHeader({
  copy,
  locale,
  referralCode,
}: {
  copy: CharacterDirectoryCopy;
  locale: Locale;
  referralCode: string | null;
}) {
  const homeHref = buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const feedHref = buildPathWithReferral(`/${locale}/fanletter/feed`, referralCode);
  const startHref = buildPathWithReferral(
    `/${locale}/fanletter/start`,
    referralCode,
  );

  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
      <Link className="flex min-h-11 min-w-0 items-center gap-2" href={homeHref}>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black sm:size-10">
          <MessageCircleHeart className="size-5" />
        </span>
        <span className="hidden truncate text-xl font-semibold tracking-normal text-white sm:inline">
          FanLetter
        </span>
      </Link>
      <nav className="hidden items-center gap-5 text-sm font-semibold text-white/68 lg:flex">
        <Link className="transition hover:text-white" href={homeHref}>
          {locale === "ko" ? "홈" : "Home"}
        </Link>
        <Link className="text-white" href={getCharactersHref({ locale, referralCode })}>
          {locale === "ko" ? "캐릭터" : "Characters"}
        </Link>
        <Link className="transition hover:text-white" href={feedHref}>
          {copy.actions.feed}
        </Link>
      </nav>
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <FanletterGlobalLanguageSwitcher
          className="inline-flex sm:hidden"
          compact
          locale={locale}
          tight
        />
        <FanletterGlobalLanguageSwitcher
          className="hidden sm:inline-flex"
          compact
          locale={locale}
        />
        <FanletterAccountStatusLink
          className="max-w-[7.25rem] sm:max-w-[14rem]"
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
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.055] p-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/52">
          {label}
        </p>
        <span className="text-[#44f26e]">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold leading-none text-white">{value}</p>
    </div>
  );
}

function DirectoryControls({
  copy,
  data,
  locale,
  referralCode,
}: {
  copy: CharacterDirectoryCopy;
  data: FanletterCharacterDirectoryPageData;
  locale: Locale;
  referralCode: string | null;
}) {
  return (
    <div className="mb-5 rounded-lg border border-black/10 bg-white p-3 shadow-[0_14px_42px_rgba(8,18,12,0.06)] sm:p-4">
      <form
        action={`/${locale}/fanletter/characters`}
        className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
        method="get"
      >
        {referralCode ? <input name="ref" type="hidden" value={referralCode} /> : null}
        {data.filters.sort !== "featured" ? (
          <input name="sort" type="hidden" value={data.filters.sort} />
        ) : null}
        <label className="relative block min-w-0">
          <span className="sr-only">{copy.actions.search}</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-black/36" />
          <input
            className="h-12 w-full rounded-full border border-black/10 bg-[#f6f8f4] pl-10 pr-4 text-sm font-semibold outline-none transition placeholder:text-black/38 focus:border-[#16702e] focus:bg-white"
            defaultValue={data.filters.query}
            name="q"
            placeholder={copy.labels.searchPlaceholder}
            type="search"
          />
        </label>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/82"
          type="submit"
        >
          <Search className="size-4" />
          {copy.actions.search}
        </button>
      </form>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {fanletterCharacterDirectorySortOptions.map((sort) => {
          const active = data.filters.sort === sort;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-full border px-3 py-2 text-xs font-semibold transition",
                active
                  ? "border-black bg-black text-white"
                  : "border-black/10 bg-[#f6f8f4] text-black/60 hover:border-black/24 hover:text-black",
              )}
              href={getCharactersHref({
                locale,
                query: data.filters.query,
                referralCode,
                sort,
              })}
              key={sort}
            >
              {copy.sort[sort]}
            </Link>
          );
        })}
        {data.filters.query ? (
          <Link
            className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/54 transition hover:border-black/24 hover:text-black"
            href={getCharactersHref({ locale, referralCode })}
          >
            {copy.actions.clear}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function CharacterVisual({
  copy,
  item,
  locale,
  nsfwOptInEnabled,
}: {
  copy: CharacterDirectoryCopy;
  item: FanletterCharacterDirectoryItem;
  locale: Locale;
  nsfwOptInEnabled: boolean;
}) {
  const nsfwCopy = getFanletterNsfwCopy(locale);
  const imageUrl = item.latestCoverImageUrl ?? item.avatarImageUrl;
  const isNsfw = item.latestContentMaturityRating === "nsfw";
  const shouldBlur = isNsfw && !nsfwOptInEnabled;

  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-[#07100b]">
      {imageUrl ? (
        <>
          <Image
            alt={item.character.name}
            className={cn(
              "object-cover transition duration-500 group-hover:scale-[1.035]",
              shouldBlur && "scale-[1.04] blur-lg brightness-[0.72] saturate-[0.86]",
            )}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            src={imageUrl}
          />
          {shouldBlur ? (
            <div className="pointer-events-none absolute inset-0 bg-black/18" />
          ) : null}
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#07100b,#122318)] text-[#44f26e]">
          <Sparkles className="size-16" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <span className="inline-flex rounded-full bg-[#44f26e] px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.13em] text-black shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
          {copy.labels.level}
          {item.character.growth.level}
        </span>
        {isNsfw ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white">
            <ShieldAlert className="size-3" />
            {nsfwCopy.badge}
          </span>
        ) : null}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/82 via-black/36 to-transparent p-3 pt-16">
        <p className="line-clamp-2 text-sm font-semibold leading-5 text-white">
          {item.latestTitle ?? copy.labels.noLatest}
        </p>
      </div>
    </div>
  );
}

function CharacterCard({
  copy,
  item,
  locale,
  nsfwOptInEnabled,
  referralCode,
}: {
  copy: CharacterDirectoryCopy;
  item: FanletterCharacterDirectoryItem;
  locale: Locale;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
}) {
  const channelHref = buildPathWithReferral(
    `/${locale}/fanletter/creator/${item.referralCode}`,
    referralCode ?? item.referralCode,
  );
  const latestDate = formatDate(item.latestPublishedAt, locale);
  const stats = [
    {
      label: copy.labels.publicVlogs,
      value: item.publicContentCount,
    },
    {
      label: copy.labels.fanOnly,
      value: item.fanOnlyContentCount,
    },
    {
      label: copy.labels.fanClub,
      value: item.fanClubMemberCount,
    },
  ];

  return (
    <Link
      className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_18px_48px_rgba(8,18,12,0.08)] transition hover:-translate-y-0.5 hover:border-[#16702e]/34 hover:shadow-[0_22px_58px_rgba(8,18,12,0.14)]"
      href={channelHref}
    >
      <CharacterVisual
        copy={copy}
        item={item}
        locale={locale}
        nsfwOptInEnabled={nsfwOptInEnabled}
      />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <span className="relative -mt-10 flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-[#44f26e] text-lg font-semibold text-black shadow-[0_14px_28px_rgba(0,0,0,0.18)]">
            {item.avatarImageUrl ? (
              <Image
                alt={item.character.name}
                className="object-cover"
                fill
                sizes="4rem"
                src={item.avatarImageUrl}
              />
            ) : (
              item.character.name.slice(0, 1)
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[#16702e]">
              AI character channel
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold tracking-normal">
              {item.character.name}
            </h2>
            <p className="mt-1 truncate text-xs font-semibold text-black/42">
              {item.referralCode}
            </p>
          </div>
        </div>

        <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm font-medium leading-6 text-black/62">
          {item.character.summary}
        </p>

        {item.character.traits.length > 0 ? (
          <div className="mt-3 flex gap-1.5 overflow-hidden">
            {item.character.traits.slice(0, 3).map((trait) => (
              <span
                className="truncate rounded-full border border-black/10 bg-[#f6f8f4] px-2.5 py-1 text-[0.64rem] font-semibold text-black/54"
                key={trait}
              >
                {trait}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div className="rounded-lg bg-[#f6f8f4] p-2" key={stat.label}>
              <p className="text-lg font-semibold leading-none">
                {formatNumber(stat.value, locale)}
              </p>
              <p className="mt-1 truncate text-[0.56rem] font-semibold uppercase tracking-[0.08em] text-black/42">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/10 pt-3">
          <div className="min-w-0">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-black/38">
              {copy.labels.latest}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-black/58">
              {latestDate ?? copy.labels.noLatest}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-[#16702e]">
            {copy.actions.open}
            <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function DirectoryPagination({
  data,
  locale,
  referralCode,
}: {
  data: FanletterCharacterDirectoryPageData;
  locale: Locale;
  referralCode: string | null;
}) {
  if (data.filters.pageCount <= 1) {
    return null;
  }

  const pages = Array.from({ length: data.filters.pageCount }, (_, index) => index + 1);

  return (
    <nav
      aria-label={locale === "ko" ? "캐릭터 목록 페이지" : "Character pages"}
      className="mt-8 flex flex-wrap justify-center gap-2"
    >
      {pages.map((page) => {
        const active = page === data.filters.page;

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-full border text-sm font-semibold transition",
              active
                ? "border-black bg-black text-white"
                : "border-black/10 bg-white text-black/58 hover:border-black/24 hover:text-black",
            )}
            href={getCharactersHref({
              locale,
              page,
              query: data.filters.query,
              referralCode,
              sort: data.filters.sort,
            })}
            key={page}
          >
            {page}
          </Link>
        );
      })}
    </nav>
  );
}

export function FanletterCharacterDirectoryPage({
  data,
  locale,
  referralCode,
}: {
  data: FanletterCharacterDirectoryPageData;
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const formattedHiddenCount = formatNumber(data.hiddenNsfwCount, locale);
  const shouldShowNsfwControl =
    data.hiddenNsfwCount > 0 || data.nsfwOptInEnabled;
  const feedHref = buildPathWithReferral(
    `/${locale}/fanletter/feed`,
    referralCode,
  );
  const startHref = buildPathWithReferral(
    `/${locale}/fanletter/start`,
    referralCode,
  );
  const heroStats = [
    {
      icon: <UsersRound className="size-4" />,
      label: copy.stats.totalCharacters,
      value: formatNumber(data.stats.activeCharacterCount, locale),
    },
    {
      icon: <Clapperboard className="size-4" />,
      label: copy.stats.publicVlogs,
      value: formatNumber(data.stats.publicContentCount, locale),
    },
    {
      icon: <Crown className="size-4" />,
      label: copy.stats.fanOnly,
      value: formatNumber(data.stats.fanOnlyContentCount, locale),
    },
    {
      icon: <HeartHandshake className="size-4" />,
      label: copy.stats.fanClub,
      value: formatNumber(data.stats.fanClubMemberCount, locale),
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030504] pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-white sm:pb-0">
      <section className="border-b border-white/10">
        <DirectoryHeader copy={copy} locale={locale} referralCode={referralCode} />
        <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-end lg:px-8">
          <div className="min-w-0">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#44f26e]">
              {copy.hero.eyebrow}
            </p>
            <h1 className="mt-4 max-w-5xl text-[2rem] font-semibold leading-[1.08] tracking-normal text-white [word-break:keep-all] sm:text-[3rem] lg:text-[3.25rem]">
              {copy.hero.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/68 [word-break:keep-all] sm:text-lg">
              {copy.hero.body}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold !text-black transition hover:bg-[#70ff91]"
                href={feedHref}
              >
                <Clapperboard className="size-4" />
                {copy.actions.feed}
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/14 px-5 text-sm font-semibold !text-white transition hover:border-white/34"
                href={startHref}
              >
                <Sparkles className="size-4" />
                {copy.actions.start}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {heroStats.map((stat) => (
              <StatCard
                icon={stat.icon}
                key={stat.label}
                label={stat.label}
                value={stat.value}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f8f4] px-4 py-7 text-black sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <DirectoryControls
            copy={copy}
            data={data}
            locale={locale}
            referralCode={referralCode}
          />

          {shouldShowNsfwControl ? (
            <FanletterNsfwOptInControl
              className="mb-5 sm:mb-6"
              compact
              disabledBody={copy.nsfw.disabledBody}
              disabledTitle={copy.nsfw.disabledTitle}
              enabled={data.nsfwOptInEnabled}
              hiddenCount={data.hiddenNsfwCount}
              hiddenCountText={copy.nsfw.hiddenCountText(formattedHiddenCount)}
              locale={locale}
            />
          ) : null}

          {data.items.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {data.items.map((item) => (
                <CharacterCard
                  copy={copy}
                  item={item}
                  key={item.referralCode}
                  locale={locale}
                  nsfwOptInEnabled={data.nsfwOptInEnabled}
                  referralCode={referralCode}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-black/10 bg-white p-8 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#44f26e] text-black">
                <BadgeCheck className="size-7" />
              </div>
              <h2 className="mt-4 text-2xl font-semibold">{copy.empty.title}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-black/58">
                {copy.empty.body}
              </p>
              <Link
                className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold !text-white"
                href={getCharactersHref({ locale, referralCode })}
              >
                {copy.actions.clear}
              </Link>
            </div>
          )}

          <DirectoryPagination
            data={data}
            locale={locale}
            referralCode={referralCode}
          />
        </div>
      </section>
    </main>
  );
}
