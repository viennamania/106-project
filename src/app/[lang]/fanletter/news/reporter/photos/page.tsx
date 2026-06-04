import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  CircleUserRound,
  Crop,
  ImageIcon,
  Images,
  Newspaper,
  PenLine,
  Sparkles,
  WalletCards,
} from "lucide-react";

import { FanletterNewsReportsSessionBridge } from "@/components/fanletter-news-reports-session-bridge";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  getFanletterNewsReporterPhotoCollectionForMember,
  type FanletterNewsReporterPhotoCollectionItem,
} from "@/lib/fanletter-news-reporter-photo-collection";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";

type FanletterNewsReporterPhotosSearchParams = {
  page?: string | string[];
  ref?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        collectionTitle: "내 편집 컷 모음",
        connectBody:
          "내가 리포터로 만든 편집 컷을 보려면 AIAVpark News 계정 연결이 필요합니다.",
        connectCta: "뉴스 계정 연결",
        connectTitle: "포토 컬렉션은 로그인 후 확인할 수 있습니다.",
        description:
          "AIAVpark News 리포터가 직접 크롭해 만든 티저 컷을 한곳에서 감상하고 뉴스와 편집 화면으로 돌아가는 페이지입니다.",
        editCut: "컷 다시 편집",
        emptyBody:
          "아직 모아볼 편집 컷이 없습니다. 원본 브이로그 프레임을 크롭해 첫 팬 리포트를 만들면 이곳에 사진첩처럼 쌓입니다.",
        emptyCta: "새 리포트 작성",
        emptyTitle: "아직 편집 컷이 없습니다.",
        heroBody:
          "뉴스를 생산한 리포터도 콘텐츠 소비자입니다. 내가 프레임에서 크롭한 4컷을 한곳에 모아 다시 보고, 마음에 드는 컷에서 뉴스와 편집 화면으로 바로 돌아갑니다.",
        heroEyebrow: "Reporter Photo Collection",
        heroTitle: "리포터 포토 컬렉션",
        latestUpdate: "최근 업데이트",
        myHub: "내 뉴스 허브",
        newsHome: "AIAVpark News",
        openNews: "뉴스 보기",
        pageStatus: (current: string, total: string) =>
          `${current} / ${total} 페이지`,
        paginationLabel: "포토 컬렉션 페이지",
        photoFallback: "편집 컷 이미지",
        previous: "이전",
        next: "다음",
        reportDesk: "리포트 관리",
        reporterProfile: "내 리포터 프로필",
        slotLabel: (slot: string) => `컷 ${slot}`,
        stats: {
          characters: "캐릭터",
          photos: "편집 컷",
          reports: "리포트",
        },
        title: "리포터 포토 컬렉션 | AIAVpark News",
      }
    : {
        collectionTitle: "My edited cut collection",
        connectBody:
          "Connect your AIAVpark News account to view the edited cuts you created as a reporter.",
        connectCta: "Connect news account",
        connectTitle: "Photo collections require sign-in.",
        description:
          "An AIAVpark News reporter page for reviewing cropped teaser cuts and returning to news or editing.",
        editCut: "Edit cuts",
        emptyBody:
          "No edited cuts yet. Crop frames from a source vlog and publish your first fan report to build this collection.",
        emptyCta: "Create report",
        emptyTitle: "No edited cuts yet.",
        heroBody:
          "Reporters create the news, but they are also content consumers. Review every cropped teaser cut in one place and jump back to the news or edit flow.",
        heroEyebrow: "Reporter Photo Collection",
        heroTitle: "Reporter Photo Collection",
        latestUpdate: "Latest update",
        myHub: "My News Hub",
        newsHome: "AIAVpark News",
        openNews: "Open news",
        pageStatus: (current: string, total: string) =>
          `Page ${current} of ${total}`,
        paginationLabel: "Photo collection pages",
        photoFallback: "Edited cut image",
        previous: "Previous",
        next: "Next",
        reportDesk: "Report desk",
        reporterProfile: "My reporter profile",
        slotLabel: (slot: string) => `Cut ${slot}`,
        stats: {
          characters: "Characters",
          photos: "Edited cuts",
          reports: "Reports",
        },
        title: "Reporter Photo Collection | AIAVpark News",
      };
}

function readPageParam(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "1", 10);

  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.max(1, page);
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDate(value: Date | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(value);
}

