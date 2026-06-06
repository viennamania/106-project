import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  ExternalLink,
  MousePointerClick,
  Share2,
  Timer,
  UsersRound,
} from "lucide-react";

import {
  getFanletterNewsCutShareLinkDashboard,
  type FanletterNewsCutShareLinkDashboardItem,
} from "@/lib/fanletter-news-cut-share-links";
import {
  normalizeFanletterReturnToPath,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";

type FanletterNewsCutSharesSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        back: "4컷 피드로 돌아가기",
        averageDwell: "평균 체류",
        createdAt: "생성",
        cutDwell: "컷별 체류",
        cutDwellEmpty: "아직 컷별 체류 데이터가 없습니다.",
        cutDwellEvents: (count: string) => `${count}회`,
        cutLabel: (slot: string) => `${slot}컷`,
        cutViews: "컷 조회",
        emptyBody:
          "로그인 상태에서 4컷 피드의 공유 버튼을 누르고 메모를 남기면 이곳에 링크별 유입 흐름이 쌓입니다.",
        emptyTitle: "아직 관리 중인 공유 링크가 없습니다.",
        eventCount: "전체 행동",
        guestEvents: "비로그인 행동",
        heroBody:
          "SNS에 공유한 링크별로 컷 조회, 원본 진입, 다음 리포트 이동 흐름을 확인하세요.",
        heroEyebrow: "Share Analytics",
        heroTitle: "공유 링크 관리",
        lastEvent: "최근 유입",
        linkDetail: "링크 상세 보기",
        loginBody:
          "공유 링크 관리 페이지는 링크를 발행한 회원만 볼 수 있습니다. 4컷 피드에서 로그인한 뒤 다시 열어주세요.",
        loginTitle: "로그인이 필요합니다.",
        memberEvents: "회원 행동",
        metaDescription:
          "AIAVpark News 4컷 피드 공유 링크의 유입과 행동 패턴을 확인하는 관리 화면입니다.",
        metaTitle: "공유 링크 관리 | AIAVpark News",
        noMemo: "메모 없음",
        openLink: "공유 링크 열기",
        report: "팬 리포트",
        sourceOpens: "원본 진입",
        timelineLoads: "다음 로드",
        totalDwell: "총 체류",
      }
    : {
        back: "Back to 4-cut feed",
        averageDwell: "Avg. dwell",
        createdAt: "Created",
        cutDwell: "Dwell by cut",
        cutDwellEmpty: "No cut dwell data yet.",
        cutDwellEvents: (count: string) => `${count} events`,
        cutLabel: (slot: string) => `Cut ${slot}`,
        cutViews: "Cut views",
        emptyBody:
          "When you create a noted share link from the 4-cut feed, traffic and behavior metrics will appear here.",
        emptyTitle: "No managed share links yet.",
        eventCount: "All actions",
        guestEvents: "Guest actions",
        heroBody:
          "Review cut views, source opens, and next-report movement for each shared SNS link.",
        heroEyebrow: "Share Analytics",
        heroTitle: "Share Link Manager",
        lastEvent: "Last traffic",
        linkDetail: "View link detail",
        loginBody:
          "Only the member who created share links can view this dashboard. Sign in from the 4-cut feed and return here.",
        loginTitle: "Login required.",
        memberEvents: "Member actions",
        metaDescription:
          "A management dashboard for AIAVpark News 4-cut feed share link traffic and behavior patterns.",
        metaTitle: "Share Link Manager | AIAVpark News",
        noMemo: "No note",
        openLink: "Open share link",
        report: "Fan report",
        sourceOpens: "Source opens",
        timelineLoads: "Next loads",
        totalDwell: "Total dwell",
      };
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDuration(valueMs: number, locale: Locale) {
  if (!Number.isFinite(valueMs) || valueMs <= 0) {
    return "-";
  }

  const seconds = valueMs / 1000;

  if (seconds < 60) {
    const formattedSeconds = new Intl.NumberFormat(locale, {
      maximumFractionDigits: seconds < 10 ? 1 : 0,
    }).format(seconds);

    return locale === "ko" ? `${formattedSeconds}초` : `${formattedSeconds}s`;
  }

  const minutes = seconds / 60;
  const formattedMinutes = new Intl.NumberFormat(locale, {
    maximumFractionDigits: minutes < 10 ? 1 : 0,
  }).format(minutes);

  return locale === "ko" ? `${formattedMinutes}분` : `${formattedMinutes}m`;
}

