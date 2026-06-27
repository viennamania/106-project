import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { FanletterBrandMark } from "@/components/fanletter-brand-mark";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import { FanletterNsfwOptInControl } from "@/components/fanletter-nsfw-opt-in-control";
import { FanletterStarShareButton } from "@/components/fanletter-star-share-button";
import { FanletterTrackedLink } from "@/components/fanletter-tracked-link";
import type {
  FanletterCharacterDirectoryItem,
  FanletterCharacterDirectoryPageData,
  FanletterCharacterDirectorySort,
} from "@/lib/fanletter-content-service";
import { fanletterCharacterDirectorySortOptions } from "@/lib/fanletter-content-service";
import { getFanletterNsfwCopy } from "@/lib/fanletter-nsfw";
import type { Locale } from "@/lib/i18n";
import { getFanletterNavLabels } from "@/lib/fanletter-nav-labels";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { cn } from "@/lib/utils";

type CharacterDirectoryCopy = ReturnType<typeof getCopy>;

function getCopy(locale: Locale) {
  const base = locale === "ko"
    ? {
        actions: {
          clear: "전체 AI 스타 보기",
          feed: "브이로그 피드",
          open: "선택하기",
          search: "검색",
          pickStar: "AI 스타 선택하기",
          start: "내 AI 스타 만들기",
        },
        empty: {
          body:
            "검색어를 지우거나 다른 AI 스타명, 소개, 추천 키워드로 다시 찾아보세요.",
          title: "조건에 맞는 AI 스타가 없습니다.",
        },
        hero: {
          body: "브이로그와 팬 반응을 보고 하나를 선택하세요.",
          eyebrow: "AI 스타 발견",
          title: "성장 중인 AI 스타",
        },
        labels: {
          aiStarChannel: "AI 스타 채널",
          fanClub: "팬클럽",
          fanOnly: "팬 전용",
          latest: "최신 브이로그",
          founderPath: "참여 흐름",
          level: "Lv.",
          noLatest: "아직 공개된 브이로그가 없습니다.",
          publicVlogs: "공개 브이로그",
          searchPlaceholder: "AI 스타명, 소개, 코드 검색",
          totalCharacters: "활성 AI 스타",
        },
        nsfw: {
          disabledBody: "NSFW 커버는 기본 블러 처리됩니다.",
          disabledTitle: "NSFW AI 스타 커버 블러 처리",
          hiddenCountText: (count: string) =>
            `블러 처리 ${count}개`,
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
          totalCharacters: "활성 AI 스타",
        },
        signpost: {
          currentLabel: "현재 위치",
          currentValue: "AI 스타 발견",
          eventLabel: "활동 기록",
          eventValue: "스타 발견 신호",
          flow: ["발견", "스타 선택", "참여", "활동 기록"],
          nextLabel: "다음 행동",
          nextValue: "스타 선택",
          subtitle:
            "AI 스타를 선택하면 채널과 AI 스타 유니버스를 확인한 뒤 참여로 이어집니다.",
        },
      }
    : {
        actions: {
          clear: "View all AI Stars",
          feed: "Vlog feed",
          open: "Select",
          search: "Search",
          pickStar: "Choose an AI Star",
          start: "Start my AI Star",
        },
        empty: {
          body:
            "Clear the search or try another AI Star name, intro, or keyword.",
          title: "No AI Stars match this view.",
        },
        hero: {
          body: "Review vlogs and fan signals, then select one.",
          eyebrow: "AI Star Discovery",
          title: "Growing AI Stars",
        },
        labels: {
          aiStarChannel: "AI Star channel",
          fanClub: "Fan club",
          fanOnly: "Fan-only",
          latest: "Latest vlog",
          founderPath: "Join flow",
          level: "Lv.",
          noLatest: "No public vlog has been published yet.",
          publicVlogs: "Public vlogs",
          searchPlaceholder: "Search AI Star name, intro, or code",
          totalCharacters: "Active AI Stars",
        },
        nsfw: {
          disabledBody: "NSFW covers are blurred by default.",
          disabledTitle: "NSFW AI Star covers blurred",
          hiddenCountText: (count: string) => `${count} blurred`,
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
          totalCharacters: "Active AI Stars",
        },
        signpost: {
          currentLabel: "Current",
          currentValue: "AI Star Discovery",
          eventLabel: "Activity log",
          eventValue: "Star discovery signal",
          flow: ["Discover", "Choose star", "Join", "Activity log"],
          nextLabel: "Next action",
          nextValue: "Choose a star",
          subtitle:
            "Choose an AI Star to review its channel and AI Star Universe before joining as a Fan.",
        },
      };
  if (locale === "ko" || locale === "en") {
    return base;
  }
  // zh/vi/id structural-UI drafts (pending native review). Only the hero +
  // actions sub-objects are localized; other sub-objects fall back to English.
  const overrides: Partial<
    Record<
      Locale,
      {
        actions: typeof base.actions;
        hero: typeof base.hero;
        labels: typeof base.labels;
        sort: typeof base.sort;
        stats: typeof base.stats;
      }
    >
  > = {
    ja: {
      hero: {
        body: "ブイログとファンの反応を見て、ひとつ選びましょう。",
        eyebrow: "AIスター発見",
        title: "成長中のAIスター",
      },
      actions: {
        clear: "すべてのAIスター",
        feed: "ブイログフィード",
        open: "選択",
        search: "検索",
        pickStar: "AIスターを選ぶ",
        start: "自分のAIスターを作る",
      },
      labels: {
        aiStarChannel: "AIスターチャンネル",
        fanClub: "ファンクラブ",
        fanOnly: "ファン限定",
        latest: "最新ブイログ",
        founderPath: "参加フロー",
        level: "Lv.",
        noLatest: "まだ公開ブイログがありません。",
        publicVlogs: "公開ブイログ",
        searchPlaceholder: "AIスター名・紹介・コードで検索",
        totalCharacters: "稼働中のAIスター",
      },
      sort: {
        "fan-only": "ファン限定が多い順",
        featured: "おすすめ順",
        latest: "最新の活動順",
        vlogs: "公開ブイログが多い順",
      },
      stats: {
        fanClub: "ファンクラブ会員",
        fanOnly: "ファン限定投稿",
        publicVlogs: "公開ブイログ",
        totalCharacters: "稼働中のAIスター",
      },
    },
    zh: {
      hero: {
        body: "查看 Vlog 和粉丝反应后选择一个。",
        eyebrow: "发现 AI 明星",
        title: "成长中的 AI 明星",
      },
      actions: {
        clear: "查看全部 AI 明星",
        feed: "Vlog 动态",
        open: "选择",
        search: "搜索",
        pickStar: "选择 AI 明星",
        start: "创建我的 AI 明星",
      },
      labels: {
        aiStarChannel: "AI 明星频道",
        fanClub: "粉丝俱乐部",
        fanOnly: "粉丝专属",
        latest: "最新 Vlog",
        founderPath: "参与流程",
        level: "Lv.",
        noLatest: "还没有公开 Vlog。",
        publicVlogs: "公开 Vlog",
        searchPlaceholder: "搜索 AI 明星名称、简介或代码",
        totalCharacters: "活跃 AI 明星",
      },
      sort: {
        "fan-only": "粉丝专属最多",
        featured: "推荐",
        latest: "最新活动",
        vlogs: "公开 Vlog 最多",
      },
      stats: {
        fanClub: "粉丝俱乐部成员",
        fanOnly: "粉丝专属内容",
        publicVlogs: "公开 Vlog",
        totalCharacters: "活跃 AI 明星",
      },
    },
    vi: {
      hero: {
        body: "Xem vlog và phản hồi của fan rồi chọn một ngôi sao.",
        eyebrow: "Khám phá AI Star",
        title: "AI Star đang phát triển",
      },
      actions: {
        clear: "Xem tất cả AI Star",
        feed: "Bảng tin vlog",
        open: "Chọn",
        search: "Tìm kiếm",
        pickStar: "Chọn AI Star",
        start: "Tạo AI Star của tôi",
      },
      labels: {
        aiStarChannel: "Kênh AI Star",
        fanClub: "Câu lạc bộ fan",
        fanOnly: "Chỉ fan",
        latest: "Vlog mới nhất",
        founderPath: "Lộ trình tham gia",
        level: "Lv.",
        noLatest: "Chưa có vlog công khai.",
        publicVlogs: "Vlog công khai",
        searchPlaceholder: "Tìm tên AI Star, giới thiệu hoặc mã",
        totalCharacters: "AI Star đang hoạt động",
      },
      sort: {
        "fan-only": "Nhiều nội dung fan nhất",
        featured: "Nổi bật",
        latest: "Hoạt động mới nhất",
        vlogs: "Nhiều vlog công khai nhất",
      },
      stats: {
        fanClub: "Thành viên CLB fan",
        fanOnly: "Bài chỉ fan",
        publicVlogs: "Vlog công khai",
        totalCharacters: "AI Star đang hoạt động",
      },
    },
    id: {
      hero: {
        body: "Lihat vlog dan respons fan, lalu pilih satu.",
        eyebrow: "Temukan AI Star",
        title: "AI Star yang berkembang",
      },
      actions: {
        clear: "Lihat semua AI Star",
        feed: "Feed vlog",
        open: "Pilih",
        search: "Cari",
        pickStar: "Pilih AI Star",
        start: "Buat AI Star saya",
      },
      labels: {
        aiStarChannel: "Kanal AI Star",
        fanClub: "Klub fan",
        fanOnly: "Khusus fan",
        latest: "Vlog terbaru",
        founderPath: "Alur partisipasi",
        level: "Lv.",
        noLatest: "Belum ada vlog publik.",
        publicVlogs: "Vlog publik",
        searchPlaceholder: "Cari nama AI Star, intro, atau kode",
        totalCharacters: "AI Star aktif",
      },
      sort: {
        "fan-only": "Paling banyak khusus fan",
        featured: "Unggulan",
        latest: "Aktivitas terbaru",
        vlogs: "Vlog publik terbanyak",
      },
      stats: {
        fanClub: "Anggota klub fan",
        fanOnly: "Postingan khusus fan",
        publicVlogs: "Vlog publik",
        totalCharacters: "AI Star aktif",
      },
    },
  };
  const o = overrides[locale];
  return o
    ? {
        ...base,
        actions: o.actions,
        hero: o.hero,
        labels: o.labels,
        sort: o.sort,
        stats: o.stats,
      }
    : base;
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
  page,
  query,
  referralCode,
  routePath,
  sort,
}: {
  page?: number | null;
  query?: string | null;
  referralCode: string | null;
  routePath: string;
  sort?: FanletterCharacterDirectorySort | null;
}) {
  return setPathSearchParams(
    buildPathWithReferral(routePath, referralCode),
    {
      page: page && page > 1 ? String(page) : null,
      q: query,
      sort: sort && sort !== "featured" ? sort : null,
    },
  );
}