function getPhotoCollectionHref({
  locale,
  page,
  referralCode,
}: {
  locale: Locale;
  page?: number;
  referralCode: string | null;
}) {
  return setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/reporter/photos`, referralCode),
    {
      page: page && page > 1 ? String(page) : null,
    },
  );
}

function getNewsHref(
  locale: Locale,
  reportId: string,
  referralCode: string | null,
) {
  return buildPathWithReferral(
    `/${locale}/fanletter/news/${reportId}`,
    referralCode,
  );
}

function getTeaserEditHref({
  locale,
  referralCode,
  reportId,
  returnTo,
}: {
  locale: Locale;
  referralCode: string | null;
  reportId: string;
  returnTo: string;
}) {
  return setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/${reportId}/teasers/edit`,
      referralCode,
    ),
    { returnTo },
  );
}

function PhotoCard({
  copy,
  locale,
  photo,
  referralCode,
  returnTo,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  photo: FanletterNewsReporterPhotoCollectionItem;
  referralCode: string | null;
  returnTo: string;
}) {
  const publishedAt = formatDate(photo.sourcePublishedAt ?? photo.reportCreatedAt, locale);
  const slotNumber = formatNumber(photo.slotNumber, locale).padStart(2, "0");
  const reportHref = getNewsHref(locale, photo.reportId, referralCode);
  const editHref = getTeaserEditHref({
    locale,
    referralCode,
    reportId: photo.reportId,
    returnTo,
  });

  return (
    <article className="group overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_14px_36px_rgba(17,21,16,0.06)]">
      <Link
        className="relative block aspect-[3/4] overflow-hidden bg-[#111510]"
        href={reportHref}
      >
        <Image
          alt={`${photo.reportTitle} ${copy.photoFallback}`}
          className="object-cover transition duration-500 group-hover:scale-[1.035]"
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          src={photo.imageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(photo.imageUrl)}
        />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/72 px-2.5 py-1 text-[0.62rem] font-black text-white backdrop-blur">
          <Crop className="size-3 text-[#44f26e]" />
          {copy.slotLabel(slotNumber)}
        </span>
        {photo.contentMaturityRating === "nsfw" ? (
          <span className="absolute right-2 top-2 rounded-full bg-rose-600 px-2.5 py-1 text-[0.6rem] font-black text-white">
            NSFW
          </span>
        ) : null}
      </Link>
      <div className="p-3">
        <p className="truncate text-[0.68rem] font-black uppercase tracking-[0.08em] text-[#16702e]">
          {photo.creatorName}
        </p>
        <h2 className="mt-1 line-clamp-2 min-h-[2.5rem] break-words text-sm font-black leading-5 [word-break:keep-all]">
          {photo.reportTitle}
        </h2>
        <p className="mt-1 truncate text-[0.68rem] font-bold text-black/44">
          {publishedAt ?? photo.reportId}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <Link
            className="inline-flex h-9 items-center justify-center gap-1 rounded-full bg-[#111510] px-2 text-[0.68rem] font-black !text-white transition hover:bg-black"
            href={reportHref}
          >
            <Newspaper className="size-3.5 text-[#44f26e]" />
            {copy.openNews}
          </Link>
          <Link
            className="inline-flex h-9 items-center justify-center gap-1 rounded-full border border-black/10 bg-[#f6f8f4] px-2 text-[0.68rem] font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
            href={editHref}
          >
            <PenLine className="size-3.5 text-[#16702e]" />
            {copy.editCut}
          </Link>
        </div>
      </div>
    </article>
  );
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
    title: copy.title,
    description: copy.description,
    robots: {
      follow: false,
      index: false,
    },
  };
}

