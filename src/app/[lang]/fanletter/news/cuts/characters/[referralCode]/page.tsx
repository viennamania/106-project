import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  ChevronRight,
  Clapperboard,
  Clock3,
  FileText,
  Images,
  Moon,
  Newspaper,
  PencilLine,
  PlayCircle,
  Radio,
  Sparkles,
  SunMedium,
  UsersRound,
} from "lucide-react";

import { FanletterAutoplayVideo } from "@/components/fanletter-autoplay-video";
import { FanletterNewsCharacterProfileImageSlider } from "@/components/fanletter-news-character-motion";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  createFanletterNewsPublicCutFeedItem,
} from "@/lib/fanletter-news-public-cuts";
import {
  normalizeFanletterNewsPublicCutSlotNumber,
} from "@/lib/fanletter-news-public-cuts-shared";
import {
  getFanletterNewsArticleDisplayTitle,
  getFanletterNewsBareArticleDisplayTitle,
  getFanletterNewsReportPreviewImageUrls,
} from "@/lib/fanletter-news-related";
import {
  getFanletterNewsReportById,
  getFanletterNewsReportsForCharacterChannel,
} from "@/lib/fanletter-news-report-service";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import {
  normalizeFanletterReturnToPath,
  readFanletterReferralCode,
  readFirstSearchParam,
} from "@/lib/fanletter-routing";
import {
  getFanletterCreatorPageData,
  getFanletterPublicContentDetail,
  type FanletterCreatorPageData,
  type FanletterPublicContentItem,
} from "@/lib/fanletter-content-service";
import {
  getContentSocialSummaryForViewer,
} from "@/lib/content-service";
import {
  createFanletterNewsSourceRevealState,
  type FanletterNewsSourceRevealState,
} from "@/lib/fanletter-news-source-reveal";
import { hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";
import { readMemberServerSession } from "@/lib/member-server-session";
import { normalizeShareId } from "@/lib/share-tracking";

type FanletterNewsCutCharacterChannelSearchParams = {
  cut?: string | string[];
  ref?: string | string[];
  returnTo?: string | string[];
  shareId?: string | string[];
  sourceReportId?: string | string[];
};

type CharacterAvatarImage = {
  label: string | null;
  url: string;
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        backToCuts: "컷 피드로 돌아가기",
        backToPlatform: "플랫폼으로 돌아가기",
        cutEyebrow: "보고 있던 리포터 컷",
        cutFallback: "컷 피드에서 선택한 장면을 기준으로 이어진 캐릭터 채널입니다.",
        cutTitle: (slot: string) => `${slot}번 컷에서 이어보기`,
        heroBody:
          "리포터 컷에서 관심이 생긴 AI 캐릭터의 뉴스, 원본 브이로그, 팬 반응을 한 화면에서 이어봅니다.",
        heroEyebrow: "Cut Feed Character Channel",
        latestNews: "같은 캐릭터 뉴스",
        latestNewsBody:
          "보고 있던 컷과 같은 캐릭터의 기사 흐름을 이어봅니다. 마음에 드는 장면은 컷 피드에서 바로 열어볼 수 있습니다.",
        latestNewsCta: "대표 뉴스 보기",
        latestNewsFeedCta: "컷 피드에서 이어보기",
        quickReportCta: "이 캐릭터로 4컷 기사 작성",
        latestVlogs: "최근 원본 브이로그",
        latestVlogsBody:
          "캐릭터의 원본 분위기를 영상 프리뷰로 먼저 확인하고, 마음에 드는 원본으로 팬 리포트를 작성할 수 있습니다.",
        latestVlogsCta: "원본 기반 기사 쓰기",
        metaDescription:
          "리포터 컷 피드에서 이어지는 AIAVpark News AI 캐릭터 채널입니다.",
        metaTitle: "컷 피드 캐릭터 채널",
        newsCount: "뉴스",
        noNews: "아직 같은 캐릭터 뉴스가 없습니다.",
        noVlogs: "아직 공개 브이로그가 없습니다.",
        publicVlogs: "원본",
        reporterCount: "팬 기자",
        routineAfternoon: "오후",
        routineAfternoonFallback: (name: string) =>
          `${name} 장면을 팬 기자가 리포트로 확장합니다.`,
        routineBody:
          "원본 브이로그가 올라오고, 팬 기자가 컷으로 포착하고, 팬 반응이 다시 캐릭터 채널로 쌓이는 흐름입니다.",
        routineCut: "컷",
        routineEvening: "밤",
        routineEveningFallback: (name: string) =>
          `${name}를 다시 보게 만드는 팬 반응이 모입니다.`,
        routineMorning: "오전",
        routineMorningFallback: (name: string) =>
          `${name}의 오늘 분위기를 원본 브이로그로 확인합니다.`,
        routineTitle: "윤서의 일상 리듬",
        routineTitleFor: (name: string) => `${name}의 일상 리듬`,
        usageFlow: "활용 흐름",
        sourceOpen: "원본 오픈",
        sourceOpenProgress: (count: string, threshold: string) =>
          `${count}/${threshold} 공개 완료`,
        unlockedVlogs: "언락된 브이로그",
        unlockedVlogsBody:
          "팬들이 보고싶어요를 채워 공개한 원본입니다. 컷 피드 안에서 바로 원본 영상을 이어보세요.",
        unlockedVlogsCta: "원본 영상 보기",
        unlockedVlogsEmpty: "아직 팬들이 열어 둔 원본 브이로그가 없습니다.",
        vlogPreview: "프리뷰 재생",
      }
    : {
        backToCuts: "Back to cut feed",
        backToPlatform: "Back to platform",
        cutEyebrow: "Reporter cut you were viewing",
        cutFallback:
          "This character channel continues from the cut selected in the feed.",
        cutTitle: (slot: string) => `Continue from cut ${slot}`,
        heroBody:
          "Keep exploring the AI character behind the reporter cut, with news, source vlogs, and fan reactions in one focused view.",
        heroEyebrow: "Cut Feed Character Channel",
        latestNews: "Same character news",
        latestNewsBody:
          "Continue the story flow for the same character behind the cut you were viewing.",
        latestNewsCta: "Open featured news",
        latestNewsFeedCta: "Continue in cut feed",
        quickReportCta: "Write a 4-cut report",
        latestVlogs: "Recent source vlogs",
        latestVlogsBody:
          "Preview the character's source mood, then turn a favorite vlog into a fan report.",
        latestVlogsCta: "Write from a source vlog",
        metaDescription:
          "An AIAVpark News AI character channel connected to the reporter cut feed.",
        metaTitle: "Cut Feed Character Channel",
        newsCount: "News",
        noNews: "No same-character news is ready yet.",
        noVlogs: "No public source vlogs are ready yet.",
        publicVlogs: "Sources",
        reporterCount: "Reporters",
        routineAfternoon: "Afternoon",
        routineAfternoonFallback: (name: string) =>
          `Fan reporters turn ${name}'s moments into reports.`,
        routineBody:
          "Source vlogs become reporter cuts, fan reports, and fan-open reactions that build the character channel.",
        routineCut: "Cut",
        routineEvening: "Night",
        routineEveningFallback: (name: string) =>
          `Fan reactions keep ${name}'s channel moving.`,
        routineMorning: "Morning",
        routineMorningFallback: (name: string) =>
          `Start with ${name}'s latest source vlog mood.`,
        routineTitle: "Daily rhythm",
        routineTitleFor: (name: string) => `${name}'s daily rhythm`,
        usageFlow: "Usage flow",
        sourceOpen: "Source open",
        sourceOpenProgress: (count: string, threshold: string) =>
          `${count}/${threshold} open`,
        unlockedVlogs: "Unlocked vlogs",
        unlockedVlogsBody:
          "Source vlogs opened by fan demand. Watch the full source inside the cut feed context.",
        unlockedVlogsCta: "Watch source",
        unlockedVlogsEmpty: "No fan-opened source vlogs are ready yet.",
        vlogPreview: "Preview",
      };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatDate(value: Date | string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getAvatarImages(
  character: FanletterCreatorPageData["profile"]["character"],
  avatarImageUrl: string | null,
) {
  const seen = new Set<string>();
  const images: CharacterAvatarImage[] = [];

  const addImage = (url?: string | null, label?: string | null) => {
    const normalizedUrl = url?.trim();

    if (!normalizedUrl || seen.has(normalizedUrl)) {
      return;
    }

    seen.add(normalizedUrl);
    images.push({
      label: label?.trim() || null,
      url: normalizedUrl,
    });
  };

  addImage(avatarImageUrl, null);
  character?.avatarImageSet.forEach((avatar) => {
    addImage(avatar.url, avatar.label);
  });

  return images;
}

function getUnoptimizedImageUrls(imageUrls: string[]) {
  return imageUrls.filter((imageUrl) =>
    shouldBypassFanletterImageOptimization(imageUrl),
  );
}

function getVlogPreviewVideoUrl(item: FanletterPublicContentItem | null) {
  return (
    item?.sourcePreviewVideoUrl?.trim() ||
    item?.primaryVideoUrl?.trim() ||
    null
  );
}

function getVlogContentHref({
  contentId,
  effectiveReferralCode,
  locale,
}: {
  contentId: string;
  effectiveReferralCode: string | null;
  locale: Locale;
}) {
  return buildPathWithReferral(
    `/${locale}/fanletter/content/${contentId}`,
    effectiveReferralCode,
  );
}

function readShareIdFromPath(path: string | null) {
  if (!path) {
    return null;
  }

  try {
    return normalizeShareId(
      new URL(path, "https://aiavpark.local").searchParams.get("shareId"),
    );
  } catch {
    return null;
  }
}

function getSourceCutNewsHref({
  contentId,
  cutSlotNumber,
  effectiveReferralCode,
  locale,
  reportId,
  shareId,
}: {
  contentId: string;
  cutSlotNumber: number | null;
  effectiveReferralCode: string | null;
  locale: Locale;
  reportId: string;
  shareId: string | null;
}) {
  return setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/cuts/${reportId}`,
      effectiveReferralCode,
    ),
    {
      cut: cutSlotNumber ? String(cutSlotNumber) : null,
      shareId,
      source: contentId,
    },
  );
}

async function getSourceRevealStatesByContentId({
  contentIds,
  viewerEmail,
}: {
  contentIds: string[];
  viewerEmail: string | null;
}) {
  const uniqueContentIds = [
    ...new Set(contentIds.map((contentId) => contentId.trim()).filter(Boolean)),
  ];

  if (uniqueContentIds.length === 0) {
    return new Map<string, FanletterNewsSourceRevealState>();
  }

  const rows = await Promise.all(
    uniqueContentIds.map(async (contentId) => {
      try {
        const social = await getContentSocialSummaryForViewer(
          contentId,
          viewerEmail,
        );

        return [
          contentId,
          createFanletterNewsSourceRevealState(social),
        ] as const;
      } catch {
        return null;
      }
    }),
  );

  const entries = rows.filter(
    (row): row is readonly [string, FanletterNewsSourceRevealState] =>
      Boolean(row),
  );

  return new Map(entries);
}

function ReportImageFadeKeyframes() {
  return (
    <style id="fanletter-news-image-fade-keyframes">{`
      @keyframes fanletter-news-image-fade {
        0% {
          opacity: 0;
        }

        5%,
        20% {
          opacity: 1;
        }

        27%,
        100% {
          opacity: 0;
        }
      }
    `}</style>
  );
}

function ReportPreviewMedia({
  alt,
  fallback,
  imageUrls,
  sizes,
}: {
  alt: string;
  fallback: ReactNode;
  imageUrls: string[];
  sizes: string;
}) {
  return imageUrls.length > 0 ? (
    <FanletterNewsCharacterProfileImageSlider
      alt={alt}
      imageClassName="h-full w-full object-cover"
      imageUrls={imageUrls}
      intervalMs={2200}
      pauseOnInteraction={false}
      sizes={sizes}
      transitionMode="css"
      unoptimizedImageUrls={getUnoptimizedImageUrls(imageUrls)}
    />
  ) : (
    fallback
  );
}

function VlogPreviewMedia({
  className,
  item,
  sizes,
}: {
  className: string;
  item: FanletterPublicContentItem;
  sizes: string;
}) {
  const previewVideoUrl = getVlogPreviewVideoUrl(item);

  return (
    <div
      className={`relative overflow-hidden border border-white/10 bg-black/30 ${className}`}
    >
      {previewVideoUrl ? (
        <>
          <FanletterAutoplayVideo
            ariaHidden
            className="absolute inset-0 h-full w-full object-cover"
            poster={item.coverImageUrl ?? undefined}
            src={previewVideoUrl}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.16)_50%,rgba(0,0,0,0.58)_100%)]" />
          <span className="pointer-events-none absolute left-2 top-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-full border border-white/18 bg-black/62 px-2 py-1 text-[0.56rem] font-black uppercase tracking-[0.08em] text-white backdrop-blur">
            <PlayCircle className="size-3 text-[#44f26e]" />
            Preview
          </span>
        </>
      ) : item.coverImageUrl ? (
        <Image
          alt=""
          className="object-cover"
          fill
          sizes={sizes}
          src={item.coverImageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(item.coverImageUrl)}
        />
      ) : (
        <Clapperboard className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-[#44f26e]" />
      )}
    </div>
  );
}

function getReturnHref({
  effectiveReferralCode,
  locale,
  returnToHref,
}: {
  effectiveReferralCode: string | null;
  locale: Locale;
  returnToHref: string | null;
}) {
  return (
    returnToHref ??
    buildPathWithReferral(`/${locale}/fanletter/news/cuts`, effectiveReferralCode)
  );
}

function isPlatformReturnPath(returnToHref: string | null, locale: Locale) {
  const pathname = returnToHref?.split(/[?#]/, 1)[0]?.replace(/\/+$/, "") ?? "";

  return pathname === `/${locale}/fanletter/news/platform`;
}

function getCutNewsHref({
  cutSlotNumber,
  effectiveReferralCode,
  locale,
  reportId,
}: {
  cutSlotNumber: number | null;
  effectiveReferralCode: string | null;
  locale: Locale;
  reportId: string;
}) {
  return setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/cuts/${reportId}`,
      effectiveReferralCode,
    ),
    {
      cut: cutSlotNumber ? String(cutSlotNumber) : null,
    },
  );
}

