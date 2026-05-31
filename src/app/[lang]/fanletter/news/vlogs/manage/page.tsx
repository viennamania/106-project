import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Eye,
  FileVideo,
  ImageIcon,
  LayoutDashboard,
  LockKeyhole,
  Newspaper,
  Plus,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  WalletCards,
} from "lucide-react";

import { FanletterNewsReportsSessionBridge } from "@/components/fanletter-news-reports-session-bridge";
import {
  getContentVideoAssetSource,
  type ContentPriceType,
  type ContentPostStatus,
  type CreatorStudioPostRecord,
} from "@/lib/content";
import { getCreatorStudioPostsForMember } from "@/lib/content-service";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  getFanletterNewsVlogHref,
  getFanletterNewsVlogManageHref,
  getFanletterNewsVlogNewHref,
  getFanletterNewsVlogsHref,
} from "@/lib/fanletter-news-vlog-routing";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";
import { cn } from "@/lib/utils";

type FanletterNewsVlogManageSearchParams = {
  page?: string | string[];
  price?: string | string[];
  ref?: string | string[];
  status?: string | string[];
};

type VlogManageStatusFilter = ContentPostStatus | "all";
type VlogManagePriceFilter = ContentPriceType | "all";

const VLOG_MANAGE_PAGE_SIZE = 8;

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        actions: {
          activate: "뉴스 계정 활성화",
          allTools: "전체 편집 도구",
          connect: "뉴스 계정 연결",
          create: "새 브이로그 등록",
          frames: "프레임 관리",
          manage: "관리",
          newsHome: "뉴스 홈",
          newsView: "뉴스에서 보기",
          next: "다음",
          previous: "이전",
          publicArchive: "공개 브이로그 보기",
        },
        connectBody:
          "내 브이로그를 등록하고 뉴스 노출 상태를 관리하려면 FanLetter News 계정 연결이 필요합니다.",
        connectTitle: "내 브이로그 관리는 로그인 후 사용할 수 있습니다.",
        emptyBody:
          "아직 등록된 브이로그가 없습니다. 공개 브이로그를 먼저 등록하면 뉴스와 캐릭터 채널에서 바로 활용할 수 있습니다.",
        emptyTitle: "첫 브이로그를 등록해보세요.",
        filters: {
          all: "전체",
          archived: "보관",
          draft: "임시저장",
          free: "무료",
          paid: "유료",
          published: "공개",
        },
        heroBody:
          "내가 만든 공개 브이로그와 팬 전용 영상을 관리하고, 새 영상 등록과 프레임 편집으로 바로 이어갑니다.",
        heroEyebrow: "My FanLetter News Vlogs",
        heroTitle: "내 브이로그 관리",
        labels: {
          fanSignals: "팬 반응",
          filtered: "현재 목록",
          frames: "프레임",
          newsReports: "뉴스 리포트",
          previewMissing: "프리뷰 없음",
          previewReady: "프리뷰 있음",
          price: "가격",
          source: "소스",
          updated: "수정일",
        },
        readiness: {
          body:
            "가입 완료 상태가 확인되어야 내 브이로그 목록과 등록 도구를 사용할 수 있습니다.",
          title: "계정 활성화가 필요합니다.",
        },
        stats: {
          all: "전체",
          draft: "임시",
          free: "무료",
          paid: "유료",
          published: "공개",
        },
        title: "내 브이로그 관리 | FanLetter News",
      }
    : {
        actions: {
          activate: "Activate News account",
          allTools: "Full edit tools",
          connect: "Connect News account",
          create: "Register new vlog",
          frames: "Manage frames",
          manage: "Manage",
          newsHome: "News home",
          newsView: "View in News",
          next: "Next",
          previous: "Previous",
          publicArchive: "Public vlogs",
        },
        connectBody:
          "Connect your FanLetter News account to register your vlogs and manage News exposure.",
        connectTitle: "My vlog management requires sign-in.",
        emptyBody:
          "No vlogs are registered yet. Register a public vlog first so News and character channels can use it immediately.",
        emptyTitle: "Register your first vlog.",
        filters: {
          all: "All",
          archived: "Archived",
          draft: "Drafts",
          free: "Free",
          paid: "Paid",
          published: "Published",
        },
        heroBody:
          "Review your public vlogs and fan-only videos, then jump into new registration or frame editing from one mobile-first desk.",
        heroEyebrow: "My FanLetter News Vlogs",
        heroTitle: "My Vlog Desk",
        labels: {
          fanSignals: "Fan signals",
          filtered: "Current list",
          frames: "Frames",
          newsReports: "News reports",
          previewMissing: "No preview",
          previewReady: "Preview ready",
          price: "Price",
          source: "Source",
          updated: "Updated",
        },
        readiness: {
          body:
            "Completed signup is required before your vlog list and registration tools can open.",
          title: "Account activation is required.",
        },
        stats: {
          all: "All",
          draft: "Drafts",
          free: "Free",
          paid: "Paid",
          published: "Published",
        },
        title: "My Vlog Desk | FanLetter News",
      };
}

function readSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePage(value: string | string[] | undefined) {
  const parsed = Number(readSingleSearchParam(value));

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function normalizeStatusFilter(
  value: string | string[] | undefined,
): VlogManageStatusFilter {
  const normalized = readSingleSearchParam(value);

  return normalized === "archived" ||
    normalized === "draft" ||
    normalized === "published"
    ? normalized
    : "all";
}

function normalizePriceFilter(
  value: string | string[] | undefined,
): VlogManagePriceFilter {
  const normalized = readSingleSearchParam(value);

  return normalized === "free" || normalized === "paid" ? normalized : "all";
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getPostImageUrl(post: CreatorStudioPostRecord) {
  return post.coverImageUrl ?? post.contentImageUrls[0] ?? null;
}

function getPostFrameCount(post: CreatorStudioPostRecord) {
  return post.coverImageCandidates.filter((candidate) => candidate.source === "frame")
    .length;
}

function getPostVideoSourceLabel(post: CreatorStudioPostRecord, locale: Locale) {
  const source = getContentVideoAssetSource(post.contentVideoUrls[0] ?? null);

  if (locale === "ko") {
    return source === "uploaded" ? "업로드" : "AI 생성";
  }

  return source === "uploaded" ? "Uploaded" : "AI generated";
}

function getStatusClass(status: VlogManageStatusFilter) {
  if (status === "published") {
    return "border-[#19b84b]/24 bg-[#ecfff0] text-[#16702e]";
  }

  if (status === "draft") {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }

  if (status === "archived") {
    return "border-black/10 bg-black/[0.04] text-black/54";
  }

  return "border-black/10 bg-white text-black/54";
}

function getPriceClass(priceType: ContentPriceType) {
  return priceType === "paid"
    ? "border-[#111510]/12 bg-[#111510] text-white"
    : "border-[#19b84b]/24 bg-[#ecfff0] text-[#16702e]";
}

async function readVlogData({
  email,
  locale,
  page,
  price,
  status,
}: {
  email: string;
  locale: Locale;
  page: number;
  price: VlogManagePriceFilter;
  status: VlogManageStatusFilter;
}) {
  try {
    return await getCreatorStudioPostsForMember(email, {
      locale,
      media: "video",
      page,
      pageSize: VLOG_MANAGE_PAGE_SIZE,
      priceType: price,
      status,
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? (lang as Locale) : defaultLocale;
  const copy = getCopy(locale);

  return {
    description: copy.heroBody,
    robots: {
      follow: false,
      index: false,
    },
    title: copy.title,
  };
}

export default async function LocalizedFanletterNewsVlogManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsVlogManageSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const page = normalizePage(query.page);
  const status = normalizeStatusFilter(query.status);
  const price = normalizePriceFilter(query.price);
  const currentHref = getFanletterNewsVlogManageHref({
    locale,
    page,
    price,
    referralCode,
    status,
  });
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: currentHref },
  );
  const session = await readMemberServerSession();

  if (!session) {
    return (
      <main className="min-h-screen bg-[#eef1ec] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 text-[#111510] sm:px-6 sm:pb-12 lg:px-8">
        <FanletterNewsReportsSessionBridge
          hasServerSession={false}
          locale={locale}
          serverSessionEmail={null}
          serverSessionWalletAddress={null}
        />
        <section className="mx-auto max-w-3xl border border-black/12 bg-white p-5 shadow-[0_18px_46px_rgba(17,21,16,0.08)] sm:p-8">
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#111510] text-[#44f26e]">
            <WalletCards className="size-5" />
          </span>
          <h1 className="mt-4 text-2xl font-black tracking-normal [word-break:keep-all] sm:text-3xl">
            {copy.connectTitle}
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-black/58">
            {copy.connectBody}
          </p>
          <Link
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-black"
            href={connectHref}
          >
            {copy.actions.connect}
            <ArrowRight className="size-4 text-[#44f26e]" />
          </Link>
        </section>
      </main>
    );
  }

  const data = await readVlogData({
    email: session.email,
    locale,
    page,
    price,
    status,
  });
  const effectiveReferralCode = referralCode ?? data?.member.referralCode ?? null;
  const effectiveCurrentHref = getFanletterNewsVlogManageHref({
    locale,
    page,
    price,
    referralCode: effectiveReferralCode,
    status,
  });
  const createHref = getFanletterNewsVlogNewHref({
    locale,
    referralCode: effectiveReferralCode,
    returnToHref: effectiveCurrentHref,
  });
  const studioVlogsHref = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/studio/vlogs`,
      effectiveReferralCode,
    ),
    { returnTo: effectiveCurrentHref },
  );
  const publicVlogsHref = getFanletterNewsVlogsHref({
    locale,
    referralCode: effectiveReferralCode,
  });
  const activateHref = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/activate`,
      effectiveReferralCode,
    ),
    { returnTo: effectiveCurrentHref },
  );

  if (!data) {
    return (
      <main className="min-h-screen bg-[#eef1ec] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 text-[#111510] sm:px-6 sm:pb-12 lg:px-8">
        <FanletterNewsReportsSessionBridge
          hasServerSession
          locale={locale}
          serverSessionEmail={session.email}
          serverSessionWalletAddress={session.walletAddress}
          serverVloggerProfile={null}
        />
        <section className="mx-auto max-w-3xl border border-black/12 bg-white p-5 shadow-[0_18px_46px_rgba(17,21,16,0.08)] sm:p-8">
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#111510] text-[#44f26e]">
            <ShieldAlert className="size-5" />
          </span>
          <h1 className="mt-4 text-2xl font-black tracking-normal [word-break:keep-all] sm:text-3xl">
            {copy.readiness.title}
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-black/58">
            {copy.readiness.body}
          </p>
          <Link
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-black"
            href={activateHref}
          >
            {copy.actions.activate}
            <ArrowRight className="size-4 text-[#44f26e]" />
          </Link>
        </section>
      </main>
    );
  }

  const stats = [
    {
      label: copy.stats.all,
      value: data.summary.all,
    },
    {
      label: copy.stats.published,
      value: data.summary.published,
    },
    {
      label: copy.stats.draft,
      value: data.summary.draft,
    },
    {
      label: copy.stats.free,
      value: data.summary.free,
    },
    {
      label: copy.stats.paid,
      value: data.summary.paid,
    },
  ];
  const statusFilters: Array<{ label: string; value: VlogManageStatusFilter }> = [
    { label: copy.filters.all, value: "all" },
    { label: copy.filters.published, value: "published" },
    { label: copy.filters.draft, value: "draft" },
    { label: copy.filters.archived, value: "archived" },
  ];
  const priceFilters: Array<{ label: string; value: VlogManagePriceFilter }> = [
    { label: copy.filters.all, value: "all" },
    { label: copy.filters.free, value: "free" },
    { label: copy.filters.paid, value: "paid" },
  ];
  const pageInfo = data.pageInfo;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef1ec] px-4 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-4 text-[#111510] sm:px-6 sm:pb-12 lg:px-8">
      <FanletterNewsReportsSessionBridge
        hasServerSession
        locale={locale}
        serverSessionEmail={session.email}
        serverSessionWalletAddress={session.walletAddress}
        serverVloggerProfile={{
          avatarImageUrl:
            data.profile.avatarImageUrl ?? data.profile.avatarImageSet[0]?.url ?? null,
          displayName:
            data.profile.characterPersona?.name ?? data.profile.displayName,
          referralCode: data.profile.referralCode,
        }}
      />
      <section className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3 border-b border-black/12 pb-3">
          <Link
            className="inline-flex items-center gap-2 text-sm font-black !text-[#16702e]"
            href={newsHomeHref}
          >
            <ArrowLeft className="size-4" />
            {copy.actions.newsHome}
          </Link>
          <Link
            className="hidden h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 text-xs font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] sm:inline-flex"
            href={publicVlogsHref}
          >
            <Newspaper className="size-4 text-[#16702e]" />
            {copy.actions.publicArchive}
          </Link>
        </div>

        <div className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch">
          <section className="border border-black/12 bg-white p-5 shadow-[0_18px_46px_rgba(17,21,16,0.07)] sm:p-7">
            <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
              <FileVideo className="size-3.5" />
              {copy.heroEyebrow}
            </p>
            <h1 className="mt-4 max-w-3xl text-[2.05rem] font-black leading-[1.07] tracking-normal [word-break:keep-all] sm:text-[2.9rem]">
              {copy.heroTitle}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-black/60 sm:text-base sm:leading-7">
              {copy.heroBody}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {stats.map((item) => (
                <div
                  className="rounded-lg border border-black/10 bg-[#f6f8f4] p-3"
                  key={item.label}
                >
                  <p className="text-[0.64rem] font-black uppercase tracking-[0.08em] text-black/44">
                    {item.label}
                  </p>
                  <p className="mt-1 text-lg font-black text-[#111510]">
                    {formatNumber(item.value, locale)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <aside className="border border-black/12 bg-[#111510] p-5 text-white shadow-[0_18px_46px_rgba(17,21,16,0.16)]">
            <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
              <Sparkles className="size-3.5" />
              {locale === "ko" ? "등록과 관리" : "Register and manage"}
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-normal [word-break:keep-all]">
              {locale === "ko"
                ? "새 영상부터 프레임 편집까지 바로 이동"
                : "Jump from new upload to frame edits"}
            </h2>
            <div className="mt-5 grid gap-2">
              <Link
                className="inline-flex h-12 items-center justify-between gap-3 rounded-lg bg-[#44f26e] px-4 text-sm font-black !text-black transition hover:bg-[#69ff8c]"
                href={createHref}
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="size-4" />
                  {copy.actions.create}
                </span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-between gap-3 rounded-lg border border-white/12 bg-white/[0.06] px-4 text-sm font-black !text-white transition hover:bg-white/[0.1]"
                href={studioVlogsHref}
              >
                <span className="inline-flex items-center gap-2">
                  <LayoutDashboard className="size-4 text-[#44f26e]" />
                  {copy.actions.allTools}
                </span>
                <ArrowRight className="size-4 text-white/58" />
              </Link>
            </div>
          </aside>
        </div>

        <section className="border border-black/12 bg-white p-4 shadow-[0_16px_42px_rgba(17,21,16,0.08)] sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                <SlidersHorizontal className="size-3.5" />
                {copy.labels.filtered}
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-normal">
                {formatNumber(pageInfo.totalCount, locale)}{" "}
                {locale === "ko" ? "개 브이로그" : "vlogs"}
              </h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[30rem]">
              <div className="grid grid-cols-4 gap-1 rounded-lg bg-[#f2f4ef] p-1">
                {statusFilters.map((item) => {
                  const active = status === item.value;

                  return (
                    <Link
                      className={cn(
                        "inline-flex h-9 items-center justify-center rounded-md px-2 text-xs font-black !text-black/54 transition hover:bg-white",
                        active && "bg-[#111510] !text-white shadow-sm",
                      )}
                      href={getFanletterNewsVlogManageHref({
                        locale,
                        price,
                        referralCode: effectiveReferralCode,
                        status: item.value,
                      })}
                      key={item.value}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#f2f4ef] p-1">
                {priceFilters.map((item) => {
                  const active = price === item.value;

                  return (
                    <Link
                      className={cn(
                        "inline-flex h-9 items-center justify-center rounded-md px-2 text-xs font-black !text-black/54 transition hover:bg-white",
                        active && "bg-[#111510] !text-white shadow-sm",
                      )}
                      href={getFanletterNewsVlogManageHref({
                        locale,
                        price: item.value,
                        referralCode: effectiveReferralCode,
                        status,
                      })}
                      key={item.value}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {data.posts.length === 0 ? (
            <div className="mt-4 border border-dashed border-black/14 bg-[#f6f8f4] p-5 text-center">
              <Clapperboard className="mx-auto size-9 text-[#16702e]" />
              <h3 className="mt-3 text-xl font-black tracking-normal">
                {copy.emptyTitle}
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-black/56">
                {copy.emptyBody}
              </p>
              <Link
                className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-black"
                href={createHref}
              >
                <Plus className="size-4 text-[#44f26e]" />
                {copy.actions.create}
              </Link>
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {data.posts.map((post) => {
                const imageUrl = getPostImageUrl(post);
                const frameCount = getPostFrameCount(post);
                const canOpenInNews = post.status === "published";
                const newsVlogHref = getFanletterNewsVlogHref({
                  contentId: post.contentId,
                  locale,
                  referralCode: effectiveReferralCode,
                  returnToHref: effectiveCurrentHref,
                });
                const postManageHref = setPathSearchParams(studioVlogsHref, {
                  contentId: post.contentId,
                });
                const frameManageHref = setPathSearchParams(studioVlogsHref, {
                  contentId: post.contentId,
                  panel: "frames",
                });

                return (
                  <article
                    className="grid gap-3 rounded-lg border border-black/10 bg-[#fbfcfa] p-3 transition hover:border-[#19b84b]/40 sm:grid-cols-[11rem_minmax(0,1fr)]"
                    key={post.contentId}
                  >
                    <div className="relative aspect-video overflow-hidden rounded-md bg-[#111510]">
                      {imageUrl ? (
                        <Image
                          alt=""
                          className="h-full w-full object-cover"
                          fill
                          sizes="(max-width: 640px) 100vw, 176px"
                          src={imageUrl}
                          unoptimized={shouldBypassFanletterImageOptimization(
                            imageUrl,
                          )}
                        />
                      ) : (
                        <Clapperboard className="absolute inset-0 m-auto size-8 text-[#44f26e]" />
                      )}
                      {post.contentMaturityRating === "nsfw" ? (
                        <span className="absolute left-2 top-2 rounded-full bg-black/72 px-2 py-1 text-[0.58rem] font-black text-white">
                          NSFW
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={cn(
                            "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black",
                            getStatusClass(post.status),
                          )}
                        >
                          {post.status === "published" ? (
                            <CheckCircle2 className="size-3.5" />
                          ) : (
                            <LockKeyhole className="size-3.5" />
                          )}
                          {copy.filters[post.status]}
                        </span>
                        <span
                          className={cn(
                            "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black",
                            getPriceClass(post.priceType),
                          )}
                        >
                          {post.priceType === "paid"
                            ? copy.filters.paid
                            : copy.filters.free}
                        </span>
                        <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-black text-black/52">
                          <FileVideo className="size-3.5 text-[#16702e]" />
                          {getPostVideoSourceLabel(post, locale)}
                        </span>
                      </div>
                      <h3 className="mt-2 line-clamp-2 text-lg font-black leading-6 tracking-normal [word-break:keep-all]">
                        {post.title}
                      </h3>
                      {post.summary ? (
                        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-black/56 [word-break:keep-all]">
                          {post.summary}
                        </p>
                      ) : null}
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <VlogMetric
                          icon={<ImageIcon className="size-3.5" />}
                          label={copy.labels.frames}
                          value={formatNumber(frameCount, locale)}
                        />
                        <VlogMetric
                          icon={<Newspaper className="size-3.5" />}
                          label={copy.labels.newsReports}
                          value={formatNumber(post.newsReportCount, locale)}
                        />
                        <VlogMetric
                          icon={<Eye className="size-3.5" />}
                          label={copy.labels.fanSignals}
                          value={formatNumber(
                            post.social.likeCount + post.social.saveCount,
                            locale,
                          )}
                        />
                        <VlogMetric
                          icon={<FileVideo className="size-3.5" />}
                          label={
                            post.previewClipVideoUrl
                              ? copy.labels.previewReady
                              : copy.labels.previewMissing
                          }
                          value={formatDate(
                            post.publishedAt ?? post.updatedAt,
                            locale,
                          )}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {canOpenInNews ? (
                          <Link
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#111510] px-4 text-xs font-black !text-white transition hover:bg-black"
                            href={newsVlogHref}
                          >
                            {copy.actions.newsView}
                            <ArrowRight className="size-3.5 text-[#44f26e]" />
                          </Link>
                        ) : null}
                        <Link
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-xs font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                          href={postManageHref}
                        >
                          <LayoutDashboard className="size-3.5 text-[#16702e]" />
                          {copy.actions.manage}
                        </Link>
                        <Link
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-xs font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                          href={frameManageHref}
                        >
                          <ImageIcon className="size-3.5 text-[#16702e]" />
                          {copy.actions.frames}
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {pageInfo.totalPages > 1 ? (
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-black/10 pt-4">
              <Link
                aria-disabled={!pageInfo.hasPreviousPage}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-xs font-black transition",
                  pageInfo.hasPreviousPage
                    ? "border-black/10 bg-white !text-[#111510] hover:border-[#19b84b] hover:bg-[#ecfff0]"
                    : "pointer-events-none border-black/8 bg-black/[0.03] !text-black/28",
                )}
                href={getFanletterNewsVlogManageHref({
                  locale,
                  page: Math.max(1, pageInfo.page - 1),
                  price,
                  referralCode: effectiveReferralCode,
                  status,
                })}
              >
                <ArrowLeft className="size-3.5" />
                {copy.actions.previous}
              </Link>
              <span className="text-xs font-black text-black/46">
                {formatNumber(pageInfo.page, locale)} /{" "}
                {formatNumber(pageInfo.totalPages, locale)}
              </span>
              <Link
                aria-disabled={!pageInfo.hasNextPage}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-xs font-black transition",
                  pageInfo.hasNextPage
                    ? "border-black/10 bg-white !text-[#111510] hover:border-[#19b84b] hover:bg-[#ecfff0]"
                    : "pointer-events-none border-black/8 bg-black/[0.03] !text-black/28",
                )}
                href={getFanletterNewsVlogManageHref({
                  locale,
                  page: pageInfo.page + 1,
                  price,
                  referralCode: effectiveReferralCode,
                  status,
                })}
              >
                {copy.actions.next}
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function VlogMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-black/10 bg-white px-3 py-2">
      <p className="flex items-center gap-1.5 truncate text-[0.58rem] font-black uppercase tracking-[0.08em] text-black/36">
        <span className="text-[#16702e]">{icon}</span>
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-[#111510]">{value}</p>
    </div>
  );
}