export default async function LocalizedFanletterNewsReporterPhotosPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsReporterPhotosSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const currentPage = readPageParam(query.page);
  const requestedPhotosHref = getPhotoCollectionHref({
    locale,
    page: currentPage,
    referralCode,
  });
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: requestedPhotosHref },
  );
  const session = await readMemberServerSession();
  const data = session
    ? await getFanletterNewsReporterPhotoCollectionForMember({
        email: session.email,
        locale,
        page: currentPage,
      })
    : await getFanletterNewsReporterPhotoCollectionForMember({
        email: null,
        locale,
        page: currentPage,
      });
  const effectiveReferralCode = referralCode ?? data.member?.referralCode ?? null;
  const currentPhotosHref = getPhotoCollectionHref({
    locale,
    page: currentPage,
    referralCode: effectiveReferralCode,
  });
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    effectiveReferralCode,
  );
  const myHref = buildPathWithReferral(
    `/${locale}/fanletter/news/my`,
    effectiveReferralCode,
  );
  const reportsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports`,
    effectiveReferralCode,
  );
  const newReportHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports/new`,
    effectiveReferralCode,
  );

  if (data.member && data.reportCount > 0 && currentPage > data.pageCount) {
    redirect(
      getPhotoCollectionHref({
        locale,
        page: data.pageCount,
        referralCode: effectiveReferralCode,
      }),
    );
  }

  const latestUpdatedAt = formatDate(data.latestUpdatedAt, locale);
  const statItems = [
    {
      label: copy.stats.photos,
      value: formatNumber(data.photoCount, locale),
    },
    {
      label: copy.stats.reports,
      value: formatNumber(data.reportCount, locale),
    },
    {
      label: copy.stats.characters,
      value: formatNumber(data.characterCount, locale),
    },
  ];

  if (!session || !data.member) {
    return (
      <main className="min-h-screen bg-[#eef1ec] px-3 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-4 text-[#111510] sm:px-6 sm:pb-12 lg:px-8">
        <FanletterNewsReportsSessionBridge
          hasServerSession={Boolean(session)}
          locale={locale}
          serverSessionEmail={session?.email ?? null}
          serverSessionWalletAddress={session?.walletAddress ?? null}
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
            {copy.connectCta}
            <ArrowRight className="size-4 text-[#44f26e]" />
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef1ec] px-3 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-3 text-[#111510] sm:px-6 sm:pb-12 lg:px-8">
      <FanletterNewsReportsSessionBridge
        hasServerSession
        locale={locale}
        serverReporterProfile={{
          avatarImageUrl: data.member.avatarImageUrl,
          displayName: data.member.displayName,
          referralCode: data.member.referralCode,
        }}
        serverSessionEmail={session.email}
        serverSessionWalletAddress={session.walletAddress}
      />
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/12 pb-3">
          <Link
            className="inline-flex items-center gap-2 text-sm font-black !text-[#16702e]"
            href={newsHomeHref}
          >
            <Newspaper className="size-4" />
            {copy.newsHome}
          </Link>
          <div className="hidden items-center gap-2 sm:flex">
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 text-xs font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
              href={reportsHref}
            >
              <Newspaper className="size-4 text-[#16702e]" />
              {copy.reportDesk}
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 text-xs font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
              href={myHref}
            >
              <CircleUserRound className="size-4 text-[#16702e]" />
              {copy.myHub}
            </Link>
          </div>
        </div>

        <section className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-stretch">
          <div className="overflow-hidden rounded-lg bg-[#111510] p-5 text-white shadow-[0_18px_48px_rgba(17,21,16,0.16)] sm:p-7">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-[#44f26e]/24 bg-[#44f26e]/10 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
              <Images className="size-3.5" />
              {copy.heroEyebrow}
            </p>
            <h1 className="mt-5 max-w-4xl text-[2.15rem] font-black leading-[1.02] tracking-normal [word-break:keep-all] sm:text-[3.4rem]">
              {copy.heroTitle}
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-white/66 sm:text-base sm:leading-7">
              {copy.heroBody}
            </p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {statItems.map((item) => (
                <div
                  className="rounded-lg border border-white/10 bg-white/[0.06] p-3"
                  key={item.label}
                >
                  <p className="text-[0.58rem] font-black uppercase tracking-[0.08em] text-white/42 sm:text-[0.64rem]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xl font-black sm:text-2xl">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-black !text-[#111510] transition hover:bg-[#65ff86]"
                href={newReportHref}
              >
                <PenLine className="size-4" />
                {copy.emptyCta}
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-5 text-sm font-black !text-white transition hover:bg-white hover:!text-[#111510]"
                href={reportsHref}
              >
                <Newspaper className="size-4 text-[#44f26e]" />
                {copy.reportDesk}
              </Link>
            </div>
          </div>

          <aside className="rounded-lg border border-black/10 bg-white p-5 shadow-[0_16px_40px_rgba(17,21,16,0.08)]">
            <div className="flex items-start gap-3">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-black/10 bg-[#f6f8f4]">
                {data.member.avatarImageUrl ? (
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="64px"
                    src={data.member.avatarImageUrl}
                    unoptimized={shouldBypassFanletterImageOptimization(
                      data.member.avatarImageUrl,
                    )}
                  />
                ) : (
                  <CircleUserRound className="absolute inset-0 m-auto size-8 text-[#16702e]" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[0.66rem] font-black uppercase tracking-[0.1em] text-[#16702e]">
                  {copy.reporterProfile}
                </p>
                <h2 className="mt-1 truncate text-2xl font-black tracking-normal">
                  {data.member.displayName}
                </h2>
                <p className="mt-1 truncate text-xs font-bold text-black/42">
                  @{data.member.referralCode}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-[#19b84b]/16 bg-[#ecfff0] p-3">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-[#16702e]/70">
                  {copy.stats.photos}
                </p>
                <p className="mt-1 text-2xl font-black text-[#111510]">
                  {formatNumber(data.photoCount, locale)}
                </p>
              </div>
              <div className="rounded-lg border border-black/10 bg-[#f6f8f4] p-3">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-black/42">
                  {copy.stats.reports}
                </p>
                <p className="mt-1 text-2xl font-black">
                  {formatNumber(data.reportCount, locale)}
                </p>
              </div>
              <div className="col-span-2 rounded-lg border border-black/10 bg-[#f6f8f4] p-3">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-black/42">
                  {copy.latestUpdate}
                </p>
                <p className="mt-1 truncate text-sm font-black">
                  {latestUpdatedAt ?? "-"}
                </p>
              </div>
            </div>
          </aside>
        </section>

        {data.photos.length === 0 ? (
          <section className="rounded-lg border border-dashed border-black/16 bg-white p-6 text-center shadow-[0_18px_46px_rgba(17,21,16,0.06)]">
            <ImageIcon className="mx-auto size-9 text-[#16702e]" />
            <h2 className="mt-4 text-2xl font-black tracking-normal">
              {copy.emptyTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-black/58">
              {copy.emptyBody}
            </p>
            <Link
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-black"
              href={newReportHref}
            >
              {copy.emptyCta}
              <ArrowRight className="size-4 text-[#44f26e]" />
            </Link>
          </section>
        ) : (
          <>
            <section className="rounded-lg border border-black/10 bg-white p-3 shadow-[0_14px_36px_rgba(17,21,16,0.06)] sm:p-5">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2 sm:mb-5">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                    <Sparkles className="size-3.5" />
                    {copy.collectionTitle}
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-normal [word-break:keep-all]">
                    {formatNumber(data.photoCount, locale)} {copy.stats.photos}
                  </h2>
                </div>
                <p className="text-xs font-black text-black/42">
                  {copy.pageStatus(
                    formatNumber(currentPage, locale),
                    formatNumber(data.pageCount, locale),
                  )}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
                {data.photos.map((photo) => (
                  <PhotoCard
                    copy={copy}
                    key={photo.id}
                    locale={locale}
                    photo={photo}
                    referralCode={effectiveReferralCode}
                    returnTo={currentPhotosHref}
                  />
                ))}
              </div>
            </section>

            {data.pageCount > 1 ? (
              <nav
                aria-label={copy.paginationLabel}
                className="mt-5 flex flex-col gap-3 border-t border-black/12 pt-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm font-black text-black/48">
                  {copy.pageStatus(
                    formatNumber(currentPage, locale),
                    formatNumber(data.pageCount, locale),
                  )}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                  <Link
                    aria-disabled={currentPage <= 1}
                    className={`inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-black transition ${
                      currentPage <= 1
                        ? "pointer-events-none border-black/8 bg-white text-black/24"
                        : "border-black/12 bg-white !text-[#111510] hover:border-[#19b84b] hover:bg-[#ecfff0]"
                    }`}
                    href={getPhotoCollectionHref({
                      locale,
                      page: Math.max(1, currentPage - 1),
                      referralCode: effectiveReferralCode,
                    })}
                  >
                    {copy.previous}
                  </Link>
                  <Link
                    aria-disabled={currentPage >= data.pageCount}
                    className={`inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-black transition ${
                      currentPage >= data.pageCount
                        ? "pointer-events-none border-black/8 bg-white text-black/24"
                        : "border-black/12 bg-white !text-[#111510] hover:border-[#19b84b] hover:bg-[#ecfff0]"
                    }`}
                    href={getPhotoCollectionHref({
                      locale,
                      page: Math.min(data.pageCount, currentPage + 1),
                      referralCode: effectiveReferralCode,
                    })}
                  >
                    {copy.next}
                  </Link>
                </div>
              </nav>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
