import type {
  ContentVideoMetadata,
  ContentVideoMetadataSource,
} from "@/lib/content";

export type CapturedContentVideoMetadata = {
  durationSec: number | null;
  height: number | null;
  width: number | null;
};

type CreateContentVideoMetadataInput = CapturedContentVideoMetadata & {
  contentType?: string | null;
  pathname?: string | null;
  source: ContentVideoMetadataSource;
  url: string;
};

function normalizePositiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Number(value.toFixed(2))
    : null;
}

function normalizePositiveInteger(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}

function readVideoElementMetadata({
  crossOrigin,
  src,
}: {
  crossOrigin?: "" | "anonymous" | "use-credentials";
  src: string;
}) {
  return new Promise<CapturedContentVideoMetadata>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Video metadata can only be read in the browser."));
      return;
    }

    const video = document.createElement("video");

    if (crossOrigin !== undefined) {
      video.crossOrigin = crossOrigin;
    }

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("error", handleError);
      video.removeAttribute("src");
      video.load();
    };
    const handleLoadedMetadata = () => {
      const metadata: CapturedContentVideoMetadata = {
        durationSec: normalizePositiveNumber(video.duration),
        height: normalizePositiveInteger(video.videoHeight),
        width: normalizePositiveInteger(video.videoWidth),
      };

      cleanup();
      resolve(metadata);
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Could not read video metadata."));
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
    video.addEventListener("error", handleError, { once: true });
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = src;
    video.load();
  });
}

export async function readContentVideoFileMetadata(file: File) {
  if (typeof URL === "undefined") {
    throw new Error("Video metadata can only be read in the browser.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    return await readVideoElementMetadata({ src: objectUrl });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function readContentVideoUrlMetadata(videoUrl: string) {
  return readVideoElementMetadata({
    crossOrigin: "anonymous",
    src: videoUrl,
  });
}

export function createContentVideoMetadata({
  contentType = null,
  durationSec,
  height,
  pathname = null,
  source,
  url,
  width,
}: CreateContentVideoMetadataInput): ContentVideoMetadata | null {
  const normalizedUrl = url.trim();

  if (!normalizedUrl) {
    return null;
  }

  return {
    capturedAt: new Date().toISOString(),
    contentType: contentType?.trim() || null,
    durationSec: normalizePositiveNumber(durationSec),
    height: normalizePositiveInteger(height),
    pathname: pathname?.trim() || null,
    source,
    url: normalizedUrl,
    width: normalizePositiveInteger(width),
  };
}