function DirectoryHeader({
  locale,
  referralCode,
  routePath,
}: {
  locale: Locale;
  referralCode: string | null;
  routePath: string;
}) {
  const homeHref = buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const discoveryHref = getCharactersHref({ referralCode, routePath });
  const myAiHref = buildPathWithReferral(
    `/${locale}/fanletter/my-ai`,
    referralCode,
  );
  // '만들기' tab → creator activation hub (creator-unlock); hub links to /create.
  const createHref = buildPathWithReferral(
    `/${locale}/fanletter/creator-unlock`,
    referralCode,
  );

  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
      <Link className="flex min-h-11 min-w-0 items-center gap-2" href={homeHref}>
        <FanletterBrandMark className="size-9 shrink-0" />
        <span className="hidden truncate text-xl font-semibold tracking-tight text-black sm:inline">
          AIAVpark
        </span>
      </Link>

      <nav
        aria-label={locale === "ko" ? "핵심 여정" : "Primary journey"}
        className="hidden items-center gap-1.5 rounded-full border border-zinc-200 bg-white/72 p-1 text-xs font-semibold text-black/62 md:flex lg:gap-2 lg:text-sm"
      >
        <Link
          aria-current="page"
          className="inline-flex min-h-8 items-center rounded-full bg-black px-3 !text-white transition hover:bg-zinc-800"
          href={discoveryHref}
        >
          {getFanletterNavLabels(locale).browse}
        </Link>
        <Link
          className="inline-flex min-h-8 items-center rounded-full px-3 transition hover:bg-zinc-100 hover:text-black"
          href={myAiHref}
        >
          {getFanletterNavLabels(locale).myStars}
        </Link>
        <Link
          className="inline-flex min-h-8 items-center rounded-full px-3 transition hover:bg-zinc-100 hover:text-black"
          href={createHref}
        >
          {getFanletterNavLabels(locale).create}
        </Link>
      </nav>

      <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
        <FanletterGlobalLanguageSwitcher
          className="inline-flex sm:hidden"
          compact
          locale={locale}
          surface="light"
          tight
        />
        <FanletterGlobalLanguageSwitcher
          className="hidden sm:inline-flex"
          locale={locale}
          surface="light"
        />
        <FanletterAccountStatusLink
          className="max-w-[6.8rem] sm:max-w-[14rem]"
          locale={locale}
          referralCode={referralCode}
          surface="light"
        />
      </div>
    </header>
  );
}

