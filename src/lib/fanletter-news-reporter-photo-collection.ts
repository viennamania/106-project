import "server-only";

import type {
  ContentMaturityRating,
  FanletterNewsReportCoverCropDocument,
  FanletterNewsReportDocument,
  FanletterNewsReportTeaserImageDocument,
} from "@/lib/content";
import {
  getFanletterNewsReporterMemberByEmail,
  type FanletterNewsReporterMember,
} from "@/lib/fanletter-news-report-service";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { getFanletterNewsReportsCollection } from "@/lib/mongodb";

const REPORTER_PHOTO_COLLECTION_DEFAULT_REPORT_LIMIT = 18;
const REPORTER_PHOTO_COLLECTION_MAX_REPORT_LIMIT = 36;
const REPORTER_PHOTO_COLLECTION_CUT_LIMIT = 4;

type FanletterNewsReporterPhotoCollectionReport = Pick<
  FanletterNewsReportDocument,
  | "contentId"
  | "contentMaturityRating"
  | "createdAt"
  | "creatorName"
  | "creatorReferralCode"
  | "reporterAvatarImageUrl"
  | "reporterName"
  | "reportId"
  | "sourcePublishedAt"
  | "sourceTitle"
  | "teaserImages"
  | "teaserImageUrls"
  | "title"
  | "updatedAt"
>;

type ReporterEditedCut = {
  crop: FanletterNewsReportCoverCropDocument | null;
  imageUrl: string;
  source: FanletterNewsReportTeaserImageDocument["source"] | "legacy_teaser";
  sourceImageUrl: string | null;
};

export type FanletterNewsReporterPhotoCollectionItem = {
  contentId: string;
  contentMaturityRating: ContentMaturityRating;
  crop: FanletterNewsReportCoverCropDocument | null;
  creatorName: string;
  creatorReferralCode: string | null;
  id: string;
  imageUrl: string;
  reportCreatedAt: Date;
  reporterAvatarImageUrl: string | null;
  reporterName: string;
  reportId: string;
  reportTitle: string;
  slotNumber: number;
  source: ReporterEditedCut["source"];
  sourceImageUrl: string | null;
  sourcePublishedAt: Date | null;
  sourceTitle: string;
  updatedAt: Date;
};

export type FanletterNewsReporterPhotoCollectionResult = {
  characterCount: number;
  latestUpdatedAt: Date | null;
  member: FanletterNewsReporterMember | null;
  page: number;
  pageCount: number;
  photoCount: number;
  photos: FanletterNewsReporterPhotoCollectionItem[];
  reportCount: number;
  reportsPerPage: number;
};

function normalizePositiveInteger(value: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.floor(value));
}

function getReporterEditedCuts(
  report: Pick<FanletterNewsReportDocument, "teaserImages" | "teaserImageUrls">,
): ReporterEditedCut[] {
  const croppedCuts =
    report.teaserImages
      ?.filter(
        (image) =>
          image.source === "reporter_cropped" && image.imageUrl.trim(),
      )
      .map((image) => ({
        crop: image.crop ?? null,
        imageUrl: image.imageUrl.trim(),
        source: image.source,
        sourceImageUrl: image.sourceImageUrl.trim() || null,
      })) ?? [];

  if (croppedCuts.length > 0) {
    return croppedCuts.slice(0, REPORTER_PHOTO_COLLECTION_CUT_LIMIT);
  }

  return (report.teaserImageUrls ?? [])
    .map((imageUrl) => imageUrl.trim())
    .filter(Boolean)
    .slice(0, REPORTER_PHOTO_COLLECTION_CUT_LIMIT)
    .map((imageUrl) => ({
      crop: null,
      imageUrl,
      source: "legacy_teaser" as const,
      sourceImageUrl: imageUrl,
    }));
}

function countEditedCuts(
  report: Pick<FanletterNewsReportDocument, "teaserImages" | "teaserImageUrls">,
) {
  return getReporterEditedCuts(report).length;
}

