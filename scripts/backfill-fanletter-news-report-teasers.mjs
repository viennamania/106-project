import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const REPORT_TEASER_IMAGE_LIMIT = 4;
const DEFAULT_BACKFILL_LIMIT = 500;
const MAX_BACKFILL_LIMIT = 5000;
const LEGACY_NSFW_VIDEO_URL_PATTERN = /(?:^|[\W_])nsfw\d*(?:[\W_]|$)/i;

const writeChanges = ["1", "true", "yes"].includes(
  (process.env.FANLETTER_NEWS_REPORT_TEASER_BACKFILL_WRITE ?? "")
    .trim()
    .toLowerCase(),
);
const targetContentIds = parseCsv(
  process.env.FANLETTER_NEWS_REPORT_TEASER_BACKFILL_CONTENT_IDS,
);
const targetReportIds = parseCsv(
  process.env.FANLETTER_NEWS_REPORT_TEASER_BACKFILL_REPORT_IDS,
);
const limit = normalizeLimit(
  process.env.FANLETTER_NEWS_REPORT_TEASER_BACKFILL_LIMIT,
);
const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();
const reportsCollectionName =
  process.env.MONGODB_FANLETTER_NEWS_REPORTS_COLLECTION?.trim() ??
  "fanletterNewsReports";
const postsCollectionName =
  process.env.MONGODB_CONTENT_POSTS_COLLECTION?.trim() ?? "contentPosts";

if (!uri) {
  throw new Error("MONGODB_URI is not configured.");
}

if (!dbName) {
  throw new Error("MONGODB_DB_NAME is not configured.");
}

function parseCsv(value) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function normalizeLimit(value) {
  const parsed = Number.parseInt(value?.trim() ?? "", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_BACKFILL_LIMIT;
  }

  return Math.min(parsed, MAX_BACKFILL_LIMIT);
}

