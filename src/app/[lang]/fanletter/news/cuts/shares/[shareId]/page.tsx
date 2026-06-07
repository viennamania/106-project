import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  Images,
  MousePointerClick,
  Share2,
  Sparkles,
  Timer,
  UsersRound,
} from "lucide-react";

import {
  getFanletterNewsCutShareLinkDetail,
  type FanletterNewsCutShareLinkDetail,
} from "@/lib/fanletter-news-cut-share-links";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  normalizeFanletterReturnToPath,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";
import { normalizeShareId } from "@/lib/share-tracking";

type FanletterNewsCutShareDetailSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        averageDwell: "평균 체류",
        back: "공유 링크 목록",
        copiedCut: "공유 진입 컷",
        createdAt: "생성",
        cutDwell: "컷별 체류",
        cutDwellBody:
          "공유 링크 방문자가 각 이미지 컷에서 얼마나 오래 머물렀는지 평균 체류와 기록 수로 비교합니다.",
        cutDwellEmpty: "아직 컷별 체류 데이터가 없습니다.",
        cutDwellEvents: (count: string) => `${count}회`,
        cutDwellTotal: "전체 행동",
        cutDetail: "컷별 이미지와 반응",
        cutDetailBody:
          "공유 링크로 들어온 사용자가 각 컷에서 얼마나 조회하고 머물렀는지 이미지와 함께 확인합니다.",
        cutLabel: (slot: string) => `${slot}컷`,
        cutViews: "컷 조회",
        dwellEvents: "체류 기록",
        eventCount: "전체 행동",
        fanRequestAnonymous: "익명 팬",
        fanRequestCount: "팬 요청",
        fanRequestEmpty:
          "아직 이 공유 링크에서 남겨진 다음 브이로그 요청은 없습니다.",
        fanRequestSignalBody:
          "SNS 유입이 단순 조회에서 끝났는지, 아니면 AI 캐릭터의 다음 브이로그 소재로 전환됐는지 확인합니다.",
        fanRequestSignalTitle: "다음 브이로그 요청 전환",
        fanRequestSourceCut: (slot: string) => `${slot}컷에서 요청`,
        guestEvents: "비로그인 행동",
        heroBody:
          "이 공유 링크 하나에 대한 컷 소비, 원본 진입, 사용자 행동 흐름을 확인합니다.",
        heroEyebrow: "Share Link Detail",
        heroTitle: "공유 링크 상세",
        lastEvent: "최근 유입",
        loginBody:
          "공유 링크 상세는 링크를 발행한 회원만 볼 수 있습니다. 로그인한 뒤 다시 열어주세요.",
        loginTitle: "로그인이 필요합니다.",
        memberEvents: "회원 행동",
        metaDescription:
          "AIAVpark News 4컷 피드 공유 링크별 컷 이미지와 유입 행동 분석 화면입니다.",
        metaTitle: "공유 링크 상세 | AIAVpark News",
        noCuts: "표시할 컷 이미지가 없습니다.",
        noMemo: "메모 없음",
        openLink: "공유 링크 열기",
        partnerSignalBody:
          "팬이 공유한 4컷이 어떤 장면에서 멈춤, 원본 진입, 다음 소비를 만들었는지 AI 캐릭터 IP 반응 신호로 해석합니다.",
        partnerSignalTitle: "AI 캐릭터 IP 반응 스냅샷",
        report: "팬 리포트",
        signalStage: "신호 단계",
        signalStageCollecting: "수집 중",
        signalStageLearning: "학습 가능",
        signalStageValidated: "검증 신호",
        shareId: "공유 ID",
        sourceOpens: "원본 진입",
        sourceOpenRate: "원본 전환율",
        strongestCut: "가장 강한 컷",
        timelineLoads: "다음 로드",
        totalDwell: "총 체류",
        visitorMix: "SNS 게스트 비율",
      }
    : {
        averageDwell: "Avg. dwell",
        back: "Share link list",
        copiedCut: "Shared entry cut",
        createdAt: "Created",
        cutDwell: "Dwell by cut",
        cutDwellBody:
          "Compare how long share-link visitors stayed on each image cut by average dwell and records.",
        cutDwellEmpty: "No cut dwell data yet.",
        cutDwellEvents: (count: string) => `${count} records`,
        cutDwellTotal: "All actions",
        cutDetail: "Cut images and response",
        cutDetailBody:
          "Review how visitors viewed and stayed on each cut from this share link.",
        cutLabel: (slot: string) => `Cut ${slot}`,
        cutViews: "Cut views",
        dwellEvents: "Dwell records",
        eventCount: "All actions",
        fanRequestAnonymous: "Anonymous fan",
        fanRequestCount: "Fan requests",
        fanRequestEmpty:
          "No next-vlog requests have been submitted from this shared link yet.",
        fanRequestSignalBody:
          "See whether SNS traffic stops at views or turns into next-vlog material for the AI character.",
        fanRequestSignalTitle: "Next Vlog Request Conversion",
        fanRequestSourceCut: (slot: string) => `Requested from cut ${slot}`,
        guestEvents: "Guest actions",
        heroBody:
          "Review cut consumption, source opens, and behavior flow for this single shared link.",
        heroEyebrow: "Share Link Detail",
        heroTitle: "Share Link Detail",
        lastEvent: "Last traffic",
        loginBody:
          "Only the member who created this share link can view the detail. Sign in and open it again.",
        loginTitle: "Login required.",
        memberEvents: "Member actions",
        metaDescription:
          "A per-share AIAVpark News 4-cut feed analytics screen with cut images and behavior data.",
        metaTitle: "Share Link Detail | AIAVpark News",
        noCuts: "No cut images to show.",
        noMemo: "No note",
        openLink: "Open share link",
        partnerSignalBody:
          "Interpret where fan-shared cuts create pauses, source intent, and continued consumption as AI character IP response signals.",
        partnerSignalTitle: "AI Character IP Signal Snapshot",
        report: "Fan report",
        signalStage: "Signal stage",
        signalStageCollecting: "Collecting",
        signalStageLearning: "Learning-ready",
        signalStageValidated: "Validated signal",
        shareId: "Share ID",
        sourceOpens: "Source opens",
        sourceOpenRate: "Source-open rate",
        strongestCut: "Strongest cut",
        timelineLoads: "Next loads",
        totalDwell: "Total dwell",
        visitorMix: "SNS guest mix",
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

function formatPercent(value: number, locale: Locale) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0%";
  }

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: value < 10 ? 1 : 0,
    style: "percent",
  }).format(value);
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

