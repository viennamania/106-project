import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Clapperboard,
  Clock3,
  FileText,
  Images,
  List,
  Newspaper,
  PenLine,
  Plus,
  Radio,
  Sparkles,
  UploadCloud,
  UserRound,
} from "lucide-react";

import { FanletterBrandMark } from "@/components/fanletter-brand-mark";
import { FanletterReputationTracker } from "@/components/fanletter-reputation-tracker";
import { FanletterServiceBridge } from "@/components/fanletter-service-bridge";
import { normalizeAgentRankCoverageAction } from "@/lib/agentrank/coverage-action";
import type { FanletterNewsReportDocument } from "@/lib/content";
import {
  getFanletterNewsReporterProfile,
  getLatestFanletterNewsReports,
  type FanletterNewsReporterProfile,
} from "@/lib/fanletter-news-report-service";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  getFanletterNewsCharacterStats,
  hydrateFanletterNewsCharacterStats,
  type FanletterNewsCharacterStat,
} from "@/lib/fanletter-news-character-directory";
import {
  getFanletterNsfwCopy,
} from "@/lib/fanletter-nsfw";
import {
  getFanletterNewsBareArticleDisplayTitle as getArticleDisplayTitle,
  getFanletterNewsReportPreviewImageUrl,
} from "@/lib/fanletter-news-related";
import {
  getFanletterNewsVlogManageHref,
  getFanletterNewsVlogStartHref,
  getFanletterNewsVlogsHref,
} from "@/lib/fanletter-news-vlog-routing";
import {
  isFanletterNewsCutFeedReturnPath,
  normalizeFanletterReturnToPath,
  readFanletterReferralCode,
  readFanletterStarId,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

type FanletterNewsHomeSearchParams = {
  coverageAction?: string | string[];
  ref?: string | string[];
  reporter?: string | string[];
  returnTo?: string | string[];
  starId?: string | string[];
};

type ReporterStat = {
  avatarImageUrl: string | null;
  count: number;
  firstReportCount: number;
  latestReportAt: Date | null;
  name: string;
  referralCode: string;
};

const CHARACTER_WIRE_REPORT_LIMIT = 9;
const LATEST_SECTION_REPORT_LIMIT = 8;
const PHOTO_DESK_REPORT_LIMIT = 4;

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        access: {
          nsfw: "성인 팬 전용",
          paid: "팬 전용",
          public: "공개",
        },
        allNews: "AIAVpark 노출력 뉴스룸",
        characterDirectory: {
          body:
            "뉴스가 나온 AI 캐릭터 채널을 모았습니다. 캐릭터별 최신 리포트와 팬 전용 브이로그 흐름을 바로 이어볼 수 있습니다.",
          cta: "뉴스 AI 캐릭터 전체 보기",
          eyebrow: "AI 캐릭터 프로필",
          fanOnly: "팬 전용",
          latest: "최근 뉴스",
          news: "뉴스",
          open: "캐릭터 채널 보기",
          profile: "프로필",
          title: "뉴스 속 AI 캐릭터",
        },
        characterWire: "AI 캐릭터 와이어",
        characterWireBody:
          "캐릭터별 최신 이슈를 와이어 서비스처럼 빠르게 훑어보고, 원본 공개 브이로그와 팬 전용 흐름을 이어서 확인하세요.",
        characterWireStats: {
          characters: "캐릭터",
          stories: "와이어",
        },
        dek:
          "팬 기자가 숏폼 원본을 4컷 리포트로 포장해 공유와 원본 소비로 이어주는 AIAVpark News입니다.",
        edition: "숏폼 노출·팬 리포트 전문 뉴스",
        emptyBody:
          "콘텐츠 상세 페이지에서 AI 리포트를 생성하면 이곳에 최신 뉴스가 모입니다.",
        emptyReporterBody: (name: string) =>
          `${name}가 만든 공개 뉴스가 아직 없습니다. 전체 뉴스룸에서 다른 팬 기자의 리포트를 먼저 확인해보세요.`,
        emptyReporterTitle: (name: string) => `${name}의 뉴스가 아직 없습니다.`,
        emptyTitle: "아직 공개된 AIAVpark 뉴스가 없습니다.",
        frontPage: {
          characters: "캐릭터 편집판",
          desk: "뉴스룸 데스크",
          deskBody:
            "리포터 활동, AI 캐릭터 이슈, 공개 뉴스 흐름, 원본 반응을 빠르게 훑습니다.",
          headlines: "주요 헤드라인",
          leadDeck:
            "빠르게 발행된 팬 리포트를 노출력 있는 리드와 주요 헤드라인으로 큐레이션하는 AIAVpark 뉴스 편집판입니다.",
          reporters: "리포터 편집판",
          title: "AIAVpark 노출력 편집판",
        },
        todayPortal: {
          body:
            "뉴스, 무료 프리뷰, 캐릭터 채널, 리포터 활동을 한 화면에 묶어 매일 확인하는 업데이트 포털로 전환합니다.",
          characterRank: "급상승 캐릭터 채널",
          ctaCharacters: "캐릭터 포털",
          ctaGallery: "티저 화보",
          ctaNews: "전체 업데이트",
          ctaReports: "리포터 참여",
          empty: "표시할 업데이트가 준비되는 중입니다.",
          eyebrow: "Daily Update Portal",
          freePreview: "무료로 먼저 보는 프리뷰",
          latest: "방금 올라온 업데이트",
          publicBadge: "무료 프리뷰",
          rank: "랭킹",
          reporterSignal: "리포터 기여",
          stats: {
            characters: "캐릭터 채널",
            freePreviews: "무료 프리뷰",
            reporters: "활동 리포터",
            updates: "오늘 볼 업데이트",
          },
          title: "오늘 업데이트만 훑어도 캐릭터 세계관이 이어집니다",
        },
        firstReport: "최초 리포트",
        heroEyebrow: "AIAVpark Entertainment News",
        issueLabel: "오늘의 AIAVpark 엔터테인먼트 브리핑",
        latest: "최근 발행 리포트",
        lead: "오늘의 리드",
        leadKicker: "AIAVpark exclusive",
        cutFeedCta: "리포터 컷 피드",
        navItems: [
          "톱뉴스",
          "티저 화보",
          "리포터 컷",
          "플랫폼 구조",
          "팬 기자",
          "AI 캐릭터",
          "브이로그",
          "구매함",
          "리포터 데스크",
          "마이",
        ],
        photoDesk: "포토 뉴스",
        photoDeskBody:
          "공유하기 좋은 커버와 4컷 뉴스를 포토 에디토리얼처럼 큐레이션합니다.",
        platformPitch: {
          body:
            "시장 문제, 제품 루프, 수익화 흐름, 방어력을 라이브 리포트와 캐릭터 채널 데이터로 설명하는 페이지입니다.",
          cta: "플랫폼 구조 보기",
          eyebrow: "Investor Brief",
          stats: {
            characters: "캐릭터 채널",
            previews: "원본 프리뷰",
            reports: "공개 리포트",
          },
          title: "투자자와 파트너에게 보여줄 AIAVpark 사업 구조",
        },
        producerDesk: {
          body:
            "뉴스를 보다가 PC에서 바로 리포트를 작성하거나 새 브이로그를 등록할 수 있습니다. 유입 흐름을 생산 작업으로 끊김 없이 이어갑니다.",
          eyebrow: "PC 작업 바로가기",
          note: "모바일은 하단 역할 버튼, PC는 이 작업 레일에서 바로 시작합니다.",
          reporter: {
            body:
              "브이로그 후보를 고르고 티저 컷 기반 노출 리포트를 바로 발행합니다.",
            label: "팬 기자",
            primary: "노출 리포트 작성",
            secondary: "리포트 관리",
            title: "새 리포트 작성",
          },
          title: "팬 기자와 브이로거의 노출 작업을 시작하세요",
          vlogger: {
            body:
              "AI 캐릭터 브이로그를 만들거나 직접 영상을 업로드해 뉴스와 공유 노출 준비를 이어갑니다.",
            label: "브이로거",
            primary: "동영상 업로드",
            secondary: "브이로그 관리",
            title: "새 브이로그 등록",
          },
        },
        newsroomStats: "뉴스룸 현황",
        newsroomStatLabels: {
          news: "뉴스",
          visuals: "포토",
          reporters: "기자",
        },
        nsfwControl: {
          disabledBody:
            "NSFW 뉴스는 목록에 유지하되 성인 팬 전용 커버와 뉴스 미리보기를 블러 처리합니다. 켜면 선명하게 표시됩니다.",
          disabledTitle: "NSFW 뉴스 미리보기 블러",
          enabledBody:
            "NSFW 뉴스 미리보기가 선명하게 표시됩니다. 끄면 다시 커버와 뉴스 미리보기가 블러 처리됩니다.",
          enabledTitle: "NSFW 뉴스 표시 중",
          hiddenCountText: (count: string) =>
            `블러 처리된 NSFW 뉴스 ${count}개`,
        },
        read: "뉴스 보기",
        returnToFeed: "4컷 피드로 돌아가기",
        returnToPrevious: "이전 화면으로 돌아가기",
        reporterFilter: {
          allNews: "전체 뉴스 보기",
          body: (count: string) =>
            `${count}개의 AI 캐릭터 리포트를 작성했습니다. 이 팬 기자가 만든 뉴스만 모아볼 수 있습니다.`,
          eyebrow: "팬 기자 채널",
          title: (name: string) => `${name}의 AIAVpark News`,
        },
        reporterDesk: "팬 기자 데스크",
        reporterFirstMetric: "선점",
        reporterNewsCta: "이 팬 기자 뉴스 보기",
        reporterReportUnit: "뉴스",
        reporterRank: "활동 기자",
        siteName: "AIAVpark News",
        ticker: "뉴스 브리핑",
        topStories: "주요 뉴스",
        wireLatest: "캐릭터별 최신",
      }
    : {
        access: {
          nsfw: "Adult fan-only",
          paid: "Fan-only",
          public: "Public",
        },
        allNews: "AIAVpark Exposure Newsroom",
        characterDirectory: {
          body:
            "Browse the AI character channels generating AIAVpark News, then jump into each character's latest reports and fan-only vlog stream.",
          cta: "All news AI characters",
          eyebrow: "AI Character Profiles",
          fanOnly: "Fan-only",
          latest: "Latest news",
          news: "News",
          open: "View character channel",
          profile: "Profile",
          title: "AI Characters In The News",
        },
        characterWire: "AI Character Wire",
        characterWireBody:
          "Scan the latest character-level issues like a wire service, then continue into source public vlogs and fan-only streams.",
        characterWireStats: {
          characters: "Characters",
          stories: "Wire",
        },
        dek:
          "AIAVpark News packages shortform source videos into four-cut reports that continue into sharing and source consumption.",
        edition: "Shortform exposure and fan-report news",
        emptyBody:
          "Create an AI report from a content detail page and the latest news will appear here.",
        emptyReporterBody: (name: string) =>
          `${name} has not published fan-reporter news yet. Browse the full newsroom for other fan reports.`,
        emptyReporterTitle: (name: string) =>
          `${name} has no news yet.`,
        emptyTitle: "No AIAVpark news has been published yet.",
        frontPage: {
          characters: "Character Edition",
          desk: "Newsroom Desk",
          deskBody:
            "Track reporter activity, AI character issues, public news flow, and source reactions.",
          headlines: "Major Headlines",
          leadDeck:
            "An AIAVpark news edition that curates fast-moving fan reports into exposure-ready leads and major headlines.",
          reporters: "Reporter Edition",
          title: "AIAVpark Exposure Edition",
        },
        todayPortal: {
          body:
            "News, free previews, character channels, and reporter activity are bundled into a daily update portal users can check repeatedly.",
          characterRank: "Rising character channels",
          ctaCharacters: "Character portals",
          ctaGallery: "Teaser gallery",
          ctaNews: "All updates",
          ctaReports: "Join reporters",
          empty: "Updates are being prepared.",
          eyebrow: "Daily Update Portal",
          freePreview: "Free previews first",
          latest: "Just-published updates",
          publicBadge: "Free preview",
          rank: "Rank",
          reporterSignal: "Reporter signal",
          stats: {
            characters: "Character channels",
            freePreviews: "Free previews",
            reporters: "Active reporters",
            updates: "Updates to watch",
          },
          title: "One daily scan should continue the character universe",
        },
        firstReport: "First report",
        heroEyebrow: "AIAVpark Entertainment News",
        issueLabel: "Today's AIAVpark entertainment briefing",
        latest: "Recently Published Reports",
        lead: "Lead News",
        leadKicker: "AIAVpark exclusive",
        cutFeedCta: "Reporter cuts",
        navItems: [
          "Top news",
          "Teaser gallery",
          "Reporter cuts",
          "Platform",
          "Fan reporters",
          "AI characters",
          "Vlogs",
          "Purchases",
          "Reporter desk",
          "My",
        ],
        photoDesk: "Photo Desk",
        photoDeskBody:
          "A polished editorial curation of share-ready covers and four-cut news moments.",
        platformPitch: {
          body:
            "A dedicated page that explains the market problem, product loop, monetization path, and moat using live reports and character-channel data.",
          cta: "View platform structure",
          eyebrow: "Investor Brief",
          stats: {
            characters: "Character channels",
            previews: "Source previews",
            reports: "Public reports",
          },
          title: "AIAVpark's business structure for investors and partners",
        },
        producerDesk: {
          body:
            "While reading News on desktop, jump straight into report writing or new vlog registration so traffic can continue into production.",
          eyebrow: "Desktop quick start",
          note: "Mobile keeps the role footer; desktop starts from this work rail.",
          reporter: {
            body:
              "Pick a source vlog and publish an exposure report from teaser cuts.",
            label: "Fan reporter",
            primary: "Write exposure report",
            secondary: "Report desk",
            title: "Create a report",
          },
          title: "Start fan reporter and vlogger exposure work immediately",
          vlogger: {
            body:
              "Create an AI character vlog or upload video, then prepare it for News and share exposure.",
            label: "Vlogger",
            primary: "Upload video",
            secondary: "Vlog desk",
            title: "Register a new vlog",
          },
        },
        newsroomStats: "Newsroom Status",
        newsroomStatLabels: {
          news: "News",
          visuals: "Photo",
          reporters: "Desk",
        },
        nsfwControl: {
          disabledBody:
            "NSFW news remains listed, with adult fan-only covers and news previews blurred until opt-in.",
          disabledTitle: "NSFW news previews blurred",
          enabledBody:
            "NSFW news previews are visible. Turn this off to blur covers and news previews again.",
          enabledTitle: "NSFW news visible",
          hiddenCountText: (count: string) => `${count} NSFW news items blurred`,
        },
        read: "Read news",
        returnToFeed: "Back to 4-cut feed",
        returnToPrevious: "Back",
        reporterFilter: {
          allNews: "All news",
          body: (count: string) =>
            `${count} AI character reports published. View only the news from this fan reporter.`,
          eyebrow: "Fan reporter channel",
          title: (name: string) => `${name}'s AIAVpark News`,
        },
        reporterDesk: "Fan Reporter Desk",
        reporterFirstMetric: "Scoops",
        reporterNewsCta: "View reporter news",
        reporterReportUnit: "News",
        reporterRank: "Active reporters",
        siteName: "AIAVpark News",
        ticker: "News Briefing",
        topStories: "Top Stories",
        wireLatest: "Latest By Character",
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

function getReporterDisplayName(report: FanletterNewsReportDocument) {
  const reporterName = report.reporterName.trim();

  if (reporterName) {
    return reporterName;
  }

  const reporterId = report.reporterReferralCode.trim();

  return report.locale === "ko"
    ? `${reporterId} 팬 기자`
    : `Fan reporter ${reporterId}`;
}

function getReporterFallbackDisplayName(locale: Locale, referralCode: string) {
  return locale === "ko"
    ? `${referralCode} 팬 기자`
    : `Fan reporter ${referralCode}`;
}

function getReportHref(
  report: FanletterNewsReportDocument,
  referralCode: string | null,
) {
  return buildPathWithReferral(
    `/${report.locale}/fanletter/news/${report.reportId}`,
    referralCode,
  );
}

function getReporterNewsHref(
  locale: Locale,
  reporterReferralCode: string,
  referralCode: string | null,
) {
  return buildPathWithReferral(
    `/${locale}/fanletter/news/reporters/${encodeURIComponent(
      reporterReferralCode,
    )}`,
    referralCode,
  );
}

function getAccessLabel(
  report: FanletterNewsReportDocument,
  copy: ReturnType<typeof getCopy>,
) {
  if (report.contentMaturityRating === "nsfw") {
    return copy.access.nsfw;
  }

  return report.priceType === "paid" ? copy.access.paid : copy.access.public;
}

function isNsfwReport(report: FanletterNewsReportDocument) {
  return report.contentMaturityRating === "nsfw";
}

function shouldBlurReport(
  report: FanletterNewsReportDocument,
  nsfwOptInEnabled: boolean,
) {
  return isNsfwReport(report) && !nsfwOptInEnabled;
}

function isEditorialSafeReport(report: FanletterNewsReportDocument) {
  return !isNsfwReport(report);
}

function isFirstNewsReport(report: FanletterNewsReportDocument) {
  return (
    (
      report as FanletterNewsReportDocument & {
        firstNewsReportForContent?: boolean;
      }
    ).firstNewsReportForContent === true
  );
}

function isPreferredLeadReport(report: FanletterNewsReportDocument) {
  const title = `${report.title} ${report.sourceTitle}`;

  return (
    isEditorialSafeReport(report) &&
    Boolean(report.coverImageUrl) &&
    !title.toLowerCase().includes("fanletter ai 팬 리포트") &&
    !title.toLowerCase().includes("fanletter ai fan report")
  );
}

function isPreferredFirstLeadReport(report: FanletterNewsReportDocument) {
  return isFirstNewsReport(report) && isPreferredLeadReport(report);
}

function getFirstNewsPromotedReports(reports: FanletterNewsReportDocument[]) {
  return [...reports].sort((left, right) => {
    const firstReportDelta =
      Number(isFirstNewsReport(right)) - Number(isFirstNewsReport(left));

    if (firstReportDelta !== 0) {
      return firstReportDelta;
    }

    return 0;
  });
}

function getReportCreatorKey(report: FanletterNewsReportDocument) {
  return (
    report.creatorReferralCode?.trim() ||
    report.creatorName.trim() ||
    report.reportId
  );
}

function getPhotoDeskReports(
  reports: FanletterNewsReportDocument[],
  limit: number,
) {
  return getBalancedCharacterReports({
    filter: (report) =>
      isEditorialSafeReport(report) && Boolean(report.coverImageUrl),
    limit,
    reports,
  });
}

function getBalancedCharacterReports({
  deprioritizedCreatorKey,
  filter = isEditorialSafeReport,
  limit,
  reports,
}: {
  deprioritizedCreatorKey?: string | null;
  filter?: (report: FanletterNewsReportDocument) => boolean;
  limit: number;
  reports: FanletterNewsReportDocument[];
}) {
  const reportsByCreator = new Map<string, FanletterNewsReportDocument[]>();
  const seenReportIds = new Set<string>();

  for (const report of reports) {
    if (!filter(report) || seenReportIds.has(report.reportId)) {
      continue;
    }

    const creatorKey = getReportCreatorKey(report);
    const creatorReports = reportsByCreator.get(creatorKey) ?? [];

    creatorReports.push(report);
    reportsByCreator.set(creatorKey, creatorReports);
    seenReportIds.add(report.reportId);
  }

  const selectedReports: FanletterNewsReportDocument[] = [];
  const creatorReportQueues = Array.from(reportsByCreator.entries());
  const normalizedDeprioritizedCreatorKey =
    deprioritizedCreatorKey?.trim() ?? null;

  if (normalizedDeprioritizedCreatorKey) {
    creatorReportQueues.sort(([leftKey], [rightKey]) => {
      if (leftKey === normalizedDeprioritizedCreatorKey) {
        return 1;
      }

      if (rightKey === normalizedDeprioritizedCreatorKey) {
        return -1;
      }

      return 0;
    });
  }

  while (selectedReports.length < limit) {
    let addedReport = false;

    for (const [, creatorReports] of creatorReportQueues) {
      const report = creatorReports.shift();

      if (!report) {
        continue;
      }

      selectedReports.push(report);
      addedReport = true;

      if (selectedReports.length >= limit) {
        return selectedReports;
      }
    }

    if (!addedReport) {
      break;
    }
  }

  return selectedReports;
}

function getBalancedCharacterWireReports(
  reports: FanletterNewsReportDocument[],
  limit: number,
) {
  return getBalancedCharacterReports({
    limit,
    reports,
  });
}

function excludeReports(
  reports: FanletterNewsReportDocument[],
  excludedReports: FanletterNewsReportDocument[],
) {
  const excludedReportIds = new Set(
    excludedReports.map((report) => report.reportId),
  );

  return reports.filter((report) => !excludedReportIds.has(report.reportId));
}

function buildMixedNewsHomeReports({
  latestReports,
  limit,
  publicReports,
}: {
  latestReports: FanletterNewsReportDocument[];
  limit: number;
  publicReports: FanletterNewsReportDocument[];
}) {
  const seen = new Set<string>();
  const editorialLatestReports = latestReports.filter(isEditorialSafeReport);
  const publicQueue = publicReports.filter(
    (report) => report.priceType !== "paid" && isEditorialSafeReport(report),
  );
  const candidateReports = getFirstNewsPromotedReports(
    [...editorialLatestReports, ...publicQueue].filter((report) => {
      if (seen.has(report.reportId)) {
        return false;
      }

      seen.add(report.reportId);
      return true;
    }),
  );
  const leadCandidate =
    candidateReports.find(isPreferredFirstLeadReport) ??
    candidateReports.find(isPreferredLeadReport) ??
    candidateReports[0];

  if (!leadCandidate) {
    return [];
  }

  return [
    leadCandidate,
    ...getBalancedCharacterReports({
      deprioritizedCreatorKey: getReportCreatorKey(leadCandidate),
      limit: limit - 1,
      reports: candidateReports.filter(
        (report) => report.reportId !== leadCandidate.reportId,
      ),
    }),
  ].slice(0, limit);
}

function getReporterStats(reports: FanletterNewsReportDocument[]) {
  const map = new Map<string, ReporterStat>();

  for (const report of reports) {
    const existing = map.get(report.reporterReferralCode);
    const reportDate = report.sourcePublishedAt ?? report.createdAt ?? null;
    const latestReportAt =
      existing?.latestReportAt && reportDate
        ? existing.latestReportAt > reportDate
          ? existing.latestReportAt
          : reportDate
        : existing?.latestReportAt ?? reportDate;

    map.set(report.reporterReferralCode, {
      avatarImageUrl:
        existing?.avatarImageUrl ?? report.reporterAvatarImageUrl ?? null,
      count: (existing?.count ?? 0) + 1,
      firstReportCount:
        (existing?.firstReportCount ?? 0) + (isFirstNewsReport(report) ? 1 : 0),
      latestReportAt,
      name: existing?.name ?? getReporterDisplayName(report),
      referralCode: report.reporterReferralCode,
    });
  }

  return Array.from(map.values())
    .sort(
      (left, right) =>
        right.firstReportCount - left.firstReportCount || right.count - left.count,
    )
    .slice(0, 5);
}

function getNewsroomReporterCount(reports: FanletterNewsReportDocument[]) {
  return new Set(
    reports
      .map((report) => report.reporterReferralCode.trim())
      .filter(Boolean),
  ).size;
}

async function hydrateReporterStats(reporters: ReporterStat[]) {
  const hydrated = await Promise.all(
    reporters.map(async (reporter) => {
      const profile = await getFanletterNewsReporterProfile({
        reporterReferralCode: reporter.referralCode,
      });

      return {
        ...reporter,
        avatarImageUrl: profile?.avatarImageUrl ?? reporter.avatarImageUrl,
        count: profile?.reportCount ?? reporter.count,
        latestReportAt: profile?.latestReportAt ?? reporter.latestReportAt,
        name: profile?.displayName ?? reporter.name,
      };
    }),
  );

  return hydrated
    .sort(
      (left, right) =>
        right.firstReportCount - left.firstReportCount || right.count - left.count,
    )
    .slice(0, 5);
}

function NewsImage({
  blurred = false,
  className,
  imageClassName = "object-cover object-center",
  nsfwLabel,
  optimizeImage = false,
  priority = false,
  report,
  sizes,
}: {
  blurred?: boolean;
  className?: string;
  imageClassName?: string;
  nsfwLabel?: string;
  optimizeImage?: boolean;
  priority?: boolean;
  report: FanletterNewsReportDocument;
  sizes: string;
}) {
  const imageUrl = getFanletterNewsReportPreviewImageUrl(report);
  const shouldBypassImageOptimization = imageUrl
    ? !optimizeImage && shouldBypassFanletterImageOptimization(imageUrl)
    : false;

  return (
    <div className={`relative overflow-hidden bg-[#0d120f] ${className ?? ""}`}>
      {imageUrl ? (
        <>
          <Image
            alt=""
            aria-hidden="true"
            className="scale-125 object-cover object-center opacity-[0.62] blur-2xl brightness-[0.62] saturate-[0.95]"
            fill
            loading={priority ? "eager" : undefined}
            priority={priority}
            sizes={sizes}
            src={imageUrl}
            unoptimized={shouldBypassImageOptimization}
          />
          <Image
            alt=""
            aria-hidden="true"
            className={
              blurred
                ? `blur-md brightness-[0.68] saturate-[0.86] ${imageClassName}`
                : imageClassName
            }
            fill
            loading={priority ? "eager" : undefined}
            priority={priority}
            sizes={sizes}
            src={imageUrl}
            unoptimized={shouldBypassImageOptimization}
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#07100b,#111510_52%,#24372a)] text-[#44f26e]">
          <Newspaper className="size-12" />
        </div>
      )}
      {blurred ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/34 p-3 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-black/62 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_34px_rgba(0,0,0,0.3)]">
            <AlertTriangle className="size-3.5 text-rose-300" />
            {nsfwLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function NewsMasthead({
  charactersHref,
  copy,
  cutsHref,
  galleryHref,
  locale,
  myHref,
  navigationBaseHref,
  platformHref,
  purchasesHref,
  reportersHref,
  reportsHref,
  vlogsHref,
}: {
  charactersHref: string;
  copy: ReturnType<typeof getCopy>;
  cutsHref: string;
  galleryHref: string;
  locale: Locale;
  myHref: string;
  navigationBaseHref: string;
  platformHref: string;
  purchasesHref: string;
  reportersHref: string;
  reportsHref: string;
  vlogsHref: string;
}) {
  const today = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
  }).format(new Date());
  const navHrefs = [
    `${navigationBaseHref}#top-stories`,
    galleryHref,
    cutsHref,
    platformHref,
    reportersHref,
    charactersHref,
    vlogsHref,
    purchasesHref,
    reportsHref,
    myHref,
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-black/12 bg-[#fbfcf8]/96 text-[#111510] shadow-[0_10px_28px_rgba(17,21,16,0.07)] backdrop-blur-xl sm:static sm:z-auto sm:bg-[#fbfcf8] sm:shadow-none sm:backdrop-blur-none">
      <div className="border-b border-black/8 bg-[#eef2eb]">
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-4 px-4 py-1.5 text-[0.6rem] font-black uppercase tracking-[0.14em] text-black/48 sm:px-6 sm:text-[0.66rem] sm:tracking-[0.18em] lg:px-8">
          <span>{today}</span>
          <span className="hidden sm:inline">{copy.edition}</span>
        </div>
      </div>
      <div className="mx-auto max-w-[92rem] px-4 pt-2.5 sm:px-6 sm:pt-5 lg:px-8">
        <div className="flex items-end justify-between gap-4 border-b-[3px] border-[#111510] pb-2 sm:pb-3.5">
          <Link
            className="inline-flex min-h-11 min-w-0 items-center gap-2.5 text-[1.74rem] font-black leading-none tracking-normal !text-[#111510] sm:min-h-10 sm:gap-4 sm:text-[3.85rem] lg:text-[4.55rem]"
            href={platformHref}
          >
            <FanletterBrandMark className="size-8 sm:size-[3.45rem] lg:size-[3.95rem]" />
            <span className="truncate">{copy.siteName}</span>
          </Link>
          <span className="hidden h-10 shrink-0 items-center border border-black/14 bg-white/44 px-4 text-[0.66rem] font-black uppercase tracking-[0.22em] text-[#16702e] lg:inline-flex">
            {copy.heroEyebrow}
          </span>
        </div>
        <nav
          aria-label={copy.siteName}
          className="flex gap-2 overflow-x-auto border-b border-black/8 py-2.5 [scrollbar-width:none] sm:gap-6 sm:py-3.5 [&::-webkit-scrollbar]:hidden"
        >
          {copy.navItems.map((item, index) => (
            <Link
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/70 px-3 text-[0.68rem] font-black uppercase tracking-[0.08em] !text-black/60 transition hover:border-[#19b84b] hover:bg-[#ecfff0] hover:!text-[#16702e] sm:min-h-0 sm:min-w-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:pb-1 sm:text-[0.74rem] sm:tracking-[0.14em] sm:!text-black/52 sm:hover:bg-transparent"
              href={navHrefs[index] ?? navigationBaseHref}
              key={item}
            >
              {item}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function NewsTicker({
  copy,
  referralCode,
  reports,
}: {
  copy: ReturnType<typeof getCopy>;
  referralCode: string | null;
  reports: FanletterNewsReportDocument[];
}) {
  if (reports.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-black/10 bg-[#fbfcf8] text-[#111510]">
      <div className="mx-auto grid max-w-[92rem] gap-2 px-4 py-2.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:px-6 sm:py-3 lg:px-8">
        <div className="inline-flex h-6 w-fit items-center border-l-4 border-[#16702e] pl-2 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#16702e] sm:h-7 sm:pl-2.5 sm:text-[0.68rem] sm:tracking-[0.18em]">
          {copy.ticker}
        </div>
        <div className="flex min-w-0 gap-0 overflow-x-auto text-xs font-bold text-black/64 [scrollbar-width:none] sm:text-sm [&::-webkit-scrollbar]:hidden">
          {reports.map((report) => (
            <Link
              className="inline-flex h-11 max-w-[17rem] shrink-0 items-center truncate border-l border-black/12 px-3 transition first:border-l-0 first:pl-0 hover:text-[#16702e] sm:h-9 sm:max-w-[22rem]"
              href={getReportHref(report, referralCode)}
              key={report.reportId}
            >
              {getArticleDisplayTitle(report.title)}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProducerQuickStartRail({
  copy,
  reportDeskHref,
  reportNewHref,
  vlogManageHref,
  vlogNewHref,
}: {
  copy: ReturnType<typeof getCopy>;
  reportDeskHref: string;
  reportNewHref: string;
  vlogManageHref: string;
  vlogNewHref: string;
}) {
  const actions = [
    {
      accent: "green" as const,
      body: copy.producerDesk.reporter.body,
      icon: PenLine,
      label: copy.producerDesk.reporter.label,
      primaryHref: reportNewHref,
      primaryIcon: Plus,
      primaryLabel: copy.producerDesk.reporter.primary,
      secondaryHref: reportDeskHref,
      secondaryLabel: copy.producerDesk.reporter.secondary,
      title: copy.producerDesk.reporter.title,
    },
    {
      accent: "violet" as const,
      body: copy.producerDesk.vlogger.body,
      icon: Clapperboard,
      label: copy.producerDesk.vlogger.label,
      primaryHref: vlogNewHref,
      primaryIcon: UploadCloud,
      primaryLabel: copy.producerDesk.vlogger.primary,
      secondaryHref: vlogManageHref,
      secondaryLabel: copy.producerDesk.vlogger.secondary,
      title: copy.producerDesk.vlogger.title,
    },
  ];

  return (
    <section className="hidden border-b border-black/10 bg-[#fbfcf8] lg:block">
      <div className="mx-auto grid max-w-[92rem] gap-3 px-8 py-3 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-h-[7rem] flex-col justify-between border border-black/10 bg-white p-4 shadow-[0_12px_28px_rgba(17,21,16,0.05)]">
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
              {copy.producerDesk.eyebrow}
            </p>
            <h2 className="mt-2 text-xl font-black leading-tight tracking-normal [word-break:keep-all]">
              {copy.producerDesk.title}
            </h2>
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-black/52">
            {copy.producerDesk.note}
          </p>
        </div>

        {actions.map((action) => {
          const Icon = action.icon;
          const PrimaryIcon = action.primaryIcon;
          const iconTone =
            action.accent === "green" ? "text-[#16702e]" : "text-[#5b35a2]";
          const panelClass =
            action.accent === "green"
              ? "border-[#19b84b]/38 bg-[#f4fff6]"
              : "border-[#b88cff]/42 bg-[#fbf7ff]";
          const primaryClass =
            action.accent === "green"
              ? "bg-[#111510] !text-white hover:bg-[#16702e]"
              : "bg-[#2b2140] !text-white hover:bg-[#5b35a2]";

          return (
            <div
              className={`grid min-h-[7rem] grid-cols-[auto_minmax(0,1fr)] items-center gap-4 border p-4 shadow-[0_12px_28px_rgba(17,21,16,0.05)] xl:grid-cols-[auto_minmax(0,1fr)_auto] ${panelClass}`}
              key={action.label}
            >
              <span
                className={`flex size-12 shrink-0 items-center justify-center border border-black/10 bg-white ${iconTone}`}
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-black/44">
                  {action.label}
                </p>
                <h3 className="mt-1 truncate text-lg font-black tracking-normal">
                  {action.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-black/55">
                  {action.body}
                </p>
              </div>
              <div className="col-span-2 grid shrink-0 grid-cols-2 gap-2 xl:col-span-1 xl:flex xl:flex-col">
                <Link
                  className={`inline-flex h-10 min-w-0 items-center justify-center gap-2 px-3 text-sm font-black transition xl:min-w-32 ${primaryClass}`}
                  href={action.primaryHref}
                >
                  <PrimaryIcon className="size-4" />
                  {action.primaryLabel}
                </Link>
                <Link
                  className="inline-flex h-10 min-w-0 items-center justify-center gap-2 border border-black/12 bg-white px-3 text-xs font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] xl:h-9 xl:min-w-32"
                  href={action.secondaryHref}
                >
                  {action.secondaryLabel}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InvestorPlatformEntry({
  characterCount,
  copy,
  locale,
  platformHref,
  previewCount,
  reportCount,
}: {
  characterCount: number;
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  platformHref: string;
  previewCount: number;
  reportCount: number;
}) {
  const stats = [
    {
      label: copy.platformPitch.stats.reports,
      value: reportCount,
    },
    {
      label: copy.platformPitch.stats.previews,
      value: previewCount,
    },
    {
      label: copy.platformPitch.stats.characters,
      value: characterCount,
    },
  ];

  return (
    <section className="border-b border-black/10 bg-[#111510] text-white">
      <div className="mx-auto grid max-w-[92rem] gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center lg:px-8">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#44f26e]">
            <FileText className="size-3.5" />
            {copy.platformPitch.eyebrow}
          </p>
          <h2 className="mt-2 max-w-4xl break-words text-2xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-3xl">
            {copy.platformPitch.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-white/64">
            {copy.platformPitch.body}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-px bg-white/12">
          {stats.map((stat, index) => (
            <div
              className={
                index === 0
                  ? "min-w-0 bg-[#44f26e] px-3 py-2.5 text-[#111510]"
                  : "min-w-0 bg-white/[0.07] px-3 py-2.5"
              }
              key={stat.label}
            >
              <p className="text-xl font-black leading-none">
                {formatNumber(stat.value, locale)}
              </p>
              <p className="mt-1 truncate text-[0.56rem] font-black uppercase tracking-[0.08em] opacity-70">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-white px-4 text-sm font-black !text-[#111510] transition hover:bg-[#44f26e]"
          href={platformHref}
        >
          {copy.platformPitch.cta}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

function DailyUpdatePortal({
  characters,
  charactersHref,
  copy,
  freePreviewReports,
  galleryHref,
  latestReports,
  locale,
  referralCode,
  reporterCount,
  reporterStats,
  reportNewHref,
  reportsHref,
}: {
  characters: FanletterNewsCharacterStat[];
  charactersHref: string;
  copy: ReturnType<typeof getCopy>;
  freePreviewReports: FanletterNewsReportDocument[];
  galleryHref: string;
  latestReports: FanletterNewsReportDocument[];
  locale: Locale;
  referralCode: string | null;
  reporterCount: number;
  reporterStats: ReporterStat[];
  reportNewHref: string;
  reportsHref: string;
}) {
  const topCharacters = characters.slice(0, 4);
  const topReporter = reporterStats[0] ?? null;
  const statItems = [
    {
      label: copy.todayPortal.stats.updates,
      value: latestReports.length,
    },
    {
      label: copy.todayPortal.stats.freePreviews,
      value: freePreviewReports.length,
    },
    {
      label: copy.todayPortal.stats.characters,
      value: characters.length,
    },
    {
      label: copy.todayPortal.stats.reporters,
      value: reporterCount,
    },
  ];
  const ctaItems = [
    {
      href: reportsHref,
      icon: <Newspaper className="size-4" />,
      label: copy.todayPortal.ctaNews,
    },
    {
      href: galleryHref,
      icon: <Images className="size-4" />,
      label: copy.todayPortal.ctaGallery,
    },
    {
      href: charactersHref,
      icon: <UserRound className="size-4" />,
      label: copy.todayPortal.ctaCharacters,
    },
    {
      href: reportNewHref,
      icon: <PenLine className="size-4" />,
      label: copy.todayPortal.ctaReports,
    },
  ];

  return (
    <section
      className="overflow-hidden border-2 border-[#111510] bg-[#111510] text-white shadow-[0_24px_68px_rgba(17,21,16,0.16)]"
      id="today-update-portal"
    >
      <div className="grid gap-px bg-white/12 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <div className="bg-[#111510] p-4 sm:p-5 lg:p-6">
          <p className="inline-flex items-center gap-2 text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
            <Radio className="size-3.5" />
            {copy.todayPortal.eyebrow}
          </p>
          <h2 className="mt-3 max-w-3xl break-words text-[2.35rem] font-black leading-[0.98] tracking-normal [word-break:keep-all] sm:text-[4rem] lg:text-[4.45rem]">
            {copy.todayPortal.title}
          </h2>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/64 sm:text-base sm:leading-7">
            {copy.todayPortal.body}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-px bg-white/12 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {statItems.map((stat, index) => (
              <div
                className={
                  index === 0
                    ? "bg-[#44f26e] p-3 text-[#111510]"
                    : index === 1
                      ? "bg-[#ffd76b] p-3 text-[#111510]"
                      : "bg-white/[0.07] p-3"
                }
                key={stat.label}
              >
                <p className="text-2xl font-black leading-none">
                  {formatNumber(stat.value, locale)}
                </p>
                <p className="mt-2 truncate text-[0.56rem] font-black uppercase tracking-[0.1em] opacity-70">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-4">
            {ctaItems.map((item, index) => (
              <Link
                className={
                  index === 0
                    ? "inline-flex min-h-11 items-center justify-center gap-2 bg-white px-3 text-sm font-black !text-[#111510] transition hover:bg-[#44f26e]"
                    : "inline-flex min-h-11 items-center justify-center gap-2 border border-white/14 bg-white/[0.07] px-3 text-sm font-black !text-white transition hover:border-[#44f26e] hover:bg-[#44f26e]/10"
                }
                href={item.href}
                key={item.label}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-px bg-[#111510] md:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)]">
          <div className="bg-[#f8fbf5] p-3 text-[#111510] sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3 border-b-2 border-[#111510] pb-2">
              <h3 className="text-base font-black tracking-normal">
                {copy.todayPortal.latest}
              </h3>
              <Clock3 className="size-4 text-[#16702e]" />
            </div>
            <div className="divide-y divide-black/10">
              {latestReports.length > 0 ? (
                latestReports.slice(0, 5).map((report, index) => {
                  const shouldBlur = shouldBlurReport(report, false);
                  const publishedAt = formatDate(
                    report.sourcePublishedAt,
                    locale,
                  );

                  return (
                    <Link
                      className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-2 py-3 first:pt-0 last:pb-0"
                      href={getReportHref(report, referralCode)}
                      key={report.reportId}
                    >
                      <span className="flex size-7 items-center justify-center bg-[#111510] text-xs font-black text-[#44f26e]">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap gap-2 text-[0.6rem] font-black uppercase tracking-[0.08em] text-black/42">
                          <span className="text-[#16702e]">
                            {getAccessLabel(report, copy)}
                          </span>
                          {publishedAt ? <span>{publishedAt}</span> : null}
                        </span>
                        <span
                          className={`mt-1 block line-clamp-2 break-words text-sm font-black leading-5 [word-break:keep-all] group-hover:text-[#16702e] ${
                            shouldBlur ? "select-none blur-[2px]" : ""
                          }`}
                        >
                          {getArticleDisplayTitle(report.title)}
                        </span>
                      </span>
                      <ArrowRight className="mt-1 size-4 text-black/28 transition group-hover:text-[#16702e]" />
                    </Link>
                  );
                })
              ) : (
                <p className="py-4 text-sm font-semibold text-black/48">
                  {copy.todayPortal.empty}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-px bg-[#111510] sm:grid-cols-2 md:grid-cols-1">
            <div className="bg-white p-3 text-[#111510] sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-black/12 pb-2">
                <h3 className="text-sm font-black">
                  {copy.todayPortal.freePreview}
                </h3>
                <span className="bg-[#ffd76b] px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.08em] text-[#111510]">
                  {copy.todayPortal.publicBadge}
                </span>
              </div>
              <div className="space-y-2">
                {freePreviewReports.slice(0, 3).map((report) => (
                  <Link
                    className="group grid grid-cols-[4.75rem_minmax(0,1fr)] gap-2"
                    href={getReportHref(report, referralCode)}
                    key={report.reportId}
                  >
                    <NewsImage
                      className="aspect-[16/10] border border-black/10"
                      optimizeImage
                      report={report}
                      sizes="76px"
                    />
                    <span className="min-w-0 self-center">
                      <span className="block line-clamp-2 break-words text-xs font-black leading-4 [word-break:keep-all] group-hover:text-[#16702e]">
                        {getArticleDisplayTitle(report.title)}
                      </span>
                      <span className="mt-1 block truncate text-[0.58rem] font-bold text-black/42">
                        {report.creatorName}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-[#f1f5ee] p-3 text-[#111510] sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-black/12 pb-2">
                <h3 className="text-sm font-black">
                  {copy.todayPortal.characterRank}
                </h3>
                <span className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#16702e]">
                  {copy.todayPortal.rank}
                </span>
              </div>
              <div className="divide-y divide-black/10">
                {topCharacters.map((character, index) => {
                  const channelHref = buildPathWithReferral(
                    `/${locale}/fanletter/news/characters/${character.referralCode}`,
                    referralCode ?? character.referralCode,
                  );

                  return (
                    <Link
                      className="group grid grid-cols-[2rem_2.5rem_minmax(0,1fr)] items-center gap-2 py-2 first:pt-0 last:pb-0"
                      href={channelHref}
                      key={character.referralCode}
                    >
                      <span className="font-mono text-xs font-black text-[#16702e]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="relative size-10 overflow-hidden rounded-full bg-[#111510]">
                        {character.avatarImageUrl ? (
                          <Image
                            alt=""
                            aria-hidden="true"
                            className="object-cover"
                            fill
                            sizes="40px"
                            src={character.avatarImageUrl}
                            unoptimized
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-white/64">
                            <UserRound className="size-5" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black group-hover:text-[#16702e]">
                          {character.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[0.58rem] font-black uppercase tracking-[0.08em] text-black/38">
                          {formatNumber(character.newsCount, locale)}{" "}
                          {copy.characterDirectory.news}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
              {topReporter ? (
                <Link
                  className="mt-3 flex min-h-11 items-center justify-between gap-3 border-t border-black/12 pt-3 text-xs font-bold text-black/50 transition hover:text-[#16702e]"
                  href={getReporterNewsHref(
                    locale,
                    topReporter.referralCode,
                    referralCode,
                  )}
                >
                  <span className="min-w-0 truncate">
                    {copy.todayPortal.reporterSignal}: {topReporter.name}
                  </span>
                  <span className="shrink-0 font-black text-[#16702e]">
                    {formatNumber(topReporter.count, locale)}
                  </span>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  icon,
  title,
}: {
  eyebrow?: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 border-b-2 border-[#111510] pb-2.5 sm:mb-4 sm:pb-3">
      <div>
        {eyebrow ? (
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-xl font-black leading-tight tracking-normal sm:text-2xl">
          {title}
        </h2>
      </div>
      <span className="flex size-9 shrink-0 items-center justify-center border border-black/12 bg-[#eef3ea] text-[#16702e]">
        {icon}
      </span>
    </div>
  );
}

function FirstReportBadge({
  copy,
  tone = "light",
}: {
  copy: ReturnType<typeof getCopy>;
  tone?: "dark" | "light";
}) {
  return (
    <span
      className={
        tone === "dark"
          ? "inline-flex items-center bg-[#44f26e] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-black"
          : "inline-flex items-center bg-[#111510] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#44f26e]"
      }
    >
      {copy.firstReport}
    </span>
  );
}

function LeadStory({
  copy,
  nsfwOptInEnabled,
  referralCode,
  report,
}: {
  copy: ReturnType<typeof getCopy>;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  report: FanletterNewsReportDocument;
}) {
  const publishedAt = formatDate(report.sourcePublishedAt, report.locale);
  const nsfwCopy = getFanletterNsfwCopy(report.locale);
  const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
  const title = getArticleDisplayTitle(report.title);

  return (
    <Link
      className="group relative block overflow-hidden border border-black/12 bg-[#111510] text-white shadow-[0_18px_44px_rgba(10,18,12,0.16)]"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="aspect-[16/9] sm:aspect-[16/10] sm:min-h-[30rem] lg:min-h-[34rem]"
        nsfwLabel={nsfwCopy.badge}
        priority
        report={report}
        sizes="(max-width: 1024px) 100vw, 54rem"
      />
      <div className="hidden sm:absolute sm:inset-0 sm:block sm:bg-gradient-to-t sm:from-black/90 sm:via-black/34 sm:to-transparent" />
      <div className="relative border-t border-black/10 bg-white p-4 sm:absolute sm:inset-x-0 sm:bottom-0 sm:border-t-0 sm:bg-transparent sm:p-7 sm:pt-32">
        <div className="flex flex-wrap gap-2">
          {isFirstNewsReport(report) ? (
            <FirstReportBadge copy={copy} tone="dark" />
          ) : null}
          <span className="inline-flex items-center bg-[#44f26e] px-2.5 py-1 text-[0.72rem] font-black text-black sm:text-xs">
            {copy.lead}
          </span>
          <span className="inline-flex items-center border border-black/10 bg-[#f5f6f2] px-2.5 py-1 text-[0.72rem] font-bold text-black/56 backdrop-blur sm:border-white/24 sm:bg-white/12 sm:text-xs sm:text-white/84">
            {getAccessLabel(report, copy)}
          </span>
        </div>
        <p className="mt-3 text-[0.62rem] font-black uppercase tracking-[0.16em] text-black/42 sm:mt-4 sm:text-[0.66rem] sm:tracking-[0.18em] sm:text-white/58">
          {copy.leadKicker}
        </p>
        <h2
          className={`mt-2 line-clamp-3 max-w-4xl break-words text-[1.55rem] font-black leading-[1.1] tracking-normal text-[#111510] [word-break:keep-all] sm:line-clamp-none sm:text-[2.35rem] sm:leading-[1.08] sm:text-white lg:text-[2.6rem] xl:text-[2.75rem] ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {title}
        </h2>
        <p
          className={`mt-2 line-clamp-2 max-w-2xl text-sm font-semibold leading-6 text-black/58 sm:mt-3 sm:line-clamp-none sm:text-base sm:leading-7 sm:text-white/78 ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.dek}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.72rem] font-bold text-black/46 sm:mt-4 sm:gap-3 sm:text-xs sm:text-white/62">
          <span className="inline-flex items-center gap-1.5">
            <PenLine className="size-3.5 text-[#44f26e]" />
            {getReporterDisplayName(report)}
          </span>
          {publishedAt ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5 text-[#44f26e]" />
              {publishedAt}
            </span>
          ) : null}
          <span className="font-black text-[#44f26e] group-hover:underline">
            {copy.read}
          </span>
        </div>
      </div>
    </Link>
  );
}

function HeroSideStory({
  copy,
  nsfwOptInEnabled,
  referralCode,
  report,
}: {
  copy: ReturnType<typeof getCopy>;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  report: FanletterNewsReportDocument;
}) {
  const publishedAt = formatDate(report.sourcePublishedAt, report.locale);
  const nsfwCopy = getFanletterNsfwCopy(report.locale);
  const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
  const title = getArticleDisplayTitle(report.title);

  return (
    <Link
      className="group grid grid-cols-[7rem_minmax(0,1fr)] overflow-hidden border border-black/12 bg-white text-[#111510] sm:relative sm:block sm:bg-[#111510] sm:text-white"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="h-full min-h-[8.5rem] sm:aspect-[16/10] sm:h-auto sm:min-h-[15.5rem] lg:aspect-auto lg:h-[16.5rem]"
        nsfwLabel={nsfwCopy.badge}
        report={report}
        sizes="(max-width: 640px) 112px, (max-width: 1024px) 50vw, 320px"
      />
      <div className="hidden sm:absolute sm:inset-0 sm:block sm:bg-gradient-to-t sm:from-black/86 sm:via-black/26 sm:to-transparent" />
      <div className="min-w-0 p-3 sm:absolute sm:inset-x-0 sm:bottom-0 sm:p-4">
        <div className="mb-2 flex flex-wrap gap-2 text-[0.62rem] font-black uppercase tracking-[0.08em] sm:text-[0.64rem] sm:tracking-[0.1em]">
          <span className="bg-[#44f26e] px-2 py-1 text-black">
            {getAccessLabel(report, copy)}
          </span>
          {publishedAt ? (
            <span className="border border-black/10 bg-[#f5f6f2] px-2 py-1 text-black/52 sm:border-white/20 sm:bg-white/12 sm:text-white/76">
              {publishedAt}
            </span>
          ) : null}
        </div>
        <h2
          className={`line-clamp-3 break-words text-base font-black leading-5 text-[#111510] [word-break:keep-all] group-hover:text-[#16702e] sm:text-xl sm:leading-6 sm:text-white sm:group-hover:text-[#44f26e] ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {title}
        </h2>
      </div>
    </Link>
  );
}

function PortalHeadlineList({
  copy,
  nsfwOptInEnabled,
  referralCode,
  reports,
}: {
  copy: ReturnType<typeof getCopy>;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  reports: FanletterNewsReportDocument[];
}) {
  if (reports.length === 0) {
    return null;
  }

  return (
    <section className="min-w-0 border-t border-black/12 bg-white p-4 lg:border-t-0 xl:border-r">
      <div className="mb-3 flex items-center justify-between gap-3 border-b-2 border-[#111510] pb-2">
        <h2 className="text-lg font-black tracking-normal">
          {copy.frontPage.headlines}
        </h2>
        <span className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
          {formatNumber(reports.length, reports[0]?.locale ?? "ko")}
        </span>
      </div>
      <div className="divide-y divide-black/10">
        {reports.map((report, index) => {
          const publishedAt = formatDate(report.sourcePublishedAt, report.locale);
          const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
          const title = getArticleDisplayTitle(report.title);

          return (
            <Link
              className="group grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-3 first:pt-0 last:pb-0"
              href={getReportHref(report, referralCode)}
              key={report.reportId}
            >
              <span className="mt-0.5 flex size-7 items-center justify-center border border-black/12 text-xs font-black text-[#16702e] group-hover:border-[#19b84b] group-hover:bg-[#ecfff0]">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap gap-2 text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/42">
                  <span className="text-[#16702e]">
                    {getAccessLabel(report, copy)}
                  </span>
                  {publishedAt ? <span>{publishedAt}</span> : null}
                </span>
                <span
                  className={`mt-1 block line-clamp-2 break-words text-[1.02rem] font-black leading-5 [word-break:keep-all] group-hover:text-[#16702e] ${
                    shouldBlur ? "select-none blur-[2px]" : ""
                  }`}
                >
                  {title}
                </span>
                <span
                  className={`mt-1 block line-clamp-1 text-xs font-semibold text-black/46 ${
                    shouldBlur ? "select-none blur-[2px]" : ""
                  }`}
                >
                  {getReporterDisplayName(report)} · {report.creatorName}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function NewsDeskPanel({
  characters,
  copy,
  locale,
  referralCode,
  reporters,
  selectedReporterReferralCode,
}: {
  characters: FanletterNewsCharacterStat[];
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  referralCode: string | null;
  reporters: ReporterStat[];
  selectedReporterReferralCode: string | null;
}) {
  const topReporters = reporters.slice(0, 3);
  const topCharacters = characters.slice(0, 3);

  return (
    <aside className="border-t border-black/12 bg-[#f7faf4] p-4 xl:border-t-0">
      <div className="border-b-2 border-[#111510] pb-3">
        <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
          {copy.frontPage.desk}
        </p>
      </div>

      {topReporters.length > 0 ? (
        <div className="mt-4">
          <h3 className="border-b border-black/12 pb-2 text-sm font-black">
            {copy.frontPage.reporters}
          </h3>
          <div className="divide-y divide-black/10">
            {topReporters.map((reporter, index) => {
              const isSelected =
                reporter.referralCode === selectedReporterReferralCode;

              return (
                <Link
                  className={`group grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 py-2.5 ${
                    isSelected ? "text-[#16702e]" : "text-[#111510]"
                  }`}
                  href={getReporterNewsHref(
                    locale,
                    reporter.referralCode,
                    referralCode,
                  )}
                  key={reporter.referralCode}
                >
                  <span className="flex size-8 items-center justify-center bg-[#111510] text-xs font-black text-[#44f26e]">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black group-hover:text-[#16702e]">
                      {reporter.name}
                    </span>
                    <span className="block truncate text-[0.66rem] font-bold text-black/42">
                      @{reporter.referralCode}
                    </span>
                  </span>
                  <span className="text-xs font-black text-[#16702e]">
                    {formatNumber(reporter.count, locale)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {topCharacters.length > 0 ? (
        <div className="mt-4">
          <h3 className="border-b border-black/12 pb-2 text-sm font-black">
            {copy.frontPage.characters}
          </h3>
          <div className="divide-y divide-black/10">
            {topCharacters.map((character) => {
              const channelHref = buildPathWithReferral(
                `/${locale}/fanletter/news/characters/${character.referralCode}`,
                referralCode ?? character.referralCode,
              );

              return (
                <Link
                  className="group grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 py-2.5"
                  href={channelHref}
                  key={character.referralCode}
                >
                  <span className="relative size-10 overflow-hidden rounded-full bg-[#111510]">
                    {character.avatarImageUrl ? (
                      <Image
                        alt=""
                        aria-hidden="true"
                        className="object-cover"
                        fill
                        sizes="2.5rem"
                        src={character.avatarImageUrl}
                        unoptimized={shouldBypassFanletterImageOptimization(
                          character.avatarImageUrl,
                        )}
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-white/64">
                        <UserRound className="size-5" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black group-hover:text-[#16702e]">
                      {character.name}
                    </span>
                    <span className="mt-0.5 block line-clamp-1 text-[0.66rem] font-semibold text-black/46">
                      {getArticleDisplayTitle(
                        character.representativeReport.title,
                      )}
                    </span>
                    <span className="mt-1 block text-[0.62rem] font-black uppercase tracking-[0.08em] text-[#16702e]">
                      {formatNumber(character.newsCount, locale)}{" "}
                      {copy.characterDirectory.news}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function NewsFrontPage({
  characterNewsStats,
  copy,
  displayedNewsCount,
  displayedReporterCount,
  heroSideReports,
  leadReport,
  locale,
  nsfwOptInEnabled,
  referralCode,
  reporterStats,
  selectedReporterReferralCode,
  topStories,
  visualReportCount,
}: {
  characterNewsStats: FanletterNewsCharacterStat[];
  copy: ReturnType<typeof getCopy>;
  displayedNewsCount: number;
  displayedReporterCount: number;
  heroSideReports: FanletterNewsReportDocument[];
  leadReport: FanletterNewsReportDocument;
  locale: Locale;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  reporterStats: ReporterStat[];
  selectedReporterReferralCode: string | null;
  topStories: FanletterNewsReportDocument[];
  visualReportCount: number;
}) {
  return (
    <section
      className="overflow-hidden border border-black/12 bg-white shadow-[0_22px_56px_rgba(17,21,16,0.08)]"
      id="top-stories"
    >
      <div className="grid gap-4 border-b border-black/12 bg-[#fbfcf8] p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-[0.64rem] font-black uppercase tracking-[0.18em] text-[#16702e] sm:text-[0.7rem] sm:tracking-[0.2em]">
            {copy.issueLabel}
          </p>
          <h1 className="mt-2 max-w-4xl break-words text-[1.72rem] font-black leading-[1.04] tracking-normal [word-break:keep-all] sm:text-[2.75rem] lg:text-[3.15rem]">
            {copy.frontPage.title}
          </h1>
        </div>
        <div className="grid grid-cols-3 gap-px border border-black/10 bg-black/10 shadow-[0_12px_30px_rgba(17,21,16,0.06)] lg:min-w-80">
          {[
            [copy.newsroomStatLabels.news, displayedNewsCount],
            [copy.newsroomStatLabels.reporters, displayedReporterCount],
            [copy.newsroomStatLabels.visuals, visualReportCount],
          ].map(([label, value]) => (
            <div className="bg-white p-3 sm:p-3.5" key={label}>
              <p className="text-xl font-black leading-none sm:text-2xl">
                {formatNumber(Number(value), locale)}
              </p>
              <p className="mt-1.5 text-[0.56rem] font-black uppercase tracking-[0.12em] text-black/42">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.74fr)] xl:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.62fr)_18.5rem]">
        <div className="min-w-0 p-3.5 sm:p-5 lg:border-r lg:border-black/10">
          <LeadStory
            copy={copy}
            nsfwOptInEnabled={nsfwOptInEnabled}
            referralCode={referralCode}
            report={leadReport}
          />

          {heroSideReports.length > 0 ? (
            <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
              {heroSideReports.map((report) => (
                <HeroSideStory
                  copy={copy}
                  key={report.reportId}
                  nsfwOptInEnabled={nsfwOptInEnabled}
                  referralCode={referralCode}
                  report={report}
                />
              ))}
            </div>
          ) : null}
        </div>

        <PortalHeadlineList
          copy={copy}
          nsfwOptInEnabled={nsfwOptInEnabled}
          referralCode={referralCode}
          reports={topStories}
        />

        <NewsDeskPanel
          characters={characterNewsStats}
          copy={copy}
          locale={locale}
          referralCode={referralCode}
          reporters={reporterStats}
          selectedReporterReferralCode={selectedReporterReferralCode}
        />
      </div>
    </section>
  );
}

function CompactStory({
  copy,
  nsfwOptInEnabled,
  referralCode,
  report,
}: {
  copy: ReturnType<typeof getCopy>;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  report: FanletterNewsReportDocument;
}) {
  const publishedAt = formatDate(report.sourcePublishedAt, report.locale);
  const nsfwCopy = getFanletterNsfwCopy(report.locale);
  const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
  const title = getArticleDisplayTitle(report.title);

  return (
    <Link
      className="group grid min-w-0 grid-cols-[7.25rem_minmax(0,1fr)] gap-3 border-b border-black/10 pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[8.25rem_minmax(0,1fr)]"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="aspect-[16/10] border border-black/10"
        nsfwLabel={nsfwCopy.badge}
        report={report}
        sizes="(max-width: 640px) 116px, 132px"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2 text-[0.68rem] font-black text-[#16702e]">
          <span>{getAccessLabel(report, copy)}</span>
        </div>
        <h2
          className={`mt-1 line-clamp-2 break-words text-base font-black leading-5 [word-break:keep-all] group-hover:text-[#16702e] ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {title}
        </h2>
        <p
          className={`mt-1 line-clamp-2 text-sm font-medium leading-5 text-black/58 ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.dek}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[0.68rem] font-bold text-black/42">
          {publishedAt ? <span>{publishedAt}</span> : null}
          <span>{getReporterDisplayName(report)}</span>
        </div>
      </div>
    </Link>
  );
}

function FeatureCard({
  copy,
  nsfwOptInEnabled,
  referralCode,
  report,
}: {
  copy: ReturnType<typeof getCopy>;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  report: FanletterNewsReportDocument;
}) {
  const publishedAt = formatDate(report.sourcePublishedAt, report.locale);
  const nsfwCopy = getFanletterNsfwCopy(report.locale);
  const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
  const title = getArticleDisplayTitle(report.title);

  return (
    <Link
      className="group relative block min-h-[15rem] overflow-hidden border border-white/14 bg-white/[0.045] text-white transition hover:border-[#44f26e]/50"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="absolute inset-0 h-full w-full"
        nsfwLabel={nsfwCopy.badge}
        report={report}
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 24rem"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/38 to-black/6" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="flex flex-wrap gap-2 text-[0.68rem] font-black">
          <span className="bg-[#44f26e] px-2 py-1 text-black">
            {report.creatorName}
          </span>
          <span className="border border-white/20 bg-white/12 px-2 py-1 text-white/78">
            {getAccessLabel(report, copy)}
          </span>
        </div>
        <h2
          className={`mt-2 line-clamp-2 break-words text-lg font-black leading-6 text-white [word-break:keep-all] group-hover:text-[#44f26e] sm:text-xl ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {title}
        </h2>
        <p
          className={`mt-2 line-clamp-2 text-sm font-medium leading-6 text-white/72 ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.dek}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-white/56">
          {publishedAt ? <span>{publishedAt}</span> : null}
          <span>{getReporterDisplayName(report)}</span>
        </div>
      </div>
    </Link>
  );
}

function CharacterWireSection({
  copy,
  locale,
  nsfwOptInEnabled,
  referralCode,
  reports,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  reports: FanletterNewsReportDocument[];
}) {
  if (reports.length === 0) {
    return null;
  }

  const [leadReport, ...restReports] = reports;
  const creatorCount = new Set(
    reports
      .map((report) => report.creatorReferralCode ?? report.creatorName)
      .filter(Boolean),
  ).size;
  const secondaryReports = restReports.slice(0, 4);
  const gridReports = restReports.slice(4);

  return (
    <section
      className="overflow-hidden border-2 border-[#111510] bg-[#111510] text-white shadow-[0_24px_70px_rgba(12,20,14,0.2)]"
      id="character-wire"
    >
      <div className="grid gap-4 border-b border-white/14 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
            <Radio className="size-3.5" />
            {copy.heroEyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-black leading-none tracking-normal sm:text-5xl">
            {copy.characterWire}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:min-w-64">
          <WireStat
            label={copy.characterWireStats.stories}
            value={formatNumber(reports.length, locale)}
          />
          <WireStat
            label={copy.characterWireStats.characters}
            value={formatNumber(creatorCount, locale)}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)]">
        {leadReport ? (
          <WireLeadStory
            copy={copy}
            nsfwOptInEnabled={nsfwOptInEnabled}
            referralCode={referralCode}
            report={leadReport}
          />
        ) : null}
        <div className="border-t border-white/14 p-3 sm:p-4 lg:border-l lg:border-t-0">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/12 pb-3">
            <p className="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/46">
              <List className="size-3.5 text-[#44f26e]" />
              {copy.wireLatest}
            </p>
            <span className="text-[0.66rem] font-black text-[#44f26e]">
              {formatNumber(secondaryReports.length, locale)}
            </span>
          </div>
          <div className="divide-y divide-white/10">
            {secondaryReports.map((report) => (
              <WireBriefStory
                copy={copy}
                key={report.reportId}
                nsfwOptInEnabled={nsfwOptInEnabled}
                referralCode={referralCode}
                report={report}
              />
            ))}
          </div>
        </div>
      </div>

      {gridReports.length > 0 ? (
        <div className="grid gap-3 border-t border-white/14 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
          {gridReports.map((report) => (
            <FeatureCard
              copy={copy}
              key={report.reportId}
              nsfwOptInEnabled={nsfwOptInEnabled}
              referralCode={referralCode}
              report={report}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function WireStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/12 bg-white/[0.055] p-3">
      <p className="text-2xl font-black leading-none text-white sm:text-3xl">
        {value}
      </p>
      <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.12em] text-white/42">
        {label}
      </p>
    </div>
  );
}

function WireLeadStory({
  copy,
  nsfwOptInEnabled,
  referralCode,
  report,
}: {
  copy: ReturnType<typeof getCopy>;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  report: FanletterNewsReportDocument;
}) {
  const publishedAt = formatDate(report.sourcePublishedAt, report.locale);
  const nsfwCopy = getFanletterNsfwCopy(report.locale);
  const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
  const title = getArticleDisplayTitle(report.title);

  return (
    <Link
      className="group relative block min-h-[23rem] overflow-hidden bg-black !text-white sm:min-h-[30rem]"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="absolute inset-0 h-full w-full"
        nsfwLabel={nsfwCopy.badge}
        priority
        report={report}
        sizes="(max-width: 1024px) 100vw, 52rem"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/94 via-black/36 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2 text-[0.68rem] font-black">
          <span className="bg-[#44f26e] px-2 py-1 text-black">
            {report.creatorName}
          </span>
          <span className="border border-white/18 bg-white/12 px-2 py-1 text-white/76">
            {getAccessLabel(report, copy)}
          </span>
        </div>
        <h3
          className={`mt-3 line-clamp-3 max-w-4xl break-words text-3xl font-black leading-[1.02] tracking-normal [word-break:keep-all] group-hover:text-[#44f26e] sm:text-5xl ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {title}
        </h3>
        <p
          className={`mt-3 line-clamp-2 max-w-2xl text-sm font-semibold leading-6 text-white/68 sm:text-base sm:leading-7 ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.dek}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-white/54">
          <span>{getReporterDisplayName(report)}</span>
          {publishedAt ? <span>{publishedAt}</span> : null}
          <span className="text-[#44f26e] group-hover:underline">
            {copy.read}
          </span>
        </div>
      </div>
    </Link>
  );
}

function WireBriefStory({
  copy,
  nsfwOptInEnabled,
  referralCode,
  report,
}: {
  copy: ReturnType<typeof getCopy>;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  report: FanletterNewsReportDocument;
}) {
  const publishedAt = formatDate(report.sourcePublishedAt, report.locale);
  const nsfwCopy = getFanletterNsfwCopy(report.locale);
  const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
  const title = getArticleDisplayTitle(report.title);

  return (
    <Link
      className="group grid grid-cols-[7.75rem_minmax(0,1fr)] gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9.25rem_minmax(0,1fr)]"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="aspect-video self-start border border-white/12"
        nsfwLabel={nsfwCopy.badge}
        report={report}
        sizes="(max-width: 640px) 124px, 148px"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2 text-[0.62rem] font-black uppercase tracking-[0.1em]">
          <span className="text-[#44f26e]">{report.creatorName}</span>
          <span className="text-white/52">{getAccessLabel(report, copy)}</span>
          {publishedAt ? <span className="text-white/34">{publishedAt}</span> : null}
        </div>
        <h3
          className={`mt-1 line-clamp-3 break-words text-base font-black leading-5 [word-break:keep-all] group-hover:text-[#44f26e] ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {title}
        </h3>
        <p
          className={`mt-1 line-clamp-2 text-xs font-semibold leading-5 text-white/46 ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.dek}
        </p>
      </div>
    </Link>
  );
}

function PhotoDesk({
  copy,
  cutsHref,
  nsfwOptInEnabled,
  referralCode,
  reports,
}: {
  copy: ReturnType<typeof getCopy>;
  cutsHref: string;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  reports: FanletterNewsReportDocument[];
}) {
  if (reports.length === 0) {
    return null;
  }

  const [leadPhoto, ...restPhotos] = reports;

  return (
    <section className="overflow-hidden border-y-2 border-[#111510] bg-white text-[#111510] shadow-[0_22px_60px_rgba(17,21,16,0.08)]">
      <div className="grid gap-3 border-b-2 border-[#111510] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,0.42fr)] sm:items-end sm:p-5">
        <div>
          <p className="text-[0.66rem] font-black uppercase tracking-[0.26em] text-[#16702e]">
            AIAVpark Visual Edit
          </p>
          <h2 className="mt-2 max-w-3xl text-[2.6rem] font-black leading-[0.96] tracking-normal sm:text-[4.7rem]">
            {copy.photoDesk}
          </h2>
        </div>
        <Link
          className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full border border-black/12 bg-[#111510] px-4 text-sm font-black !text-white transition hover:bg-[#16702e] sm:justify-self-end"
          href={cutsHref}
        >
          <Images className="size-4 text-[#44f26e]" />
          {copy.cutFeedCta}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid gap-px bg-[#111510] lg:grid-cols-[minmax(0,1.12fr)_minmax(18rem,0.88fr)]">
        {leadPhoto ? (
          <PhotoDeskStory
            copy={copy}
            featured
            nsfwOptInEnabled={nsfwOptInEnabled}
            referralCode={referralCode}
            report={leadPhoto}
          />
        ) : null}
        {restPhotos.length > 0 ? (
          <div className="grid gap-px bg-[#111510] sm:grid-cols-3 lg:grid-cols-1">
            {restPhotos.slice(0, 3).map((report) => (
              <PhotoDeskStory
                copy={copy}
                key={report.reportId}
                nsfwOptInEnabled={nsfwOptInEnabled}
                referralCode={referralCode}
                report={report}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PhotoDeskStory({
  copy,
  featured = false,
  nsfwOptInEnabled,
  referralCode,
  report,
}: {
  copy: ReturnType<typeof getCopy>;
  featured?: boolean;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  report: FanletterNewsReportDocument;
}) {
  const publishedAt = formatDate(report.sourcePublishedAt, report.locale);
  const nsfwCopy = getFanletterNsfwCopy(report.locale);
  const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
  const title = getArticleDisplayTitle(report.title);

  return (
    <Link
      className={`group relative block overflow-hidden bg-[#111510] text-white ${
        featured
          ? "min-h-[25rem] sm:min-h-[32rem]"
          : "min-h-[14rem] sm:min-h-[16rem]"
      }`}
      href={getReportHref(report, referralCode)}
    >
      <div className="absolute inset-0">
        <NewsImage
          blurred={shouldBlur}
          className="h-full w-full"
          nsfwLabel={nsfwCopy.badge}
          priority={featured}
          report={report}
          sizes={
            featured
              ? "(max-width: 1024px) 100vw, 48rem"
              : "(max-width: 1024px) 33vw, 19rem"
          }
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/18 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2 text-[0.62rem] font-black uppercase tracking-[0.18em]">
          <span className="bg-white px-2.5 py-1 text-[#111510]">
            {getAccessLabel(report, copy)}
          </span>
          {publishedAt ? (
            <span className="border border-white/24 bg-black/28 px-2.5 py-1 text-white/78 backdrop-blur">
              {publishedAt}
            </span>
          ) : null}
        </div>
        <h2
          className={`mt-3 max-w-4xl break-words font-black leading-[0.98] tracking-normal text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] [word-break:keep-all] group-hover:text-[#f5f7f1] ${
            featured
              ? "line-clamp-3 text-[2.3rem] sm:text-[4.2rem]"
              : "line-clamp-3 text-2xl sm:text-3xl"
          } ${shouldBlur ? "select-none blur-[2px]" : ""}`}
        >
          {title}
        </h2>
        {featured ? (
          <p
            className={`mt-4 line-clamp-2 max-w-2xl text-sm font-semibold leading-6 text-white/72 sm:text-base sm:leading-7 ${
              shouldBlur ? "select-none blur-[2px]" : ""
            }`}
          >
            {report.dek}
          </p>
        ) : null}
        <div className="mt-4 h-px w-16 bg-white/70 transition group-hover:w-24" />
      </div>
    </Link>
  );
}

function NewsCharacterDirectory({
  characters,
  copy,
  locale,
  referralCode,
}: {
  characters: FanletterNewsCharacterStat[];
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  referralCode: string | null;
}) {
  if (characters.length === 0) {
    return null;
  }

  const directoryHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    referralCode,
  );
  const [featuredCharacter, ...profileCharacters] = characters;
  const featuredChannelHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters/${featuredCharacter.referralCode}`,
    referralCode ?? featuredCharacter.referralCode,
  );
  const featuredReport = featuredCharacter.representativeReport;
  const featuredReportImageUrl =
    getFanletterNewsReportPreviewImageUrl(featuredReport);
  const featuredLatestReportAt = formatDate(
    featuredCharacter.latestReportAt,
    locale,
  );

  return (
    <section
      className="overflow-hidden border-y-2 border-[#111510] bg-white shadow-[0_18px_44px_rgba(17,21,16,0.06)]"
      id="ai-characters"
    >
      <div className="grid gap-3 border-b-2 border-[#111510] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
        <div>
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
            {copy.characterDirectory.eyebrow}
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-normal">
            {copy.characterDirectory.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-black/58">
            {copy.characterDirectory.body}
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-black/14 px-4 py-2 text-center text-sm font-black leading-5 text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] sm:w-auto"
          href={directoryHref}
        >
          {copy.characterDirectory.cta}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(22rem,1.05fr)]">
        <Link
          className="group relative min-h-[25rem] overflow-hidden bg-[#111510] text-white lg:min-h-full"
          href={featuredChannelHref}
        >
          {featuredReportImageUrl ? (
            <>
              <Image
                alt=""
                aria-hidden="true"
                className="scale-125 object-cover object-center opacity-[0.62] blur-2xl brightness-[0.62] saturate-[0.95] transition duration-300 group-hover:scale-[1.3]"
                fill
                sizes="(max-width: 1024px) 100vw, 40rem"
                src={featuredReportImageUrl}
                unoptimized={shouldBypassFanletterImageOptimization(
                  featuredReportImageUrl,
                )}
              />
              <Image
                alt=""
                aria-hidden="true"
                className="object-cover object-center opacity-90 transition duration-300 group-hover:scale-[1.03] group-hover:opacity-100"
                fill
                sizes="(max-width: 1024px) 100vw, 40rem"
                src={featuredReportImageUrl}
                unoptimized={shouldBypassFanletterImageOptimization(
                  featuredReportImageUrl,
                )}
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(145deg,#07100b,#111510_52%,#203426)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/94 via-black/46 to-black/14" />
          <div className="relative flex min-h-[25rem] flex-col justify-end p-4 sm:p-5">
            <div className="flex min-w-0 items-end gap-3 sm:gap-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-full border-2 border-white/22 bg-[#111510] sm:size-24">
                {featuredCharacter.avatarImageUrl ? (
                  <Image
                    alt={featuredCharacter.name}
                    className="h-full w-full object-cover"
                    fill
                    sizes="6rem"
                    src={featuredCharacter.avatarImageUrl}
                    unoptimized={shouldBypassFanletterImageOptimization(
                      featuredCharacter.avatarImageUrl,
                    )}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/72">
                    <UserRound className="size-10" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 bg-[#44f26e] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.1em] text-black">
                  <Sparkles className="size-3.5" />
                  {copy.characterDirectory.profile}
                </span>
                <h3 className="mt-3 break-words text-[2rem] font-black leading-none tracking-normal !text-white [word-break:keep-all] sm:text-[2.8rem]">
                  {featuredCharacter.name}
                </h3>
                <p className="mt-2 truncate text-sm font-black text-white/58">
                  @{featuredCharacter.referralCode}
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/66">
              {getArticleDisplayTitle(featuredReport.title)}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-px bg-white/12">
              {[
                {
                  label: copy.characterDirectory.news,
                  value: featuredCharacter.newsCount,
                },
                {
                  label: copy.access.public,
                  value: featuredCharacter.publicCount,
                },
                {
                  label: copy.characterDirectory.fanOnly,
                  value: featuredCharacter.fanOnlyCount,
                },
              ].map((stat) => (
                <div className="bg-white/[0.07] p-3" key={stat.label}>
                  <p className="text-xl font-black leading-none text-white">
                    {formatNumber(stat.value, locale)}
                  </p>
                  <p className="mt-1 truncate text-[0.56rem] font-black uppercase tracking-[0.09em] text-white/46">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/14 pt-4 text-xs font-bold text-white/52">
              <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                <Clock3 className="size-3.5 shrink-0 text-[#44f26e]" />
                <span className="truncate">{featuredLatestReportAt}</span>
              </span>
              <span className="shrink-0 text-[#44f26e] group-hover:underline">
                {copy.characterDirectory.open}
              </span>
            </div>
          </div>
        </Link>

        <div className="min-w-0 divide-y divide-black/10 border-t border-black/12 bg-[#f7faf4] p-3 sm:p-4 lg:border-l lg:border-t-0">
          {profileCharacters.length > 0
            ? profileCharacters.map((character) => {
          const channelHref = buildPathWithReferral(
            `/${locale}/fanletter/news/characters/${character.referralCode}`,
            referralCode ?? character.referralCode,
          );
          const report = character.representativeReport;
          const latestReportAt = formatDate(character.latestReportAt, locale);

          return (
            <Link
              className="group grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-center"
              href={channelHref}
              key={character.referralCode}
            >
              <div className="relative size-16 overflow-hidden rounded-full border border-black/10 bg-[#111510] sm:size-[4.5rem]">
                {character.avatarImageUrl ? (
                  <Image
                    alt={character.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                    fill
                    sizes="4.5rem"
                    src={character.avatarImageUrl}
                    unoptimized={shouldBypassFanletterImageOptimization(
                      character.avatarImageUrl,
                    )}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/70">
                    <UserRound className="size-7" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="min-w-0 truncate text-lg font-black tracking-normal group-hover:text-[#16702e]">
                    {character.name}
                  </h3>
                  <span className="inline-flex shrink-0 items-center gap-1 bg-white px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.08em] text-[#16702e]">
                    <Newspaper className="size-3" />
                    {formatNumber(character.newsCount, locale)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs font-bold text-black/42">
                    @{character.referralCode}
                </p>
                <p className="mt-2 line-clamp-2 break-words text-sm font-semibold leading-5 text-black/62 [word-break:keep-all]">
                  {getArticleDisplayTitle(report.title)}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[0.64rem] font-black uppercase tracking-[0.08em] text-black/38">
                  <span className="text-[#16702e]">
                    {formatNumber(character.publicCount, locale)}{" "}
                    {copy.access.public}
                  </span>
                  <span>
                    {formatNumber(character.fanOnlyCount, locale)}{" "}
                    {copy.characterDirectory.fanOnly}
                  </span>
                  {latestReportAt ? <span>{latestReportAt}</span> : null}
                </div>
              </div>

              <span className="hidden shrink-0 text-xs font-black text-[#16702e] group-hover:underline sm:block">
                {copy.characterDirectory.open}
              </span>
            </Link>
          );
            })
            : null}
        </div>
      </div>
    </section>
  );
}

function ReporterRank({
  copy,
  locale,
  referralCode,
  reporters,
  selectedReporterReferralCode,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  referralCode: string | null;
  reporters: ReporterStat[];
  selectedReporterReferralCode: string | null;
}) {
  if (reporters.length === 0) {
    return null;
  }

  return (
    <section
      className="border border-black/12 bg-white p-4 shadow-[0_16px_36px_rgba(17,21,16,0.06)]"
      id="fan-reporters"
    >
      <SectionHeader
        icon={<PenLine className="size-5" />}
        title={copy.reporterRank}
      />
      <div className="space-y-3">
        {reporters.map((reporter, index) => {
          const isSelected =
            reporter.referralCode === selectedReporterReferralCode;
          const latestReportAt = formatDate(reporter.latestReportAt, locale);

          return (
            <Link
              className={`group grid grid-cols-[2.65rem_minmax(0,1fr)] gap-3 border border-black/10 p-3 transition hover:border-[#19b84b] ${
                isSelected ? "bg-[#ecfff0]" : "bg-white hover:bg-[#f7fbf5]"
              }`}
              href={getReporterNewsHref(
                locale,
                reporter.referralCode,
                referralCode,
              )}
              key={reporter.referralCode}
            >
              <span className="relative flex size-10 items-center justify-center overflow-hidden rounded-full bg-[#111510] text-xs font-black text-[#44f26e]">
                {reporter.avatarImageUrl ? (
                  <Image
                    alt=""
                    aria-hidden="true"
                    className="object-cover"
                    fill
                    sizes="2.5rem"
                    src={reporter.avatarImageUrl}
                    unoptimized={shouldBypassFanletterImageOptimization(
                      reporter.avatarImageUrl,
                    )}
                  />
                ) : (
                  reporter.name.trim().charAt(0).toUpperCase() ||
                  reporter.referralCode.charAt(0)
                )}
                <span className="absolute bottom-0 right-0 flex size-4 items-center justify-center bg-[#44f26e] text-[0.56rem] font-black text-black">
                  {index + 1}
                </span>
              </span>
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">
                      {reporter.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-bold text-black/42">
                      @{reporter.referralCode}
                    </p>
                  </div>
                  <span className="grid shrink-0 justify-items-center bg-[#44f26e] px-2 py-1 text-black">
                    <span className="text-[0.72rem] font-black leading-none">
                      {formatNumber(reporter.count, locale)}
                    </span>
                    <span className="mt-0.5 text-[0.52rem] font-black uppercase leading-none tracking-[0.08em]">
                      {copy.reporterReportUnit}
                    </span>
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.66rem] font-bold text-black/46">
                  <span className="text-[#16702e] group-hover:underline">
                    {copy.reporterNewsCta}
                  </span>
                  {reporter.firstReportCount > 0 ? (
                    <span className="font-black text-[#16702e]">
                      {copy.reporterFirstMetric}{" "}
                      {formatNumber(reporter.firstReportCount, locale)}
                    </span>
                  ) : null}
                  {latestReportAt ? <span>{latestReportAt}</span> : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ReporterFilterBanner({
  copy,
  locale,
  newsHomeHref,
  profile,
  reporterReferralCode,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  newsHomeHref: string;
  profile: FanletterNewsReporterProfile | null;
  reporterReferralCode: string;
}) {
  const reporterName =
    profile?.displayName ??
    getReporterFallbackDisplayName(locale, reporterReferralCode);

  return (
    <section className="grid gap-4 border border-black/12 bg-white p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
      <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-full bg-[#111510] text-lg font-black text-[#44f26e]">
        {profile?.avatarImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover"
            fill
            sizes="4rem"
            src={profile.avatarImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(
              profile.avatarImageUrl,
            )}
          />
        ) : (
          reporterName.trim().charAt(0).toUpperCase() ||
          reporterReferralCode.charAt(0)
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
          {copy.reporterFilter.eyebrow}
        </p>
        <h2 className="mt-1 break-words text-2xl font-black leading-tight [word-break:keep-all]">
          {copy.reporterFilter.title(reporterName)}
        </h2>
      </div>
      <Link
        className="inline-flex h-11 items-center justify-center border border-black/14 px-4 text-sm font-black text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
        href={newsHomeHref}
      >
        {copy.reporterFilter.allNews}
      </Link>
    </section>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const copy = getCopy(locale);

  return {
    title: `${copy.siteName} | AIAVpark`,
    description: copy.dek,
  };
}

export default async function LocalizedFanletterNewsHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsHomeSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const trackingStarId = readFanletterStarId(query.starId);
  const coverageAction = normalizeAgentRankCoverageAction(query.coverageAction);
  const activeReporterReferralCode = readFanletterReferralCode(query.reporter);
  const returnToHref = normalizeFanletterReturnToPath(query.returnTo, locale);
  const returnToLabel = isFanletterNewsCutFeedReturnPath(returnToHref, locale)
    ? copy.returnToFeed
    : copy.returnToPrevious;
  const nsfwOptInEnabled = false;
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const returnableNewsHomeHref = returnToHref
    ? setPathSearchParams(newsHomeHref, { returnTo: returnToHref })
    : newsHomeHref;

  if (activeReporterReferralCode) {
    redirect(getReporterNewsHref(locale, activeReporterReferralCode, referralCode));
  }

  const currentNewsHref = activeReporterReferralCode
    ? getReporterNewsHref(locale, activeReporterReferralCode, referralCode)
    : returnableNewsHomeHref;
  const [
    allReports,
    latestNewsReports,
    publicReports,
    activeReporterProfile,
  ] =
    await Promise.all([
      getLatestFanletterNewsReports({ limit: 48, locale }),
      activeReporterReferralCode
        ? getLatestFanletterNewsReports({
            limit: 48,
            locale,
            promoteFirstReports: true,
            reporterReferralCode: activeReporterReferralCode,
          })
        : getLatestFanletterNewsReports({
            limit: 48,
            locale,
            promoteFirstReports: true,
          }),
      getLatestFanletterNewsReports({
        limit: 24,
        locale,
        promoteFirstReports: true,
        priceType: "free",
        reporterReferralCode: activeReporterReferralCode,
      }),
      activeReporterReferralCode
        ? getFanletterNewsReporterProfile({
            reporterReferralCode: activeReporterReferralCode,
          })
        : Promise.resolve(null),
    ]);
  const reports = buildMixedNewsHomeReports({
    latestReports: latestNewsReports,
    limit: 28,
    publicReports,
  });
  const editorialAllReports = allReports.filter(isEditorialSafeReport);
  const excludedNsfwReportCount = new Set(
    [...latestNewsReports, ...publicReports]
      .filter(isNsfwReport)
      .map((report) => report.reportId),
  ).size;
  const leadReport =
    reports.find(isPreferredLeadReport) ??
    reports.find((report) => Boolean(report.coverImageUrl)) ??
    reports[0];
  const restReports = leadReport
    ? reports.filter((report) => report.reportId !== leadReport.reportId)
    : [];
  const heroSideReports = restReports.slice(0, 2);
  const topStories = restReports.slice(2, 7);
  const sectionCandidateReports = restReports.slice(7);
  const photoDeskReports = getPhotoDeskReports(
    sectionCandidateReports,
    PHOTO_DESK_REPORT_LIMIT,
  );
  const reportsAfterPhotoDesk = excludeReports(
    sectionCandidateReports,
    photoDeskReports,
  );
  const featureReports = getBalancedCharacterWireReports(
    reportsAfterPhotoDesk,
    CHARACTER_WIRE_REPORT_LIMIT,
  );
  const primaryDisplayedReports = [
    ...(leadReport ? [leadReport] : []),
    ...heroSideReports,
    ...topStories,
    ...photoDeskReports,
    ...featureReports,
  ];
  const latestSectionReports = excludeReports(
    allReports.filter(isEditorialSafeReport),
    primaryDisplayedReports,
  ).slice(0, LATEST_SECTION_REPORT_LIMIT);
  const [reporterStats, characterNewsStats] = await Promise.all([
    hydrateReporterStats(getReporterStats(editorialAllReports)),
    hydrateFanletterNewsCharacterStats(
      getFanletterNewsCharacterStats(editorialAllReports, 8),
    ),
  ]);
  const activeReporterName = activeReporterReferralCode
    ? activeReporterProfile?.displayName ??
      getReporterFallbackDisplayName(locale, activeReporterReferralCode)
    : null;
  const displayedNewsCount = reports.length;
  const displayedReporterCount = activeReporterReferralCode
    ? displayedNewsCount > 0
      ? 1
      : 0
    : getNewsroomReporterCount(reports);
  const visualReportCount = photoDeskReports.length;
  const portalLatestReports = reports.filter(isEditorialSafeReport).slice(0, 6);
  const portalFreePreviewReports = publicReports
    .filter(isEditorialSafeReport)
    .slice(0, 4);
  const charactersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    referralCode,
  );
  const purchasesHref = buildPathWithReferral(
    `/${locale}/fanletter/news/purchases`,
    referralCode,
  );
  const myHref = buildPathWithReferral(
    `/${locale}/fanletter/news/my`,
    referralCode,
  );
  const galleryHref = buildPathWithReferral(
    `/${locale}/fanletter/news/gallery`,
    referralCode,
  );
  const cutsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/cuts`,
    referralCode,
  );
  const platformHref = buildPathWithReferral(
    `/${locale}/fanletter/news/platform`,
    referralCode,
  );
  const reportsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports`,
    referralCode,
  );
  const reportersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reporters`,
    referralCode,
  );
  const reportNewHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports/new`,
    referralCode,
  );
  const vlogsHref = getFanletterNewsVlogsHref({
    locale,
    referralCode,
  });
  const vlogManageHref = getFanletterNewsVlogManageHref({
    locale,
    referralCode,
  });
  const vlogNewHref = getFanletterNewsVlogStartHref({
    locale,
    referralCode,
    returnToHref: vlogManageHref,
  });
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef1ec] pb-[calc(6.5rem+env(safe-area-inset-bottom))] text-[#111510] md:pb-0">
      <FanletterReputationTracker
        agentRank={{
          eventType: "content_engaged",
          intent: "fanletter_news_home_view",
          source: "fanletter_news",
          starId: trackingStarId,
        }}
        metadata={{
          coverageAction,
          coverageActionStarId: trackingStarId,
          page: "fanletter_news_home",
          reporterReferralCode: activeReporterReferralCode,
          sourceStarId: trackingStarId,
        }}
        referralCode={referralCode}
      />
      <NewsMasthead
        charactersHref={charactersHref}
        copy={copy}
        cutsHref={cutsHref}
        galleryHref={galleryHref}
        locale={locale}
        myHref={myHref}
        navigationBaseHref={currentNewsHref}
        platformHref={platformHref}
        purchasesHref={purchasesHref}
        reportersHref={reportersHref}
        reportsHref={reportsHref}
        vlogsHref={vlogsHref}
      />
      {returnToHref ? (
        <section className="border-b border-black/10 bg-[#fbfcf8]">
          <div className="mx-auto max-w-[92rem] px-4 py-2.5 sm:px-6 lg:px-8">
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-3 text-xs font-black !text-[#111510] shadow-sm transition hover:border-[#19b84b] hover:bg-[#ecfff0] hover:!text-[#16702e]"
              href={returnToHref}
            >
              <ArrowLeft className="size-4 text-[#16702e]" />
              {returnToLabel}
            </Link>
          </div>
        </section>
      ) : null}
      <NewsTicker
        copy={copy}
        referralCode={referralCode}
        reports={reports.slice(0, 5)}
      />
      <InvestorPlatformEntry
        characterCount={characterNewsStats.length}
        copy={copy}
        locale={locale}
        platformHref={platformHref}
        previewCount={portalFreePreviewReports.length}
        reportCount={displayedNewsCount}
      />
      <ProducerQuickStartRail
        copy={copy}
        reportDeskHref={reportsHref}
        reportNewHref={reportNewHref}
        vlogManageHref={vlogManageHref}
        vlogNewHref={vlogNewHref}
      />

      <section className="mx-auto max-w-[92rem] px-4 py-4 sm:px-6 sm:py-7 lg:px-8">
        {leadReport ? (
          <div className="space-y-7 sm:space-y-9">
            {activeReporterReferralCode ? (
              <ReporterFilterBanner
                copy={copy}
                locale={locale}
                newsHomeHref={newsHomeHref}
                profile={activeReporterProfile}
                reporterReferralCode={activeReporterReferralCode}
              />
            ) : null}

            <DailyUpdatePortal
              characters={characterNewsStats}
              charactersHref={charactersHref}
              copy={copy}
              freePreviewReports={portalFreePreviewReports}
              galleryHref={galleryHref}
              latestReports={portalLatestReports}
              locale={locale}
              referralCode={referralCode}
              reporterCount={displayedReporterCount}
              reporterStats={reporterStats}
              reportNewHref={reportNewHref}
              reportsHref={reportsHref}
            />

            <NewsFrontPage
              characterNewsStats={characterNewsStats}
              copy={copy}
              displayedNewsCount={displayedNewsCount}
              displayedReporterCount={displayedReporterCount}
              heroSideReports={heroSideReports}
              leadReport={leadReport}
              locale={locale}
              nsfwOptInEnabled={nsfwOptInEnabled}
              referralCode={referralCode}
              reporterStats={reporterStats}
              selectedReporterReferralCode={activeReporterReferralCode}
              topStories={topStories}
              visualReportCount={visualReportCount}
            />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22.5rem] xl:items-start">
              <div className="min-w-0 space-y-7 sm:space-y-9">
                <PhotoDesk
                  copy={copy}
                  cutsHref={cutsHref}
                  nsfwOptInEnabled={nsfwOptInEnabled}
                  referralCode={referralCode}
                  reports={photoDeskReports}
                />

                <NewsCharacterDirectory
                  characters={characterNewsStats}
                  copy={copy}
                  locale={locale}
                  referralCode={referralCode}
                />

                <CharacterWireSection
                  copy={copy}
                  locale={locale}
                  nsfwOptInEnabled={nsfwOptInEnabled}
                  referralCode={referralCode}
                  reports={featureReports}
                />

                {latestSectionReports.length > 0 ? (
                  <section id="latest-news">
                    <SectionHeader
                      icon={<FileText className="size-5" />}
                      title={copy.latest}
                    />
                    <div className="grid gap-4 border border-black/10 bg-white p-3 shadow-[0_16px_36px_rgba(17,21,16,0.05)] sm:grid-cols-2 sm:p-4">
                      {latestSectionReports.map((report) => (
                        <CompactStory
                          copy={copy}
                          key={report.reportId}
                          nsfwOptInEnabled={nsfwOptInEnabled}
                          referralCode={referralCode}
                          report={report}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>

              <aside className="space-y-5 xl:sticky xl:top-4">
                <ReporterRank
                  copy={copy}
                  locale={locale}
                  referralCode={referralCode}
                  reporters={reporterStats}
                  selectedReporterReferralCode={activeReporterReferralCode}
                />

                <section className="border border-black/12 bg-white p-4 shadow-[0_16px_36px_rgba(17,21,16,0.06)]">
                  <SectionHeader
                    icon={<FileText className="size-5" />}
                    title={copy.newsroomStats}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#f5f6f2] p-3">
                      <p className="text-lg font-black">
                        {formatNumber(displayedNewsCount, locale)}
                      </p>
                      <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/42">
                        {copy.newsroomStatLabels.news}
                      </p>
                    </div>
                    <div className="bg-[#f5f6f2] p-3">
                      <p className="text-lg font-black">
                        {formatNumber(displayedReporterCount, locale)}
                      </p>
                      <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/42">
                        {copy.newsroomStatLabels.reporters}
                      </p>
                    </div>
                    <div className="bg-[#f5f6f2] p-3">
                      <p className="text-lg font-black">
                        {formatNumber(visualReportCount, locale)}
                      </p>
                      <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/42">
                        {copy.newsroomStatLabels.visuals}
                      </p>
                    </div>
                  </div>
                  {excludedNsfwReportCount > 0 ? (
                    <p className="mt-3 border-t border-black/10 pt-3 text-xs font-bold leading-5 text-black/42">
                      {locale === "ko"
                        ? `뉴스 홈 편집에서 NSFW 리포트 ${formatNumber(
                            excludedNsfwReportCount,
                            locale,
                          )}개를 제외했습니다.`
                        : `${formatNumber(
                            excludedNsfwReportCount,
                            locale,
                          )} NSFW reports are excluded from this news home edit.`}
                    </p>
                  ) : null}
                </section>
              </aside>
            </div>

            <FanletterServiceBridge
              locale={locale}
              newsHref={newsHomeHref}
              studioHref={studioHref}
              variant="news"
              vlogHref={charactersHref}
            />
          </div>
        ) : (
          <section className="mt-6 rounded-lg border border-black/10 bg-white p-8 text-center">
            <UserRound className="mx-auto size-12 text-[#16702e]" />
            <h2 className="mt-4 text-2xl font-black">
              {activeReporterName
                ? copy.emptyReporterTitle(activeReporterName)
                : copy.emptyTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-black/58">
              {activeReporterName
                ? copy.emptyReporterBody(activeReporterName)
                : copy.emptyBody}
            </p>
            {activeReporterName ? (
              <Link
                className="mt-5 inline-flex h-11 items-center justify-center border border-black/14 px-4 text-sm font-black text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                href={newsHomeHref}
              >
                {copy.reporterFilter.allNews}
              </Link>
            ) : null}
          </section>
        )}
      </section>
    </main>
  );
}
