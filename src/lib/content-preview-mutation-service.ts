import "server-only";

import { getContentPostsCollection } from "@/lib/mongodb";

type ResolveMissingContentPreviewClipVideoUrlInput = {
  contentVideoUrls: string[];
  referralCode: string;
  title?: string | null;
};

type EnsureMissingContentPreviewClipVideoUrlInput = {
  contentId: string;
  initialDelayMs?: number;
};

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => normalizeString(item)).filter(Boolean)
    : [];
}

function hasPreviewClipVideoUrl(value: unknown) {
  return Boolean(normalizeString(value));
}

export async function resolveMissingContentPreviewClipVideoUrl({
  contentVideoUrls,
  referralCode,
  title,
}: ResolveMissingContentPreviewClipVideoUrlInput) {
  const sourceVideoUrl = contentVideoUrls[0];

  if (!sourceVideoUrl) {
    return null;
  }

  const { createContentVideoPreview } = await import(
    "@/lib/content-video-preview-service"
  );
  const previewVideo = await createContentVideoPreview({
    referralCode,
    sourceVideoUrl,
    title,
  });

  return previewVideo.url;
}

export async function ensureMissingContentPreviewClipVideoUrl({
  contentId,
  initialDelayMs = 0,
}: EnsureMissingContentPreviewClipVideoUrlInput) {
  const normalizedContentId = contentId.trim();

  if (!normalizedContentId) {
    return null;
  }

  if (initialDelayMs > 0) {
    await delay(initialDelayMs);
  }

  const collection = await getContentPostsCollection();
  const post = await collection.findOne(
    { contentId: normalizedContentId },
    {
      projection: {
        authorReferralCode: 1,
        contentId: 1,
        contentVideoUrls: 1,
        previewClipVideoUrl: 1,
        title: 1,
      },
    },
  );

  if (!post || hasPreviewClipVideoUrl(post.previewClipVideoUrl)) {
    return null;
  }

  const referralCode = normalizeString(post.authorReferralCode);
  const contentVideoUrls = normalizeStringArray(post.contentVideoUrls);

  if (!referralCode || contentVideoUrls.length === 0) {
    return null;
  }

  const previewClipVideoUrl = await resolveMissingContentPreviewClipVideoUrl({
    contentVideoUrls,
    referralCode,
    title: post.title,
  });

  if (!previewClipVideoUrl) {
    return null;
  }

  await collection.updateOne(
    {
      contentId: normalizedContentId,
      $or: [
        { previewClipVideoUrl: { $exists: false } },
        { previewClipVideoUrl: null },
        { previewClipVideoUrl: "" },
      ],
    },
    {
      $set: {
        previewClipVideoUrl,
        updatedAt: new Date(),
      },
    },
  );

  return previewClipVideoUrl;
}
