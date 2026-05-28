import "server-only";

type ResolveMissingContentPreviewClipVideoUrlInput = {
  contentVideoUrls: string[];
  referralCode: string;
  title?: string | null;
};

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
