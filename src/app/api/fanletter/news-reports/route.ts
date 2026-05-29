import { revalidatePath } from "next/cache";

import {
  createFanletterNewsReportShareHref,
  FANLETTER_NEWS_EXCLUSIVE_REPORTER_ACTIVE_ERROR,
  FANLETTER_NEWS_PAID_SOURCE_ACCESS_REQUIRED_ERROR,
  getFanletterNewsReportForReporter,
  getFanletterNewsReportCoverOptions,
  getFanletterNewsReportsForContent,
  getOrCreateFanletterNewsReport,
  updateFanletterNewsReportCoverImage,
  type FanletterNewsReportCoverOption,
} from "@/lib/fanletter-news-report-service";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import { readMemberServerSession } from "@/lib/member-server-session";
import { normalizeReferralCode } from "@/lib/member";
import type { FanletterNewsReportDocument } from "@/lib/content";

type FanletterNewsReportCreateRequest = {
  contentId?: string | null;
  croppedCoverCrop?: {
    aspectRatio?: number | null;
    height?: number | null;
    outputHeight?: number | null;
    outputWidth?: number | null;
    sourceImageUrl?: string | null;
    width?: number | null;
    x?: number | null;
    y?: number | null;
  } | null;
  croppedCoverImageUrl?: string | null;
  croppedCoverSourceImageUrl?: string | null;
  email?: string | null;
  locale?: string | null;
  reporterComment?: string | null;
  selectedCoverImageUrl?: string | null;
  selectedTeaserImages?: Array<{
    crop?: {
      aspectRatio?: number | null;
      height?: number | null;
      outputHeight?: number | null;
      outputWidth?: number | null;
      sourceImageUrl?: string | null;
      width?: number | null;
      x?: number | null;
      y?: number | null;
    } | null;
    imageUrl?: string | null;
    sourceImageUrl?: string | null;
  }> | null;
  selectedTeaserImageUrls?: string[] | null;
  walletAddress?: string | null;
};