function getCharacterChannelHref({
  cutSlotNumber,
  effectiveReferralCode,
  locale,
  referralCode,
  returnToHref,
  sourceReportId,
}: {
  cutSlotNumber: number | null;
  effectiveReferralCode: string | null;
  locale: Locale;
  referralCode: string;
  returnToHref: string | null;
  sourceReportId: string | null;
}) {
  return setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/cuts/characters/${referralCode}`,
      effectiveReferralCode,
    ),
    {
      cut: cutSlotNumber ? String(cutSlotNumber) : null,
      returnTo: returnToHref,
      sourceReportId,
    },
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
}): Promise<Metadata> {
  const { lang, referralCode } = await params;

  if (!hasLocale(lang)) {
    return {};
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const normalizedReferralCode = normalizeReferralCode(referralCode);

  return {
    description: copy.metaDescription,
    title: normalizedReferralCode
      ? `${normalizedReferralCode} | ${copy.metaTitle}`
      : copy.metaTitle,
  };
}

export default async function LocalizedFanletterNewsCutCharacterChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
  searchParams: Promise<FanletterNewsCutCharacterChannelSearchParams>;
}) {
  const { lang, referralCode } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const normalizedCharacterReferralCode = normalizeReferralCode(referralCode);

  if (!normalizedCharacterReferralCode) {
    notFound();
  }

  const referralCodeFromQuery = readFanletterReferralCode(query.ref);
  const safeReturnToHref = normalizeFanletterReturnToPath(
    query.returnTo,
    locale,
  );
  const sourceReportId = readFirstSearchParam(query.sourceReportId)?.trim() ?? "";
  const sourceCutSlotNumber = normalizeFanletterNewsPublicCutSlotNumber(
    readFirstSearchParam(query.cut),
  );
  const inheritedShareId =
    normalizeShareId(readFirstSearchParam(query.shareId)) ??
    readShareIdFromPath(safeReturnToHref);
  const memberSession = await readMemberServerSession();
  const cookieStore = await cookies();
  const nsfwOptInEnabled = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );
  const [data, newsData, sourceReport] = await Promise.all([
    getFanletterCreatorPageData(
      locale,
      normalizedCharacterReferralCode,
      memberSession?.email ?? null,
      { includeNsfw: nsfwOptInEnabled },
    ),
    getFanletterNewsReportsForCharacterChannel({
      creatorReferralCode: normalizedCharacterReferralCode,
      limit: 96,
      locale,
    }),
    sourceReportId ? getFanletterNewsReportById(sourceReportId) : null,
  ]);

  if (!data) {
    notFound();
  }

  const effectiveReferralCode =
    referralCodeFromQuery ?? data.profile.referralCode;
  const returnHref = getReturnHref({
    effectiveReferralCode,
    locale,
    returnToHref: safeReturnToHref,
  });
  const isPlatformReturn = isPlatformReturnPath(safeReturnToHref, locale);
  const returnLabel = isPlatformReturn ? copy.backToPlatform : copy.backToCuts;
  const latestNewsReturnLabel = isPlatformReturn
    ? copy.backToPlatform
    : copy.latestNewsFeedCta;
  const characterChannelHref = getCharacterChannelHref({
    cutSlotNumber: sourceCutSlotNumber,
    effectiveReferralCode,
    locale,
    referralCode: normalizedCharacterReferralCode,
    returnToHref: safeReturnToHref,
    sourceReportId: sourceReportId || null,
  });
  const character = data.profile.character;
  const characterName = character?.name ?? data.profile.displayName;
  const characterSummary = character?.summary || data.profile.intro;
  const avatarImages = getAvatarImages(character, data.profile.avatarImageUrl);
  const heroImage = avatarImages[0]?.url ?? null;
  const localizedSourceReport =
    sourceReport?.locale === locale &&
    normalizeReferralCode(sourceReport.creatorReferralCode) ===
      normalizedCharacterReferralCode
      ? sourceReport
      : null;
  const sourceFeedItem = localizedSourceReport
    ? createFanletterNewsPublicCutFeedItem(localizedSourceReport)
    : null;
  const selectedSourceCut =
    sourceFeedItem && sourceCutSlotNumber
      ? sourceFeedItem.cuts.find((cut) => cut.slotNumber === sourceCutSlotNumber) ??
        sourceFeedItem.leadCut
      : (sourceFeedItem?.leadCut ?? null);
  const selectedCutSlotLabel = formatNumber(
    selectedSourceCut?.slotNumber ?? sourceCutSlotNumber ?? 1,
    locale,
  );
  const visibleReports = newsData.reports.slice(0, 3);
  const visibleVlogs = data.items
    .filter((item) => item.mediaType === "video")
    .slice(0, 3);
  const sourceRevealByContentId = await getSourceRevealStatesByContentId({
    contentIds: newsData.reports.map((report) => report.contentId),
    viewerEmail: memberSession?.email ?? null,
  });
  const unlockedReportByContentId = new Map<
    string,
    (typeof newsData.reports)[number]
  >();

  for (const report of newsData.reports) {
    const contentId = report.contentId.trim();
    const sourceReveal = sourceRevealByContentId.get(contentId);

    if (!contentId || !sourceReveal?.unlocked) {
      continue;
    }

    if (!unlockedReportByContentId.has(contentId)) {
      unlockedReportByContentId.set(contentId, report);
    }
  }

  const unlockedVlogItems = (
    await Promise.all(
      Array.from(unlockedReportByContentId.values())
        .slice(0, 4)
        .map(async (report) => {
          const item = await getFanletterPublicContentDetail(
            report.contentId,
            locale,
            memberSession?.email ?? null,
            {
              includeLockedPreviewVideo: true,
              includeNsfw: nsfwOptInEnabled,
            },
          );
          const sourceReveal = sourceRevealByContentId.get(report.contentId);

          if (!item || item.mediaType !== "video" || !sourceReveal) {
            return null;
          }

          return {
            href: getSourceCutNewsHref({
              contentId: item.contentId,
              cutSlotNumber: sourceCutSlotNumber,
              effectiveReferralCode,
              locale,
              reportId: report.reportId,
              shareId: inheritedShareId,
            }),
            item,
            report,
            sourceReveal,
          };
        }),
    )
  ).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const primaryRelatedReport = visibleReports[0] ?? null;
  const secondaryRelatedReports = visibleReports.slice(1, 3);
  const quickReportHref = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/reports/quick`,
      effectiveReferralCode,
    ),
    {
      contentId: visibleVlogs[0]?.contentId ?? null,
      q: visibleVlogs[0] ? null : characterName,
      reportStatus: "unreported",
      returnTo: characterChannelHref,
      sourceReveal: "opportunity",
    },
  );
  const primaryVlog = visibleVlogs[0] ?? null;
  const secondaryVlog = visibleVlogs[1] ?? primaryVlog;
  const primaryReport = visibleReports[0] ?? null;
  const secondaryReport = visibleReports[1] ?? primaryReport;
  const primaryReportImageUrls = primaryReport
    ? getFanletterNewsReportPreviewImageUrls(primaryReport)
    : [];
  const secondaryReportImageUrls = secondaryReport
    ? getFanletterNewsReportPreviewImageUrls(secondaryReport)
    : [];
  const routineItems = [
    {
      accentClassName: "border-amber-300/28 bg-amber-300/10 text-amber-200",
      dateLabel: formatDate(primaryVlog?.publishedAt ?? null, locale),
      fallbackIcon: <Clapperboard className="size-5" />,
      imageUrl: primaryVlog?.coverImageUrl ?? heroImage,
      kindLabel: copy.publicVlogs,
      previewVideoUrl: getVlogPreviewVideoUrl(primaryVlog),
      reportImageUrls: [],
      slotIcon: <SunMedium className="size-4" />,
      slotLabel: copy.routineMorning,
      title: primaryVlog?.title ?? copy.routineMorningFallback(characterName),
    },
    {
      accentClassName: "border-[#44f26e]/30 bg-[#44f26e]/12 text-[#9bffad]",
      dateLabel: formatDate(
        primaryReport?.sourcePublishedAt ?? primaryReport?.createdAt ?? null,
        locale,
      ),
      fallbackIcon: <Newspaper className="size-5" />,
      imageUrl:
        primaryReport?.coverImageUrl ?? selectedSourceCut?.imageUrl ?? heroImage,
      kindLabel: copy.latestNews,
      previewVideoUrl: null,
      reportImageUrls:
        primaryReportImageUrls.length > 0
          ? primaryReportImageUrls
          : selectedSourceCut?.imageUrl
            ? [selectedSourceCut.imageUrl]
            : [],
      slotIcon: <Clock3 className="size-4" />,
      slotLabel: copy.routineAfternoon,
      title: primaryReport
        ? getFanletterNewsBareArticleDisplayTitle(primaryReport.title)
        : copy.routineAfternoonFallback(characterName),
    },
    {
      accentClassName: "border-sky-300/28 bg-sky-300/10 text-sky-200",
      dateLabel: formatDate(
        secondaryVlog?.publishedAt ??
          secondaryReport?.sourcePublishedAt ??
          secondaryReport?.createdAt ??
          null,
        locale,
      ),
      fallbackIcon: <Radio className="size-5" />,
      imageUrl:
        secondaryVlog?.coverImageUrl ??
        secondaryReport?.coverImageUrl ??
        selectedSourceCut?.imageUrl ??
        heroImage,
      kindLabel: secondaryVlog ? copy.publicVlogs : copy.sourceOpen,
      previewVideoUrl: secondaryVlog
        ? getVlogPreviewVideoUrl(secondaryVlog)
        : null,
      reportImageUrls: secondaryVlog
        ? []
        : secondaryReportImageUrls.length > 0
          ? secondaryReportImageUrls
          : selectedSourceCut?.imageUrl
            ? [selectedSourceCut.imageUrl]
            : [],
      slotIcon: <Moon className="size-4" />,
      slotLabel: copy.routineEvening,
      title:
        secondaryVlog?.title ??
        (secondaryReport
          ? getFanletterNewsBareArticleDisplayTitle(secondaryReport.title)
          : copy.routineEveningFallback(characterName)),
    },
  ];
  const usageFlowItems = [
    {
      icon: <Clapperboard className="size-4" />,
      label: copy.publicVlogs,
      value: formatNumber(data.publicContentCount, locale),
    },
    {
      icon: <Images className="size-4" />,
      label: copy.routineCut,
      value: selectedCutSlotLabel,
    },
    {
      icon: <Newspaper className="size-4" />,
      label: copy.newsCount,
      value: formatNumber(newsData.reportCount, locale),
    },
    {
      icon: <BadgeCheck className="size-4" />,
      label: copy.sourceOpen,
      value: `${formatNumber(newsData.publicCount, locale)}/${formatNumber(
        newsData.reportCount,
        locale,
      )}`,
    },
  ];
  const statItems = [
    {
      icon: <Newspaper className="size-4" />,
      label: copy.newsCount,
      value: formatNumber(newsData.reportCount, locale),
    },
    {
      icon: <Clapperboard className="size-4" />,
      label: copy.publicVlogs,
      value: formatNumber(data.publicContentCount, locale),
    },
    {
      icon: <UsersRound className="size-4" />,
      label: copy.reporterCount,
      value: formatNumber(newsData.reporters.length, locale),
    },
    {
      icon: <BadgeCheck className="size-4" />,
      label: copy.sourceOpen,
      value: `${formatNumber(newsData.publicCount, locale)}/${formatNumber(
        newsData.reportCount,
        locale,
      )}`,
    },
  ];

  return (
    <main className="min-h-screen bg-[#050706] text-white">
      <ReportImageFadeKeyframes />
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-black shadow-[0_0_56px_rgba(0,0,0,0.42)] sm:border-x sm:border-white/10">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/72 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Link
              aria-label={returnLabel}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[#44f26e]/34 bg-[#44f26e]/14 !text-[#9bffad] transition hover:bg-[#44f26e] hover:!text-black"
              href={returnHref}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
                {copy.heroEyebrow}
              </p>
              <h1 className="truncate text-lg font-black leading-tight">
                {characterName}
              </h1>
            </div>
          </div>
        </header>

        <section className="relative min-h-[58dvh] overflow-hidden px-4 pb-5 pt-4">
          {heroImage ? (
            <>
              <Image
                alt=""
                aria-hidden="true"
                className="scale-110 object-cover object-top blur-2xl brightness-[0.36] saturate-[0.9]"
                fill
                priority
                sizes="430px"
                src={heroImage}
                unoptimized={shouldBypassFanletterImageOptimization(heroImage)}
              />
              <Image
                alt={characterName}
                className="object-cover object-top brightness-[0.9]"
                fill
                priority
                sizes="430px"
                src={heroImage}
                unoptimized={shouldBypassFanletterImageOptimization(heroImage)}
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-[#07110a]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/18 via-black/22 to-black" />
          <div className="relative z-10 flex min-h-[calc(58dvh-2rem)] flex-col justify-end">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#44f26e] px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.12em] text-black">
              <Sparkles className="size-3.5" />
              AI Character IP
            </div>
            <h2 className="mt-3 break-words text-[2.45rem] font-black leading-[0.98] [word-break:keep-all]">
              {characterName}
            </h2>
            <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-white/72 [word-break:keep-all]">
              {characterSummary || copy.heroBody}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {statItems.map((item) => (
                <div
                  className="min-w-0 rounded-2xl border border-white/12 bg-black/42 px-3 py-3 backdrop-blur-xl"
                  key={item.label}
                >
                  <div className="flex items-center gap-1.5 text-[#44f26e]">
                    {item.icon}
                    <span className="truncate text-[0.62rem] font-black uppercase tracking-[0.1em]">
                      {item.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-black">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
          <section className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.06]">
            <div className="border-b border-white/10 bg-black/24 px-3 py-3">
              <div className="flex items-center gap-2 text-[#44f26e]">
                <CalendarClock className="size-4" />
                <p className="text-[0.62rem] font-black uppercase tracking-[0.16em]">
                  {copy.routineTitleFor(characterName)}
                </p>
              </div>
              <p className="mt-1.5 text-xs font-semibold leading-5 text-white/60 [word-break:keep-all]">
                {copy.routineBody}
              </p>
            </div>

            <div className="space-y-2 p-3">
              {routineItems.map((item, index) => (
                <article
                  className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-3 rounded-xl border border-white/10 bg-black/32 p-2"
                  key={`${item.slotLabel}-${index}`}
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-white/8">
                    {item.previewVideoUrl ? (
                      <>
                        <FanletterAutoplayVideo
                          ariaHidden
                          className="absolute inset-0 h-full w-full object-cover"
                          poster={item.imageUrl ?? undefined}
                          src={item.previewVideoUrl}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.12)_45%,rgba(0,0,0,0.56)_100%)]" />
                        <span className="pointer-events-none absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/62 px-1.5 py-1 text-[0.5rem] font-black uppercase tracking-[0.08em] text-white backdrop-blur">
                          <PlayCircle className="size-2.5 text-[#44f26e]" />
                          Vlog
                        </span>
                      </>
                    ) : item.reportImageUrls.length > 0 ? (
                      <ReportPreviewMedia
                        alt={item.title}
                        fallback={
                          <span className="absolute left-1/2 top-1/2 inline-flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#44f26e]/12 text-[#44f26e]">
                            {item.fallbackIcon}
                          </span>
                        }
                        imageUrls={item.reportImageUrls}
                        sizes="4.25rem"
                      />
                    ) : item.imageUrl ? (
                      <Image
                        alt=""
                        className="object-cover"
                        fill
                        sizes="4.25rem"
                        src={item.imageUrl}
                        unoptimized={shouldBypassFanletterImageOptimization(
                          item.imageUrl,
                        )}
                      />
                    ) : (
                      <span className="absolute left-1/2 top-1/2 inline-flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#44f26e]/12 text-[#44f26e]">
                        {item.fallbackIcon}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 self-center">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.08em] ${item.accentClassName}`}
                      >
                        {item.slotIcon}
                        {item.slotLabel}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[0.58rem] font-black text-white/62">
                        {item.kindLabel}
                      </span>
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-sm font-black leading-tight [word-break:keep-all]">
                      {item.title}
                    </h3>
                    {item.dateLabel ? (
                      <p className="mt-1 text-[0.66rem] font-bold text-white/46">
                        {item.dateLabel}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            <div className="border-t border-white/10 bg-black/24 p-3">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-white/50">
                {copy.usageFlow}
              </p>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {usageFlowItems.map((item) => (
                  <div
                    className="min-w-0 rounded-xl border border-white/10 bg-white/[0.06] px-2 py-2 text-center"
                    key={item.label}
                  >
                    <div className="mx-auto flex size-8 items-center justify-center rounded-full bg-[#44f26e]/12 text-[#44f26e]">
                      {item.icon}
                    </div>
                    <p className="mt-1 truncate text-[0.55rem] font-black text-white/48">
                      {item.label}
                    </p>
                    <p className="mt-0.5 truncate text-[0.82rem] font-black text-white">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#44f26e]/24 bg-[#06120a] p-3">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#44f26e]">
              {copy.cutEyebrow}
            </p>
            <div className="mt-3 grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
              <div className="relative aspect-[9/16] overflow-hidden rounded-xl border border-white/12 bg-white/8">
                {selectedSourceCut ? (
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="6rem"
                    src={selectedSourceCut.imageUrl}
                    unoptimized={shouldBypassFanletterImageOptimization(
                      selectedSourceCut.imageUrl,
                    )}
                  />
                ) : (
                  <Images className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-[#44f26e]" />
                )}
              </div>
              <div className="min-w-0 self-end">
                <p className="text-sm font-black text-[#9bffad]">
                  {copy.cutTitle(selectedCutSlotLabel)}
                </p>
                <h3 className="mt-1 line-clamp-3 text-xl font-black leading-tight [word-break:keep-all]">
                  {localizedSourceReport
                    ? getFanletterNewsBareArticleDisplayTitle(
                        localizedSourceReport.title,
                      )
                    : characterName}
                </h3>
                <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-white/58 [word-break:keep-all]">
                  {localizedSourceReport?.dek || copy.cutFallback}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#44f26e]/24 bg-[#06120a] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[#44f26e]">
                  <BadgeCheck className="size-4" />
                  <h2 className="text-base font-black">{copy.unlockedVlogs}</h2>
                </div>
                <p className="mt-1 text-xs font-semibold leading-5 text-white/58 [word-break:keep-all]">
                  {copy.unlockedVlogsBody}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full bg-[#44f26e]/14 px-2.5 py-1 text-[0.68rem] font-black text-[#9bffad]">
                {formatNumber(unlockedVlogItems.length, locale)}
              </span>
            </div>

            {unlockedVlogItems.length > 0 ? (
              <div className="mt-3 space-y-2">
                {(() => {
                  const featured = unlockedVlogItems[0];
                  const openCountLabel = formatNumber(
                    Math.min(
                      featured.sourceReveal.count,
                      featured.sourceReveal.threshold,
                    ),
                    locale,
                  );
                  const thresholdLabel = formatNumber(
                    featured.sourceReveal.threshold,
                    locale,
                  );

                  return (
                    <Link
                      className="group grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 rounded-2xl border border-[#44f26e]/34 bg-black/32 p-2.5 text-white transition hover:border-[#44f26e]/70"
                      href={featured.href}
                    >
                      <VlogPreviewMedia
                        className="aspect-[9/14] rounded-xl"
                        item={featured.item}
                        sizes="7.5rem"
                      />
                      <div className="min-w-0 self-end">
                        <p className="inline-flex items-center gap-1 rounded-full bg-[#44f26e] px-2 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em] text-black">
                          <PlayCircle className="size-3" />
                          {copy.unlockedVlogsCta}
                        </p>
                        <h3 className="mt-2 line-clamp-3 text-lg font-black leading-tight [word-break:keep-all]">
                          {featured.item.title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-[0.72rem] font-bold leading-4 text-white/52 [word-break:keep-all]">
                          {getFanletterNewsBareArticleDisplayTitle(
                            featured.report.title,
                          )}
                        </p>
                        <p className="mt-2 text-[0.68rem] font-black text-[#9bffad]">
                          {copy.sourceOpenProgress(
                            openCountLabel,
                            thresholdLabel,
                          )}
                        </p>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[#9bffad]">
                          {copy.unlockedVlogsCta}
                          <ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })()}

                {unlockedVlogItems.length > 1 ? (
                  <div className="grid gap-2">
                    {unlockedVlogItems.slice(1).map(({ href, item, sourceReveal }) => {
                      const openCountLabel = formatNumber(
                        Math.min(sourceReveal.count, sourceReveal.threshold),
                        locale,
                      );
                      const thresholdLabel = formatNumber(
                        sourceReveal.threshold,
                        locale,
                      );

                      return (
                        <Link
                          className="grid grid-cols-[5.25rem_minmax(0,1fr)] gap-3 rounded-xl border border-white/10 bg-black/30 p-2 text-white transition hover:border-[#44f26e]/46"
                          href={href}
                          key={item.contentId}
                        >
                          <VlogPreviewMedia
                            className="aspect-[9/12] rounded-lg"
                            item={item}
                            sizes="5.25rem"
                          />
                          <div className="min-w-0 self-center">
                            <p className="line-clamp-2 text-sm font-black leading-tight [word-break:keep-all]">
                              {item.title}
                            </p>
                            <p className="mt-1 text-[0.66rem] font-black text-[#9bffad]">
                              {copy.sourceOpenProgress(
                                openCountLabel,
                                thresholdLabel,
                              )}
                            </p>
                            <span className="mt-2 inline-flex items-center gap-1 text-[0.72rem] font-black text-white/72">
                              {copy.unlockedVlogsCta}
                              <ChevronRight className="size-3" />
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-white/10 bg-black/28 p-4 text-sm font-semibold leading-6 text-white/58 [word-break:keep-all]">
                {copy.unlockedVlogsEmpty}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-white/12 bg-white/[0.06] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-black">{copy.latestNews}</h2>
                <p className="mt-1 text-xs font-semibold leading-5 text-white/56 [word-break:keep-all]">
                  {copy.latestNewsBody}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full bg-[#44f26e]/14 px-2.5 py-1 text-[0.68rem] font-black text-[#9bffad]">
                {formatNumber(visibleReports.length, locale)}
              </span>
            </div>

            {primaryRelatedReport ? (
              <div className="mt-3 space-y-2">
                {(() => {
                  const primaryReportHref = getCutNewsHref({
                    cutSlotNumber: sourceCutSlotNumber,
                    effectiveReferralCode,
                    locale,
                    reportId: primaryRelatedReport.reportId,
                  });

                  return (
                    <Link
                      className="group grid grid-cols-[6.25rem_minmax(0,1fr)] gap-3 rounded-2xl border border-[#44f26e]/28 bg-[#07130a] p-2.5 text-white transition hover:border-[#44f26e]/60"
                      href={primaryReportHref}
                    >
                      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-white/8">
                        <ReportPreviewMedia
                          alt={getFanletterNewsArticleDisplayTitle(
                            primaryRelatedReport.title,
                          )}
                          fallback={
                            <FileText className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-[#44f26e]" />
                          }
                          imageUrls={primaryReportImageUrls}
                          sizes="6.25rem"
                        />
                      </div>
                      <div className="min-w-0 self-end">
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
                          {copy.latestNewsCta}
                        </p>
                        <p className="mt-1 line-clamp-3 text-lg font-black leading-tight [word-break:keep-all]">
                          {getFanletterNewsArticleDisplayTitle(
                            primaryRelatedReport.title,
                          )}
                        </p>
                        <p className="mt-2 text-[0.68rem] font-bold text-white/50">
                          {formatDate(
                            primaryRelatedReport.sourcePublishedAt ??
                              primaryRelatedReport.createdAt,
                            locale,
                          )}
                        </p>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[#9bffad]">
                          {copy.latestNewsCta}
                          <ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })()}

                {secondaryRelatedReports.map((report) => {
                  const reportHref = getCutNewsHref({
                    cutSlotNumber: sourceCutSlotNumber,
                    effectiveReferralCode,
                    locale,
                    reportId: report.reportId,
                  });
                  const reportImageUrls =
                    getFanletterNewsReportPreviewImageUrls(report);

                  return (
                    <Link
                      className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 rounded-xl border border-white/10 bg-black/30 p-2 text-white"
                      href={reportHref}
                      key={report.reportId}
                    >
                      <div className="relative aspect-[9/14] overflow-hidden rounded-lg bg-white/8">
                        <ReportPreviewMedia
                          alt={getFanletterNewsArticleDisplayTitle(report.title)}
                          fallback={
                            <FileText className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-[#44f26e]" />
                          }
                          imageUrls={reportImageUrls}
                          sizes="5rem"
                        />
                      </div>
                      <div className="min-w-0 self-center">
                        <p className="line-clamp-2 text-sm font-black leading-tight [word-break:keep-all]">
                          {getFanletterNewsArticleDisplayTitle(report.title)}
                        </p>
                        <p className="mt-1 text-[0.68rem] font-bold text-white/50">
                          {formatDate(
                            report.sourcePublishedAt ?? report.createdAt,
                            locale,
                          )}
                        </p>
                      </div>
                    </Link>
                  );
                })}

                <div className="grid gap-2 pt-1">
                  <Link
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-black"
                    href={returnHref}
                  >
                    <Newspaper className="size-4" />
                    {latestNewsReturnLabel}
                  </Link>
                  <Link
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#44f26e]/28 bg-[#44f26e]/10 px-4 text-sm font-black !text-[#9bffad]"
                    href={quickReportHref}
                  >
                    <PencilLine className="size-4" />
                    {copy.quickReportCta}
                  </Link>
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-white/10 bg-black/28 p-4 text-sm font-semibold text-white/58">
                {copy.noNews}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-white/12 bg-white/[0.06] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-black">{copy.latestVlogs}</h2>
                <p className="mt-1 text-xs font-semibold leading-5 text-white/56 [word-break:keep-all]">
                  {copy.latestVlogsBody}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full bg-white/8 px-2.5 py-1 text-[0.68rem] font-black text-white/70">
                {formatNumber(visibleVlogs.length, locale)}
              </span>
            </div>

            {visibleVlogs.length > 0 ? (
              <div className="mt-3 space-y-2">
                {(() => {
                  const featuredVlog = visibleVlogs[0];
                  const featuredHref = getVlogContentHref({
                    contentId: featuredVlog.contentId,
                    effectiveReferralCode,
                    locale,
                  });

                  return (
                    <Link
                      className="group grid grid-cols-[7.25rem_minmax(0,1fr)] gap-3 rounded-2xl border border-[#44f26e]/24 bg-[#07130a] p-2.5 text-white transition hover:border-[#44f26e]/56"
                      href={featuredHref}
                    >
                      <VlogPreviewMedia
                        className="aspect-[9/14] rounded-xl"
                        item={featuredVlog}
                        sizes="7.25rem"
                      />
                      <div className="min-w-0 self-end">
                        <p className="inline-flex items-center gap-1 rounded-full bg-[#44f26e]/14 px-2 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em] text-[#9bffad]">
                          <PlayCircle className="size-3" />
                          {copy.vlogPreview}
                        </p>
                        <h3 className="mt-2 line-clamp-3 text-lg font-black leading-tight [word-break:keep-all]">
                          {featuredVlog.title}
                        </h3>
                        {formatDate(featuredVlog.publishedAt, locale) ? (
                          <p className="mt-2 text-[0.68rem] font-bold text-white/50">
                            {formatDate(featuredVlog.publishedAt, locale)}
                          </p>
                        ) : null}
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[#9bffad]">
                          {copy.latestVlogsCta}
                          <ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })()}

                {visibleVlogs.length > 1 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {visibleVlogs.slice(1).map((item) => (
                      <Link
                        className="min-w-0 rounded-xl border border-white/10 bg-black/30 p-2 text-white"
                        href={getVlogContentHref({
                          contentId: item.contentId,
                          effectiveReferralCode,
                          locale,
                        })}
                        key={item.contentId}
                      >
                        <VlogPreviewMedia
                          className="aspect-[3/4] rounded-lg"
                          item={item}
                          sizes="10rem"
                        />
                        <p className="mt-2 line-clamp-2 text-xs font-black leading-tight [word-break:keep-all]">
                          {item.title}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-white/10 bg-black/28 p-4 text-sm font-semibold text-white/58">
                {copy.noVlogs}
              </p>
            )}
            <Link
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 text-sm font-black !text-white"
              href={quickReportHref}
            >
              <PencilLine className="size-4 text-[#44f26e]" />
              {copy.latestVlogsCta}
            </Link>
          </section>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] border-t border-white/10 bg-black/76 px-4 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-3 backdrop-blur-xl">
          <div className="grid">
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-black"
              href={returnHref}
            >
              <ArrowLeft className="size-4" />
              {returnLabel}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