function getStrongestCut(
  detail: FanletterNewsCutShareLinkDetail,
) {
  return detail.cuts.reduce<
    FanletterNewsCutShareLinkDetail["cuts"][number] | null
  >((strongestCut, cut) => {
    if (!strongestCut) {
      return cut;
    }

    const cutScore =
      cut.metrics.averageDwellMs * 2 +
      cut.metrics.totalDwellMs +
      cut.metrics.cutViews * 250;
    const strongestScore =
      strongestCut.metrics.averageDwellMs * 2 +
      strongestCut.metrics.totalDwellMs +
      strongestCut.metrics.cutViews * 250;

    return cutScore > strongestScore ? cut : strongestCut;
  }, null);
}

function getSignalStage(
  detail: FanletterNewsCutShareLinkDetail,
  copy: ReturnType<typeof getCopy>,
) {
  if (
    detail.metrics.eventCount >= 80 ||
    detail.metrics.dwellEvents >= 12 ||
    detail.metrics.sourceOpenClicks >= 4
  ) {
    return copy.signalStageValidated;
  }

  if (
    detail.metrics.eventCount >= 16 ||
    detail.metrics.dwellEvents >= 4 ||
    detail.metrics.cutViews >= 8
  ) {
    return copy.signalStageLearning;
  }

  return copy.signalStageCollecting;
}