function MetricTile({
  label,
  locale,
  value,
}: {
  label: string;
  locale: Locale;
  value: number | string;
}) {
  const displayValue =
    typeof value === "number" ? formatNumber(value, locale) : value;

  return (
    <div className="rounded-[0.85rem] border border-white/10 bg-white/[0.06] px-3 py-2.5">
      <p className="text-[0.64rem] font-black uppercase tracking-[0.12em] text-[#9bffad]">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-white">{displayValue}</p>
    </div>
  );
}

function ShareLinkCard({
  copy,
  detailHref,
  item,
  locale,
}: {
  copy: ReturnType<typeof getCopy>;
  detailHref: string;
  item: FanletterNewsCutShareLinkDashboardItem;
  locale: Locale;
}) {
  const title = item.reportTitle ?? item.reportId;
  const maxAverageDwellMs = item.metrics.cutDwell.reduce(
    (maxValue, cutMetric) => Math.max(maxValue, cutMetric.averageDwellMs),
    0,
  );
  const cutDwellBySlot = new Map(
    item.metrics.cutDwell.map((cutMetric) => [
      cutMetric.cutSlotNumber,
      cutMetric,
    ]),
  );

  return (
    <article className="rounded-[1.1rem] border border-white/12 bg-[#090d0a] p-4 shadow-[0_18px_54px_rgba(0,0,0,0.28)]">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-[#111510]">
          <Share2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.66rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
            {item.memo || copy.noMemo}
          </p>
          <h2 className="mt-1 break-words text-lg font-black leading-tight text-white [word-break:keep-all]">
            {title}
          </h2>
          <p className="mt-1 text-xs font-bold text-white/52">
            {copy.createdAt} {formatDate(item.createdAt, locale)}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MetricTile
          label={copy.cutViews}
          locale={locale}
          value={item.metrics.cutViews}
        />
        <MetricTile
          label={copy.averageDwell}
          locale={locale}
          value={formatDuration(item.metrics.averageDwellMs, locale)}
        />
        <MetricTile
          label={copy.sourceOpens}
          locale={locale}
          value={item.metrics.sourceOpenClicks}
        />
        <MetricTile
          label={copy.timelineLoads}
          locale={locale}
          value={item.metrics.loadMoreEvents}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-white/62">
        <div className="inline-flex items-center gap-1.5">
          <UsersRound className="size-3.5 text-[#44f26e]" />
          {copy.guestEvents} {formatNumber(item.metrics.guestEvents, locale)}
        </div>
        <div className="inline-flex items-center gap-1.5">
          <MousePointerClick className="size-3.5 text-[#44f26e]" />
          {copy.memberEvents} {formatNumber(item.metrics.memberEvents, locale)}
        </div>
        <div className="col-span-2 inline-flex items-center gap-1.5">
          <Timer className="size-3.5 text-[#44f26e]" />
          {copy.lastEvent} {formatDate(item.metrics.lastEventAt, locale)}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
            {copy.cutDwell}
          </p>
          <p className="text-xs font-bold text-white/44">
            {copy.eventCount} {formatNumber(item.metrics.eventCount, locale)}
          </p>
        </div>
        {item.metrics.cutDwell.length > 0 ? (
          [1, 2, 3, 4].map((slotNumber) => {
            const cutMetric = cutDwellBySlot.get(slotNumber);
            const progress =
              cutMetric && maxAverageDwellMs > 0
                ? Math.max(
                    8,
                    Math.round(
                      (cutMetric.averageDwellMs / maxAverageDwellMs) * 100,
                    ),
                  )
                : 0;

            return (
              <div
                className="grid grid-cols-[2.8rem_minmax(0,1fr)_4.8rem] items-center gap-2 text-xs font-bold"
                key={slotNumber}
              >
                <span className="text-white/58">
                  {copy.cutLabel(formatNumber(slotNumber, locale))}
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-[#44f26e]"
                    style={{ width: `${progress}%` }}
                  />
                </span>
                <span className="text-right text-white/70">
                  {formatDuration(cutMetric?.averageDwellMs ?? 0, locale)}
                </span>
                <span className="col-start-3 text-right text-[0.68rem] text-white/38">
                  {cutMetric
                    ? copy.cutDwellEvents(
                        formatNumber(cutMetric.dwellEvents, locale),
                      )
                    : ""}
                </span>
              </div>
            );
          })
        ) : (
          <p className="text-xs font-bold text-white/42">
            {copy.cutDwellEmpty}
          </p>
        )}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-[#111510] transition hover:bg-white"
          href={detailHref}
        >
          {copy.linkDetail}
          <BarChart3 className="size-4" />
        </Link>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black !text-[#111510] transition hover:bg-[#44f26e]"
          href={item.targetHref}
        >
          {copy.openLink}
          <ExternalLink className="size-4" />
        </Link>
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
    title: copy.metaTitle,
    description: copy.metaDescription,
    robots: {
      follow: false,
      index: false,
    },
  };
}

export default async function LocalizedFanletterNewsCutSharesPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsCutSharesSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const returnToHref =
    normalizeFanletterReturnToPath(query.returnTo, locale) ??
    buildPathWithReferral(`/${locale}/fanletter/news/cuts`, referralCode);
  const copy = getCopy(locale);
  const session = await readMemberServerSession();
  const items = session?.email
    ? await getFanletterNewsCutShareLinkDashboard({
        ownerEmail: session.email,
      })
    : [];
  const totalCutViews = items.reduce(
    (sum, item) => sum + item.metrics.cutViews,
    0,
  );
  const totalSourceOpens = items.reduce(
    (sum, item) => sum + item.metrics.sourceOpenClicks,
    0,
  );
  const totalDwellMs = items.reduce(
    (sum, item) => sum + item.metrics.totalDwellMs,
    0,
  );

  return (
    <main className="min-h-dvh bg-[#050706] px-4 py-[calc(env(safe-area-inset-top)+1rem)] text-white">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 text-sm font-black !text-white transition hover:bg-white hover:!text-[#111510]"
          href={returnToHref}
        >
          <ArrowLeft className="size-4" />
          {copy.back}
        </Link>
        <section className="mt-7">
          <div className="inline-flex size-12 items-center justify-center rounded-full bg-[#44f26e] text-[#111510]">
            <BarChart3 className="size-6" />
          </div>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[#9bffad]">
            {copy.heroEyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight tracking-normal">
            {copy.heroTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/62 [word-break:keep-all]">
            {copy.heroBody}
          </p>
        </section>
        {!session?.email ? (
          <section className="mt-7 rounded-[1.15rem] border border-white/12 bg-white/[0.06] p-5">
            <h2 className="text-xl font-black">{copy.loginTitle}</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-white/62 [word-break:keep-all]">
              {copy.loginBody}
            </p>
          </section>
        ) : (
          <>
            <section className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <MetricTile
                label={copy.cutViews}
                locale={locale}
                value={totalCutViews}
              />
              <MetricTile
                label={copy.totalDwell}
                locale={locale}
                value={formatDuration(totalDwellMs, locale)}
              />
              <MetricTile
                label={copy.sourceOpens}
                locale={locale}
                value={totalSourceOpens}
              />
            </section>
            {items.length > 0 ? (
              <section className="mt-5 grid gap-3">
                {items.map((item) => (
                  <ShareLinkCard
                    copy={copy}
                    detailHref={buildPathWithReferral(
                      `/${locale}/fanletter/news/cuts/shares/${encodeURIComponent(
                        item.shareId,
                      )}`,
                      referralCode,
                    )}
                    item={item}
                    key={item.shareId}
                    locale={locale}
                  />
                ))}
              </section>
            ) : (
              <section className="mt-7 rounded-[1.15rem] border border-white/12 bg-white/[0.06] p-5">
                <h2 className="text-xl font-black">{copy.emptyTitle}</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-white/62 [word-break:keep-all]">
                  {copy.emptyBody}
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