type FanletterNewsReportCoverUpdateRequest = {
  croppedCoverCrop?: {
    aspectRatio?: number | null;
    height?: number | null;
    outputHeight?: number | null;
    outputWidth?: number | null;
    sourceImageUrl?: string | null;
    width?: number | null;
    x?: number | null;
    y?: number | null;
  } | null;
  croppedCoverImageUrl?: string | null;
  croppedCoverSourceImageUrl?: string | null;
  email?: string | null;
  locale?: string | null;
  reportId?: string | null;
  selectedCoverImageUrl?: string | null;
  selectedTeaserImages?: Array<{
    crop?: {
      aspectRatio?: number | null;
      height?: number | null;
      outputHeight?: number | null;
      outputWidth?: number | null;
      sourceImageUrl?: string | null;
      width?: number | null;
      x?: number | null;
      y?: number | null;
    } | null;
    imageUrl?: string | null;
    sourceImageUrl?: string | null;
  }> | null;
  selectedTeaserImageUrls?: string[] | null;
  walletAddress?: string | null;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getErrorStatus(message: string) {
  if (message === "contentId is required." || message === "reportId is required.") {
    return 400;
  }

  if (message === "Content not found." || message === "Report not found.") {
    return 404;
  }

  if (message.includes("not authorized") || message.includes("authorization")) {
    return 403;
  }

  if (message === FANLETTER_NEWS_EXCLUSIVE_REPORTER_ACTIVE_ERROR) {
    return 403;
  }

  if (message === FANLETTER_NEWS_PAID_SOURCE_ACCESS_REQUIRED_ERROR) {
    return 403;
  }

  return 500;
}

function serializeNewsReport(report: FanletterNewsReportDocument) {
  return {
    coverImageUrl: report.coverImageUrl,
    createdAt: report.createdAt.toISOString(),
    dek: report.dek,
    reporterAvatarImageUrl: report.reporterAvatarImageUrl ?? null,
    reporterCharacterName: report.reporterCharacterName ?? null,
    reporterName: report.reporterName,
    reportId: report.reportId,
    shareHref: createFanletterNewsReportShareHref(report),
    title: report.title,
  };
}

function serializeContentNewsReport({
  report,
  viewerReporterReferralCode,
}: {
  report: FanletterNewsReportDocument;
  viewerReporterReferralCode?: string | null;
}) {
  const normalizedViewerReporterReferralCode = normalizeReferralCode(
    viewerReporterReferralCode,
  );

  return {
    coverImageUrl: report.coverImageUrl,
    createdAt: report.createdAt.toISOString(),
    dek: report.dek,
    href: createFanletterNewsReportShareHref(report),
    isViewerReport:
      Boolean(normalizedViewerReporterReferralCode) &&
      report.reporterReferralCode === normalizedViewerReporterReferralCode,
    reporterName: report.reporterName,
    reportId: report.reportId,
    title: report.title,
  };
}

function serializeCoverOption(option: FanletterNewsReportCoverOption) {
  return {
    candidateId: option.candidateId,
    contentType: option.contentType,
    imageUrl: option.imageUrl,
    inputValue: option.inputValue,
    isAuto: option.isAuto,
    isSelected: option.isSelected,
    height: option.height,
    placements: option.placements,
    source: option.source,
    timestampSec: option.timestampSec,
    width: option.width,
  };
}

async function resolveReporterCredentials({
  email,
  walletAddress,
}: {
  email?: string | null;
  walletAddress?: string | null;
}) {
  const hasRequestCredentials = Boolean(email && walletAddress);
  const session = hasRequestCredentials ? null : await readMemberServerSession();
  const credentials = hasRequestCredentials
    ? {
        email,
        walletAddress,
      }
    : session
      ? {
          email: session.email,
          walletAddress: session.walletAddress,
        }
      : null;

  if (!credentials?.email || !credentials.walletAddress) {
    return {
      error: jsonError("Connect your account to create an AI fan report.", 401),
      reporterReferralCode: null,
    };
  }

  const authorization = await validateMemberWalletOwner({
    allowedStatuses: ["completed", "pending_payment"],
    email: credentials.email,
    walletAddress: credentials.walletAddress,
  });

  if (authorization.error) {
    return {
      error: authorization.error,
      reporterReferralCode: null,
    };
  }

  const reporterReferralCode = normalizeReferralCode(
    authorization.member?.referralCode,
  );

  if (!reporterReferralCode) {
    return {
      error: jsonError("Connected account does not have a fan reporter code.", 403),
      reporterReferralCode: null,
    };
  }

  return {
    credentials,
    error: null,
    reporterReferralCode,
  };
}

async function resolveOptionalReporterReferralCode({
  email,
  walletAddress,
}: {
  email?: string | null;
  walletAddress?: string | null;
}) {
  const hasRequestCredentials = Boolean(email && walletAddress);
  const session = hasRequestCredentials ? null : await readMemberServerSession();
  const credentials = hasRequestCredentials
    ? {
        email,
        walletAddress,
      }
    : session
      ? {
          email: session.email,
          walletAddress: session.walletAddress,
        }
      : null;

  if (!credentials?.email || !credentials.walletAddress) {
    return null;
  }

  const authorization = await validateMemberWalletOwner({
    allowedStatuses: ["completed", "pending_payment"],
    email: credentials.email,
    walletAddress: credentials.walletAddress,
  });

  if (authorization.error) {
    return null;
  }

  return normalizeReferralCode(authorization.member?.referralCode);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    if (searchParams.get("scope") === "content") {
      const localeParam = searchParams.get("locale");
      const locale: Locale =
        localeParam && hasLocale(localeParam) ? localeParam : defaultLocale;
      const viewerReporterReferralCode = await resolveOptionalReporterReferralCode({
        email: searchParams.get("email"),
        walletAddress: searchParams.get("walletAddress"),
      });
      const limitParam = Number(searchParams.get("limit") ?? "4");
      const result = await getFanletterNewsReportsForContent({
        contentId: searchParams.get("contentId") ?? "",
        limit: Number.isFinite(limitParam) ? limitParam : 4,
        locale,
        viewerReporterReferralCode,
      });

      return Response.json({
        reportCount: result.reportCount,
        reports: result.reports.map((report) =>
          serializeContentNewsReport({ report, viewerReporterReferralCode }),
        ),
      });
    }

    if (searchParams.get("scope") === "cover-options") {
      const reporter = await resolveReporterCredentials({
        email: searchParams.get("email"),
        walletAddress: searchParams.get("walletAddress"),
      });

      if (reporter.error) {
        return reporter.error;
      }

      const coverEditor = await getFanletterNewsReportCoverOptions({
        reportId: searchParams.get("reportId"),
        reporterReferralCode: reporter.reporterReferralCode,
      });

      return Response.json({
        options: coverEditor.options.map(serializeCoverOption),
        teaserImageUrls: coverEditor.teaserImageUrls,
      });
    }

    const reporter = await resolveReporterCredentials({
      email: searchParams.get("email"),
      walletAddress: searchParams.get("walletAddress"),
    });

    if (reporter.error) {
      return reporter.error;
    }

    const report = await getFanletterNewsReportForReporter({
      contentId: searchParams.get("contentId"),
      locale: searchParams.get("locale"),
      reporterReferralCode: reporter.reporterReferralCode,
    });

    return Response.json({
      report: report ? serializeNewsReport(report) : null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load FanLetter news report.";

    return jsonError(message, getErrorStatus(message));
  }
}

export async function POST(request: Request) {
  let body: FanletterNewsReportCreateRequest | null = null;

  try {
    body = (await request.json()) as FanletterNewsReportCreateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const reporter = await resolveReporterCredentials({
      email: body?.email,
      walletAddress: body?.walletAddress,
    });

    if (reporter.error) {
      return reporter.error;
    }

    const report = await getOrCreateFanletterNewsReport({
      contentId: body?.contentId,
      croppedCoverCrop: body?.croppedCoverCrop,
      croppedCoverImageUrl: body?.croppedCoverImageUrl,
      croppedCoverSourceImageUrl: body?.croppedCoverSourceImageUrl,
      locale: body?.locale,
      reporterEmail: reporter.credentials.email,
      reporterComment: body?.reporterComment,
      reporterReferralCode: reporter.reporterReferralCode,
      selectedCoverImageUrl: body?.selectedCoverImageUrl,
      selectedTeaserImages: body?.selectedTeaserImages,
      selectedTeaserImageUrls: body?.selectedTeaserImageUrls,
    });

    return Response.json({
      report: serializeNewsReport(report),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create FanLetter news report.";

    return jsonError(message, getErrorStatus(message));
  }
}

export async function PATCH(request: Request) {
  let body: FanletterNewsReportCoverUpdateRequest | null = null;

  try {
    body = (await request.json()) as FanletterNewsReportCoverUpdateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const reporter = await resolveReporterCredentials({
      email: body?.email,
      walletAddress: body?.walletAddress,
    });

    if (reporter.error) {
      return reporter.error;
    }

    const report = await updateFanletterNewsReportCoverImage({
      croppedCoverCrop: body?.croppedCoverCrop,
      croppedCoverImageUrl: body?.croppedCoverImageUrl,
      croppedCoverSourceImageUrl: body?.croppedCoverSourceImageUrl,
      reportId: body?.reportId,
      reporterReferralCode: reporter.reporterReferralCode,
      selectedCoverImageUrl: body?.selectedCoverImageUrl,
      selectedTeaserImages: body?.selectedTeaserImages,
      selectedTeaserImageUrls: body?.selectedTeaserImageUrls,
    });
    const locale: Locale =
      body?.locale && hasLocale(body.locale) ? body.locale : report.locale;

    revalidatePath(`/${locale}/fanletter/news/${report.reportId}`);
    revalidatePath(`/${locale}/fanletter/news`);
    revalidatePath(`/${locale}/fanletter/news/reports`);
    revalidatePath(`/${locale}/fanletter/reports`);

    return Response.json({
      report: {
        coverImageSource: report.coverImageSource ?? "auto",
        coverImageUrl: report.coverImageUrl,
        reportId: report.reportId,
        teaserImageUrls: report.teaserImageUrls ?? [],
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update FanLetter news report cover.";

    return jsonError(message, getErrorStatus(message));
  }
}