function PartnerSignalSummary({
  copy,
  detail,
  locale,
}: {
  copy: ReturnType<typeof getCopy>;
  detail: FanletterNewsCutShareLinkDetail;
  locale: Locale;
}) {
  const strongestCut = getStrongestCut(detail);
  const sourceOpenRate =
    detail.metrics.cutViews > 0
      ? detail.metrics.sourceOpenClicks / detail.metrics.cutViews
      : 0;
  const guestRatio =
    detail.metrics.eventCount > 0
      ? detail.metrics.guestEvents / detail.metrics.eventCount
      : 0;
  const strongestCutLabel = strongestCut
    ? `${copy.cutLabel(formatNumber(strongestCut.slotNumber, locale))} · ${formatDuration(
        strongestCut.metrics.averageDwellMs,
        locale,
      )}`
    : "-";

  return (
    <section className="mt-5 rounded-[1.15rem] border border-[#44f26e]/20 bg-[linear-gradient(135deg,rgba(68,242,110,0.13),rgba(255,255,255,0.055)_38%,rgba(0,0,0,0.18))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-[#111510]">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-black leading-tight [word-break:keep-all]">
            {copy.partnerSignalTitle}
          </h2>
          <p className="mt-1 max-w-2xl text-sm font-bold leading-6 text-white/62 [word-break:keep-all]">
            {copy.partnerSignalBody}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label={copy.signalStage}
          locale={locale}
          value={getSignalStage(detail, copy)}
        />
        <MetricTile
          label={copy.strongestCut}
          locale={locale}
          value={strongestCutLabel}
        />
        <MetricTile
          label={copy.sourceOpenRate}
          locale={locale}
          value={formatPercent(sourceOpenRate, locale)}
        />
        <MetricTile
          label={copy.visitorMix}
          locale={locale}
          value={formatPercent(guestRatio, locale)}
        />
      </div>
    </section>
  );
}