function toPhotoCollectionItems(
  reports: FanletterNewsReporterPhotoCollectionReport[],
): FanletterNewsReporterPhotoCollectionItem[] {
  return reports.flatMap((report) =>
    getReporterEditedCuts(report).map((cut, index) => ({
      contentId: report.contentId,
      contentMaturityRating: report.contentMaturityRating,
      crop: cut.crop,
      creatorName: report.creatorName,
      creatorReferralCode: report.creatorReferralCode,
      id: `${report.reportId}-${index}-${cut.imageUrl}`,
      imageUrl: cut.imageUrl,
      reportCreatedAt: report.createdAt,
      reporterAvatarImageUrl: report.reporterAvatarImageUrl ?? null,
      reporterName: report.reporterName,
      reportId: report.reportId,
      reportTitle: report.title,
      slotNumber: index + 1,
      source: cut.source,
      sourceImageUrl: cut.sourceImageUrl,
      sourcePublishedAt: report.sourcePublishedAt,
      sourceTitle: report.sourceTitle,
      updatedAt: report.updatedAt,
    })),
  );
}

export async function getFanletterNewsReporterPhotoCollectionForMember({
  email,
  locale,
  page = 1,
  reportsPerPage = REPORTER_PHOTO_COLLECTION_DEFAULT_REPORT_LIMIT,
}: {
  email?: string | null;
  locale?: Locale | null;
  page?: number;
  reportsPerPage?: number;
}): Promise<FanletterNewsReporterPhotoCollectionResult> {
  const normalizedLocale = locale ?? defaultLocale;
  const member = await getFanletterNewsReporterMemberByEmail(
    email,
    normalizedLocale,
  );
  const normalizedPage = normalizePositiveInteger(page, 1);
  const normalizedReportsPerPage = Math.min(
    normalizePositiveInteger(
      reportsPerPage,
      REPORTER_PHOTO_COLLECTION_DEFAULT_REPORT_LIMIT,
    ),
    REPORTER_PHOTO_COLLECTION_MAX_REPORT_LIMIT,
  );

  if (!member) {
    return {
      characterCount: 0,
      latestUpdatedAt: null,
      member: null,
      page: normalizedPage,
      pageCount: 1,
      photoCount: 0,
      photos: [],
      reportCount: 0,
      reportsPerPage: normalizedReportsPerPage,
    };
  }

  const reportsCollection = await getFanletterNewsReportsCollection();
  const baseQuery = {
    locale: normalizedLocale,
    reporterReferralCode: member.referralCode,
    status: "published" as const,
  };
  const offset = (normalizedPage - 1) * normalizedReportsPerPage;
  const projection = {
    contentId: 1,
    contentMaturityRating: 1,
    createdAt: 1,
    creatorName: 1,
    creatorReferralCode: 1,
    reporterAvatarImageUrl: 1,
    reporterName: 1,
    reportId: 1,
    sourcePublishedAt: 1,
    sourceTitle: 1,
    teaserImages: 1,
    teaserImageUrls: 1,
    title: 1,
    updatedAt: 1,
  } satisfies Record<keyof FanletterNewsReporterPhotoCollectionReport, 1>;

  const [reports, reportCount, summaryReports] = await Promise.all([
    reportsCollection
      .find(baseQuery, { projection })
      .sort({ updatedAt: -1, createdAt: -1, sourcePublishedAt: -1 })
      .skip(offset)
      .limit(normalizedReportsPerPage)
      .toArray(),
    reportsCollection.countDocuments(baseQuery),
    reportsCollection
      .find(baseQuery, {
        projection: {
          createdAt: 1,
          creatorName: 1,
          creatorReferralCode: 1,
          teaserImages: 1,
          teaserImageUrls: 1,
          updatedAt: 1,
        },
      })
      .toArray(),
  ]);

  const characterKeys = new Set(
    summaryReports
      .map(
        (report) =>
          report.creatorReferralCode?.trim() || report.creatorName?.trim() || "",
      )
      .filter(Boolean),
  );
  const latestUpdatedAt =
    summaryReports.reduce<Date | null>((latest, report) => {
      const updatedAt = report.updatedAt ?? report.createdAt ?? null;

      if (!updatedAt) {
        return latest;
      }

      if (!latest || updatedAt.getTime() > latest.getTime()) {
        return updatedAt;
      }

      return latest;
    }, null) ?? null;

  return {
    characterCount: characterKeys.size,
    latestUpdatedAt,
    member,
    page: normalizedPage,
    pageCount: Math.max(1, Math.ceil(reportCount / normalizedReportsPerPage)),
    photoCount: summaryReports.reduce(
      (total, report) => total + countEditedCuts(report),
      0,
    ),
    photos: toPhotoCollectionItems(reports),
    reportCount,
    reportsPerPage: normalizedReportsPerPage,
  };
}