function normalizeUrl(value) {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueUrls(urls) {
  return [
    ...new Set(
      urls
        .map((url) => normalizeUrl(url))
        .filter(Boolean),
    ),
  ];
}

function readFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isNsfwSource({ post, report }) {
  if (report.contentMaturityRating === "nsfw" || post.contentMaturityRating === "nsfw") {
    return true;
  }

  return (post.contentVideoUrls ?? []).some((url) =>
    LEGACY_NSFW_VIDEO_URL_PATTERN.test(url),
  );
}

function getFrameCandidateByUrl(post) {
  const candidateByUrl = new Map();

  for (const candidate of post.coverImageCandidates ?? []) {
    const url = normalizeUrl(candidate.url);

    if (!url || candidateByUrl.has(url)) {
      continue;
    }

    candidateByUrl.set(url, candidate);
  }

  return candidateByUrl;
}

function sortFrameCandidates(candidates) {
  return candidates
    .map((candidate, originalIndex) => ({ candidate, originalIndex }))
    .sort((left, right) => {
      const leftTimestamp = readFiniteNumber(left.candidate.timestampSec);
      const rightTimestamp = readFiniteNumber(right.candidate.timestampSec);

      if (leftTimestamp !== null && rightTimestamp !== null) {
        return (
          leftTimestamp - rightTimestamp ||
          left.originalIndex - right.originalIndex
        );
      }

      if (leftTimestamp !== null) {
        return -1;
      }

      if (rightTimestamp !== null) {
        return 1;
      }

      return left.originalIndex - right.originalIndex;
    })
    .map(({ candidate }) => candidate);
}

function getAllowedImageUrls(post) {
  return new Set(
    uniqueUrls([
      post.coverImageUrl,
      ...(post.contentImageUrls ?? []),
      ...(post.coverImageCandidates ?? []).map((candidate) => candidate.url),
    ]),
  );
}

function getBackfillSourceImageUrls(post) {
  const frameCandidateByUrl = getFrameCandidateByUrl(post);
  const contentFrameCandidates = uniqueUrls(post.contentImageUrls ?? []).map(
    (url) => ({
      timestampSec: frameCandidateByUrl.get(url)?.timestampSec ?? null,
      url,
    }),
  );
  const extraCoverCandidates = (post.coverImageCandidates ?? [])
    .map((candidate) => ({
      timestampSec: candidate.timestampSec ?? null,
      url: candidate.url,
    }))
    .filter((candidate) => normalizeUrl(candidate.url));
  const sortedFrames = sortFrameCandidates([
    ...contentFrameCandidates,
    ...extraCoverCandidates,
  ]).map((candidate) => candidate.url);

  return uniqueUrls([...sortedFrames, post.coverImageUrl]);
}

function getNextTeaserImageUrls({ post, report }) {
  const allowedImageUrls = getAllowedImageUrls(post);
  const currentTeaserImageUrls = uniqueUrls(report.teaserImageUrls ?? []).filter(
    (url) => allowedImageUrls.has(url),
  );
  const sourceImageUrls = getBackfillSourceImageUrls(post).filter((url) =>
    allowedImageUrls.has(url),
  );

  return uniqueUrls([
    ...currentTeaserImageUrls,
    ...sourceImageUrls,
    report.coverImageOriginalUrl,
    report.coverImageUrl,
  ]).slice(0, REPORT_TEASER_IMAGE_LIMIT);
}

function buildReportFilter() {
  return {
    status: "published",
    ...(targetContentIds.size > 0 ? { contentId: { $in: [...targetContentIds] } } : {}),
    ...(targetReportIds.size > 0 ? { reportId: { $in: [...targetReportIds] } } : {}),
  };
}

function createSummary() {
  return {
    dryRun: !writeChanges,
    failed: 0,
    limit,
    scanned: 0,
    skippedMissingContent: 0,
    skippedNoImages: 0,
    skippedNsfw: 0,
    unchanged: 0,
    updated: 0,
    wouldUpdate: 0,
  };
}

function pushItem(items, item) {
  if (items.length < 80) {
    items.push(item);
  }
}

const client = new MongoClient(uri);

try {
  await client.connect();

  const db = client.db(dbName);
  const reports = db.collection(reportsCollectionName);
  const posts = db.collection(postsCollectionName);
  const reportRows = await reports
    .find(buildReportFilter(), {
      projection: {
        _id: 0,
        contentId: 1,
        contentMaturityRating: 1,
        coverImageOriginalUrl: 1,
        coverImageUrl: 1,
        reportId: 1,
        teaserImageUrls: 1,
        title: 1,
      },
    })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(limit)
    .toArray();
  const contentIds = uniqueUrls(reportRows.map((report) => report.contentId));
  const postRows = await posts
    .find(
      { contentId: { $in: contentIds }, status: "published" },
      {
        projection: {
          _id: 0,
          contentId: 1,
          contentImageUrls: 1,
          contentMaturityRating: 1,
          contentVideoUrls: 1,
          coverImageCandidates: 1,
          coverImageUrl: 1,
        },
      },
    )
    .toArray();
  const postByContentId = new Map(
    postRows.map((post) => [post.contentId, post]),
  );
  const summary = createSummary();
  const items = [];

  summary.scanned = reportRows.length;

  for (const report of reportRows) {
    try {
      const post = postByContentId.get(report.contentId);

      if (!post) {
        summary.skippedMissingContent += 1;
        pushItem(items, {
          action: "skipped_missing_content",
          reportId: report.reportId,
          title: report.title,
        });
        continue;
      }

      if (isNsfwSource({ post, report })) {
        summary.skippedNsfw += 1;
        pushItem(items, {
          action: "skipped_nsfw",
          reportId: report.reportId,
          title: report.title,
        });
        continue;
      }

      const currentTeaserImageUrls = uniqueUrls(report.teaserImageUrls ?? []);
      const nextTeaserImageUrls = getNextTeaserImageUrls({ post, report });

      if (nextTeaserImageUrls.length === 0) {
        summary.skippedNoImages += 1;
        pushItem(items, {
          action: "skipped_no_images",
          reportId: report.reportId,
          title: report.title,
        });
        continue;
      }

      if (
        currentTeaserImageUrls.length === nextTeaserImageUrls.length &&
        currentTeaserImageUrls.every(
          (url, index) => url === nextTeaserImageUrls[index],
        )
      ) {
        summary.unchanged += 1;
        pushItem(items, {
          action: "unchanged",
          reportId: report.reportId,
          teaserImageCount: nextTeaserImageUrls.length,
          title: report.title,
        });
        continue;
      }

      if (!writeChanges) {
        summary.wouldUpdate += 1;
        pushItem(items, {
          action: "would_update",
          nextTeaserImageCount: nextTeaserImageUrls.length,
          previousTeaserImageCount: currentTeaserImageUrls.length,
          reportId: report.reportId,
          title: report.title,
        });
        continue;
      }

      await reports.updateOne(
        { reportId: report.reportId },
        {
          $set: {
            teaserImageUrls: nextTeaserImageUrls,
            updatedAt: new Date(),
          },
        },
      );
      summary.updated += 1;
      pushItem(items, {
        action: "updated",
        nextTeaserImageCount: nextTeaserImageUrls.length,
        previousTeaserImageCount: currentTeaserImageUrls.length,
        reportId: report.reportId,
        title: report.title,
      });
    } catch (error) {
      summary.failed += 1;
      pushItem(items, {
        action: "failed",
        error:
          error instanceof Error
            ? error.message
            : "Failed to backfill report teaser images.",
        reportId: report.reportId,
        title: report.title,
      });
    }
  }

  console.log("FanLetter news report teaser backfill summary:");
  console.log(JSON.stringify(summary, null, 2));

  if (items.length > 0) {
    console.log("Sample items:");
    console.log(JSON.stringify(items, null, 2));
  }

  if (!writeChanges) {
    console.log(
      "\nSet FANLETTER_NEWS_REPORT_TEASER_BACKFILL_WRITE=1 to apply this backfill.",
    );
  }
} finally {
  await client.close();
}