function FanRequestSignalSummary({
  copy,
  detail,
  locale,
}: {
  copy: ReturnType<typeof getCopy>;
  detail: FanletterNewsCutShareLinkDetail;
  locale: Locale;
}) {
  const fanRequestCountLabel = formatNumber(detail.fanRequests.length, locale);

  return (
    <section className="mt-5 rounded-[1.15rem] border border-white/10 bg-[#070a08] p-4 shadow-[0_20px_62px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#9bffad]">
            {copy.fanRequestCount} {fanRequestCountLabel}
          </p>
          <h2 className="mt-1 text-xl font-black leading-tight [word-break:keep-all]">
            {copy.fanRequestSignalTitle}
          </h2>
          <p className="mt-1 max-w-2xl text-sm font-bold leading-6 text-white/58 [word-break:keep-all]">
            {copy.fanRequestSignalBody}
          </p>
        </div>
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#44f26e]/14 text-[#44f26e]">
          <Sparkles className="size-5" />
        </span>
      </div>
      {detail.fanRequests.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {detail.fanRequests.map((request) => {
            const sourceCutLabel = request.sourceCutSlotNumber
              ? copy.fanRequestSourceCut(
                  formatNumber(request.sourceCutSlotNumber, locale),
                )
              : copy.fanRequestCount;

            return (
              <article
                className="rounded-[0.95rem] border border-white/10 bg-white/[0.055] px-3 py-2.5"
                key={request.requestId}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[0.64rem] font-black uppercase tracking-[0.12em] text-[#9bffad]">
                    {request.requesterDisplayName || copy.fanRequestAnonymous}
                  </p>
                  <p className="shrink-0 text-[0.62rem] font-bold text-white/36">
                    {formatDate(request.createdAt, locale)}
                  </p>
                </div>
                <p className="mt-1.5 text-sm font-black leading-5 text-white [word-break:keep-all]">
                  {request.body}
                </p>
                <p className="mt-1 text-[0.65rem] font-bold text-white/42">
                  {sourceCutLabel}
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-[0.9rem] border border-white/8 bg-white/[0.045] px-3 py-2.5 text-sm font-bold leading-5 text-white/48 [word-break:keep-all]">
          {copy.fanRequestEmpty}
        </p>
      )}
    </section>
  );
}

function CutImageCard({
  copy,
  detail,
  isEntryCut,
  locale,
}: {
  copy: ReturnType<typeof getCopy>;
  detail: FanletterNewsCutShareLinkDetail["cuts"][number];
  isEntryCut: boolean;
  locale: Locale;
}) {
  const slotLabel = copy.cutLabel(formatNumber(detail.slotNumber, locale));

  return (
    <article className="overflow-hidden rounded-[1rem] border border-white/12 bg-[#090d0a] shadow-[0_18px_54px_rgba(0,0,0,0.28)]">
      <div className="relative aspect-[9/16] bg-black">
        <Image
          alt={slotLabel}
          className="object-cover"
          fill
          sizes="(min-width: 768px) 320px, 48vw"
          src={detail.imageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(detail.imageUrl)}
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/78 to-transparent p-3">
          <span className="rounded-full bg-[#44f26e] px-3 py-1 text-xs font-black text-[#111510]">
            {slotLabel}
          </span>
          {isEntryCut ? (
            <span className="rounded-full border border-[#44f26e]/42 bg-black/68 px-2.5 py-1 text-[0.62rem] font-black text-[#9bffad] backdrop-blur">
              {copy.copiedCut}
            </span>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        <MetricTile
          label={copy.cutViews}
          locale={locale}
          value={detail.metrics.cutViews}
        />
        <MetricTile
          label={copy.averageDwell}
          locale={locale}
          value={formatDuration(detail.metrics.averageDwellMs, locale)}
        />
        <MetricTile
          label={copy.dwellEvents}
          locale={locale}
          value={detail.metrics.dwellEvents}
        />
        <MetricTile
          label={copy.totalDwell}
          locale={locale}
          value={formatDuration(detail.metrics.totalDwellMs, locale)}
        />
      </div>
    </article>
  );
}

function CutDwellSummary({
  copy,
  detail,
  locale,
}: {
  copy: ReturnType<typeof getCopy>;
  detail: FanletterNewsCutShareLinkDetail;
  locale: Locale;
}) {
  const cuts = detail.cuts.length > 0 ? detail.cuts : [];
  const maxAverageDwellMs = cuts.reduce(
    (maxValue, cut) => Math.max(maxValue, cut.metrics.averageDwellMs),
    0,
  );

  return (
    <section className="mt-5 rounded-[1.15rem] border border-white/12 bg-[#090d0a] p-4 shadow-[0_18px_54px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
            {copy.cutDwell}
          </p>
          <p className="mt-1 max-w-2xl text-sm font-bold leading-6 text-white/58 [word-break:keep-all]">
            {copy.cutDwellBody}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-black text-white/36">
            {copy.cutDwellTotal}
          </p>
          <p className="mt-1 text-xl font-black text-white/72">
            {formatNumber(detail.metrics.eventCount, locale)}
          </p>
        </div>
      </div>
      {cuts.length > 0 ? (
        <div className="mt-5 space-y-4">
          {cuts.map((cut) => {
            const progress =
              maxAverageDwellMs > 0
                ? Math.max(
                    cut.metrics.averageDwellMs > 0 ? 8 : 0,
                    Math.round(
                      (cut.metrics.averageDwellMs / maxAverageDwellMs) * 100,
                    ),
                  )
                : 0;
            const countLabel = formatNumber(
              cut.metrics.dwellEvents || cut.metrics.cutViews,
              locale,
            );
            const slotLabel = copy.cutLabel(
              formatNumber(cut.slotNumber, locale),
            );

            return (
              <div
                className="grid grid-cols-[3rem_minmax(0,1fr)_5rem] items-center gap-3"
                key={`${detail.shareId}:dwell:${cut.slotNumber}`}
              >
                <span className="text-lg font-black text-white/62">
                  {slotLabel}
                </span>
                <div className="h-3 overflow-hidden rounded-full bg-white/12">
                  <div
                    className="h-full rounded-full bg-[#44f26e] shadow-[0_0_24px_rgba(68,242,110,0.28)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white/78">
                    {formatDuration(cut.metrics.averageDwellMs, locale)}
                  </p>
                  <p className="mt-0.5 text-xs font-black text-white/34">
                    {copy.cutDwellEvents(countLabel)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-[0.9rem] border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-white/48">
          {copy.cutDwellEmpty}
        </p>
      )}
    </section>
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

export default async function LocalizedFanletterNewsCutShareDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; shareId: string }>;
  searchParams: Promise<FanletterNewsCutShareDetailSearchParams>;
}) {
  const { lang, shareId } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const normalizedShareId = normalizeShareId(shareId);

  if (!normalizedShareId) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const backHref =
    normalizeFanletterReturnToPath(query.returnTo, locale) ??
    buildPathWithReferral(`/${locale}/fanletter/news/cuts/shares`, referralCode);
  const copy = getCopy(locale);
  const session = await readMemberServerSession();
  const detail = session?.email
    ? await getFanletterNewsCutShareLinkDetail({
        ownerEmail: session.email,
        shareId: normalizedShareId,
      })
    : null;

  if (session?.email && !detail) {
    notFound();
  }

  const title = detail?.reportTitle ?? detail?.reportId ?? normalizedShareId;

  return (
    <main className="min-h-dvh bg-[#050706] px-4 py-[calc(env(safe-area-inset-top)+1rem)] text-white">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 text-sm font-black !text-white transition hover:bg-white hover:!text-[#111510]"
          href={backHref}
        >
          <ArrowLeft className="size-4" />
          {copy.back}
        </Link>
        {!session?.email || !detail ? (
          <section className="mt-7 rounded-[1.15rem] border border-white/12 bg-white/[0.06] p-5">
            <h1 className="text-xl font-black">{copy.loginTitle}</h1>
            <p className="mt-2 text-sm font-bold leading-6 text-white/62 [word-break:keep-all]">
              {copy.loginBody}
            </p>
          </section>
        ) : (
          <>
            <section className="mt-7">
              <div className="inline-flex size-12 items-center justify-center rounded-full bg-[#44f26e] text-[#111510]">
                <Share2 className="size-6" />
              </div>
              <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[#9bffad]">
                {copy.heroEyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight tracking-normal [word-break:keep-all]">
                {copy.heroTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/62 [word-break:keep-all]">
                {copy.heroBody}
              </p>
            </section>
            <section className="mt-5 overflow-hidden rounded-[1.15rem] border border-white/12 bg-[#090d0a]">
              <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0">
                  <p className="truncate text-[0.66rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
                    {detail.memo || copy.noMemo}
                  </p>
                  <h2 className="mt-1 break-words text-xl font-black leading-tight [word-break:keep-all]">
                    {title}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-white/50">
                    <span>
                      {copy.shareId} {detail.shareId}
                    </span>
                    <span>
                      {copy.createdAt} {formatDate(detail.createdAt, locale)}
                    </span>
                  </div>
                </div>
                <Link
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black !text-[#111510] transition hover:bg-[#44f26e]"
                  href={detail.targetHref}
                >
                  {copy.openLink}
                  <ExternalLink className="size-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-4 sm:grid-cols-4">
                <MetricTile
                  label={copy.cutViews}
                  locale={locale}
                  value={detail.metrics.cutViews}
                />
                <MetricTile
                  label={copy.totalDwell}
                  locale={locale}
                  value={formatDuration(detail.metrics.totalDwellMs, locale)}
                />
                <MetricTile
                  label={copy.sourceOpens}
                  locale={locale}
                  value={detail.metrics.sourceOpenClicks}
                />
                <MetricTile
                  label={copy.timelineLoads}
                  locale={locale}
                  value={detail.metrics.loadMoreEvents}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-4 text-xs font-bold text-white/62 sm:grid-cols-4">
                <div className="inline-flex items-center gap-1.5">
                  <Eye className="size-3.5 text-[#44f26e]" />
                  {copy.eventCount} {formatNumber(detail.metrics.eventCount, locale)}
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <UsersRound className="size-3.5 text-[#44f26e]" />
                  {copy.guestEvents} {formatNumber(detail.metrics.guestEvents, locale)}
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <MousePointerClick className="size-3.5 text-[#44f26e]" />
                  {copy.memberEvents} {formatNumber(detail.metrics.memberEvents, locale)}
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <Timer className="size-3.5 text-[#44f26e]" />
                  {copy.lastEvent} {formatDate(detail.metrics.lastEventAt, locale)}
                </div>
              </div>
            </section>
            <PartnerSignalSummary
              copy={copy}
              detail={detail}
              locale={locale}
            />
            <FanRequestSignalSummary
              copy={copy}
              detail={detail}
              locale={locale}
            />
            <CutDwellSummary copy={copy} detail={detail} locale={locale} />
            <section className="mt-7">
              <div className="flex items-start gap-3">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-[#111510]">
                  <Images className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl font-black leading-tight">
                    {copy.cutDetail}
                  </h2>
                  <p className="mt-1 text-sm font-bold leading-6 text-white/58 [word-break:keep-all]">
                    {copy.cutDetailBody}
                  </p>
                </div>
              </div>
              {detail.cuts.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {detail.cuts.map((cut) => (
                    <CutImageCard
                      copy={copy}
                      detail={cut}
                      isEntryCut={cut.slotNumber === detail.cutSlotNumber}
                      key={`${detail.shareId}:${cut.slotNumber}`}
                      locale={locale}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-[1rem] border border-white/12 bg-white/[0.06] p-4 text-sm font-bold text-white/58">
                  {copy.noCuts}
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