function DirectoryControls({
  copy,
  data,
  referralCode,
  routePath,
}: {
  copy: CharacterDirectoryCopy;
  data: FanletterCharacterDirectoryPageData;
  referralCode: string | null;
  routePath: string;
}) {
  return (
    <div className="mb-5 rounded-[1.25rem] border border-black/10 bg-white p-3 shadow-[0_14px_42px_rgba(8,18,12,0.05)] sm:p-4">
      <form
        action={routePath}
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
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold !text-white transition hover:bg-black/82"
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
                  ? "border-black bg-black !text-white"
                  : "border-black/10 bg-[#f6f8f4] text-black/60 hover:border-black/24 hover:text-black",
              )}
              href={getCharactersHref({
                query: data.filters.query,
                referralCode,
                routePath,
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
            href={getCharactersHref({ referralCode, routePath })}
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
  priority,
}: {
  copy: CharacterDirectoryCopy;
  item: FanletterCharacterDirectoryItem;
  locale: Locale;
  nsfwOptInEnabled: boolean;
  priority?: boolean;
}) {
  const nsfwCopy = getFanletterNsfwCopy(locale);
  const imageUrl = item.latestCoverImageUrl ?? item.avatarImageUrl;
  const isNsfw = item.latestContentMaturityRating === "nsfw";
  const shouldBlur = isNsfw && !nsfwOptInEnabled;

  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-[linear-gradient(150deg,#0c1f14_0%,#0a1510_100%)]">
      {imageUrl ? (
        <>
          <Image
            alt={item.character.name}
            className={cn(
              "object-cover transition duration-500 group-hover:scale-[1.035]",
              shouldBlur && "scale-[1.04] blur-lg brightness-[0.72] saturate-[0.86]",
            )}
            fill
            priority={priority}
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            src={imageUrl}
          />
          {shouldBlur ? (
            <div className="pointer-events-none absolute inset-0 bg-black/18" />
          ) : null}
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(150deg,#0c1f14_0%,#17331f_55%,#0a1510_100%)] text-[#44f26e]">
          <span className="text-6xl font-bold leading-none tracking-tight text-[#8df3ad]">
            {item.character.name.trim().slice(0, 1) || "AI"}
          </span>
          <Sparkles className="size-7 opacity-70" />
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
  priority,
  referralCode,
}: {
  copy: CharacterDirectoryCopy;
  item: FanletterCharacterDirectoryItem;
  locale: Locale;
  nsfwOptInEnabled: boolean;
  priority?: boolean;
  referralCode: string | null;
}) {
  const channelHref = buildPathWithReferral(
    `/${locale}/fanletter/channel/${item.referralCode}`,
    referralCode ?? item.referralCode,
  );
  const latestDate = formatDate(item.latestPublishedAt, locale);
  const stats = [
    {
      label: copy.labels.publicVlogs,
      value: item.publicContentCount,
    },
    {
      label: copy.labels.fanClub,
      value: item.fanClubMemberCount,
    },
  ];

  return (
    <div className="relative min-w-0">
    <FanletterTrackedLink
      agentRank={{
        eventType: "ai_star_discovered",
        intent: "select_ai_star_from_discovery_card",
        source: "fanletter_home",
        starId: item.referralCode,
      }}
      className="group grid min-w-0 overflow-hidden rounded-[1.25rem] border border-black/10 bg-white shadow-[0_18px_48px_rgba(8,18,12,0.07)] transition hover:-translate-y-0.5 hover:border-[#16702e]/34 hover:shadow-[0_22px_58px_rgba(8,18,12,0.12)] sm:flex sm:flex-col"
      eventName="signup_cta_click"
      href={channelHref}
      metadata={{
        location: "fanletter_discovery_card",
        starId: item.referralCode,
      }}
      referralCode={referralCode}
    >
      <CharacterVisual
        copy={copy}
        item={item}
        locale={locale}
        nsfwOptInEnabled={nsfwOptInEnabled}
        priority={priority}
      />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <span className="relative -mt-10 flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-[#44f26e] text-lg font-semibold text-black shadow-[0_14px_28px_rgba(0,0,0,0.18)] sm:-mt-10">
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
              AI STAR
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold tracking-normal">
              {item.character.name}
            </h2>
          </div>
        </div>

        <p className="mt-4 line-clamp-2 text-sm font-medium leading-6 text-black/62 sm:min-h-[3rem]">
          {item.character.summary}
        </p>

        {item.character.traits.length > 0 ? (
          <div className="mt-3 hidden gap-1.5 overflow-hidden sm:flex">
            {item.character.traits.slice(0, 2).map((trait) => (
              <span
                className="truncate rounded-full border border-black/10 bg-[#f6f8f4] px-2.5 py-1 text-[0.64rem] font-semibold text-black/54"
                key={trait}
              >
                {trait}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          {stats.map((stat) => (
            <div className="rounded-lg bg-[#f6f8f4] p-2" key={stat.label}>
              <p className="text-lg font-semibold leading-none">
                {formatNumber(stat.value, locale)}
              </p>
              <p className="mt-1 truncate text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-black/42">
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
    </FanletterTrackedLink>
      <FanletterStarShareButton
        channelPath={channelHref}
        className="absolute right-3 top-3"
        locale={locale}
        referralCode={item.referralCode}
      />
    </div>
  );
}

function DirectoryPagination({
  data,
  locale,
  referralCode,
  routePath,
}: {
  data: FanletterCharacterDirectoryPageData;
  locale: Locale;
  referralCode: string | null;
  routePath: string;
}) {
  if (data.filters.pageCount <= 1) {
    return null;
  }

  const pages = Array.from({ length: data.filters.pageCount }, (_, index) => index + 1);

  return (
    <nav
      aria-label={locale === "ko" ? "AI 스타 발견 목록 페이지" : "AI Star discovery pages"}
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
                ? "border-black bg-black !text-white"
                : "border-black/10 bg-white text-black/58 hover:border-black/24 hover:text-black",
            )}
            href={getCharactersHref({
              page,
              query: data.filters.query,
              referralCode,
              routePath,
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
  routePath,
}: {
  data: FanletterCharacterDirectoryPageData;
  locale: Locale;
  referralCode: string | null;
  routePath?: string;
}) {
  const copy = getCopy(locale);
  const directoryRoutePath = routePath ?? `/${locale}/fanletter/characters`;
  const formattedHiddenCount = formatNumber(data.hiddenNsfwCount, locale);
  const shouldShowNsfwControl =
    data.hiddenNsfwCount > 0 || data.nsfwOptInEnabled;
  const heroSignals = [
    {
      label: copy.signpost.currentLabel,
      value: copy.signpost.currentValue,
    },
    {
      label: copy.signpost.nextLabel,
      value: copy.signpost.nextValue,
    },
    {
      label: copy.signpost.eventLabel,
      value: copy.signpost.eventValue,
    },
  ];

  return (
    <main className="fanletter-v2-surface min-h-screen overflow-x-hidden bg-white pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-black sm:pb-0">
      <section className="border-b border-black/10">
        <DirectoryHeader
          locale={locale}
          referralCode={referralCode}
          routePath={directoryRoutePath}
        />
        <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-7 pt-7 sm:px-6 sm:pb-9 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-center lg:px-8">
          <div className="min-w-0">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#16702e]">
              {copy.hero.eyebrow}
            </p>
            <h1 className="mt-3 max-w-4xl text-[2.15rem] font-semibold leading-[1.04] tracking-normal text-black [word-break:keep-all] sm:text-[3.1rem] lg:text-[3.5rem]">
              {copy.hero.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-black/60 [word-break:keep-all] sm:text-lg">
              {copy.hero.body}
            </p>
          </div>

          <div className="grid gap-2 rounded-[1.25rem] border border-black/10 bg-white p-3 shadow-[0_18px_52px_rgba(8,18,12,0.06)] sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl bg-[#44f26e] px-4 py-3 text-black sm:col-span-3 lg:col-span-1">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] opacity-70">
                {copy.stats.totalCharacters}
              </p>
              <p className="mt-1 text-2xl font-semibold leading-none">
                {formatNumber(data.stats.activeCharacterCount, locale)}
              </p>
            </div>
            {heroSignals.map((signal) => (
              <div
                className="min-w-0 rounded-2xl border border-black/10 bg-[#f6f8f4] px-4 py-3"
                key={signal.label}
              >
                <p className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-black/45">
                  {signal.label}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-black">
                  {signal.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="bg-[#f6f8f4] px-4 py-7 text-black sm:px-6 sm:py-10 lg:px-8"
        id="ai-star-results"
      >
        <div className="mx-auto max-w-7xl">
          <DirectoryControls
            copy={copy}
            data={data}
            referralCode={referralCode}
            routePath={directoryRoutePath}
          />

          {data.items.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.items.map((item, index) => (
                <CharacterCard
                  copy={copy}
                  item={item}
                  key={item.referralCode}
                  locale={locale}
                  nsfwOptInEnabled={data.nsfwOptInEnabled}
                  priority={index < 4}
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
                href={getCharactersHref({
                  referralCode,
                  routePath: directoryRoutePath,
                })}
              >
                {copy.actions.clear}
              </Link>
            </div>
          )}

          {shouldShowNsfwControl ? (
            <FanletterNsfwOptInControl
              className="mt-6 sm:mt-8"
              compact
              disabledBody={copy.nsfw.disabledBody}
              disabledTitle={copy.nsfw.disabledTitle}
              enabled={data.nsfwOptInEnabled}
              hiddenCount={data.hiddenNsfwCount}
              hiddenCountText={copy.nsfw.hiddenCountText(formattedHiddenCount)}
              locale={locale}
            />
          ) : null}

          <DirectoryPagination
            data={data}
            locale={locale}
            referralCode={referralCode}
            routePath={directoryRoutePath}
          />
        </div>
      </section>
    </main>
  );
}
