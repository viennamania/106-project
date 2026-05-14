const VIDEO_FRAME_COVER_MAX_WIDTH = 1280;
const VIDEO_FRAME_COVER_MIME_TYPE = "image/jpeg";
const VIDEO_FRAME_COVER_QUALITY = 0.84;
const VIDEO_FRAME_COVER_TIMEOUT_MS = 12000;

function sanitizeUploadBaseName(name: string) {
  const baseName = name.replace(/\.[^.]+$/u, "");
  const normalized = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 48);

  return normalized || "content-video";
}

function resolveVideoCoverCaptureTime(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0.6) {
    return 0;
  }

  return Math.min(
    Math.max(duration * 0.18, 0.6),
    Math.max(duration - 0.2, 0),
  );
}

function withTimeout<T>(promise: Promise<T>, message: string) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(message)),
      VIDEO_FRAME_COVER_TIMEOUT_MS,
    );
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

function waitForVideoEvent(
  video: HTMLVideoElement,
  eventName: keyof HTMLMediaElementEventMap,
) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(eventName, handleEvent);
      video.removeEventListener("error", handleError);
    };
    const handleEvent = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Failed to read the uploaded video frame."));
    };

    video.addEventListener(eventName, handleEvent, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

async function captureVideoCoverFrameFromSource({
  crossOrigin,
  fileName,
  src,
}: {
  crossOrigin?: "" | "anonymous" | "use-credentials";
  fileName: string;
  src: string;
}) {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error("Video frame capture is only available in the browser.");
  }

  const video = document.createElement("video");

  try {
    if (crossOrigin !== undefined) {
      video.crossOrigin = crossOrigin;
    }

    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = src;
    video.load();

    await withTimeout(
      waitForVideoEvent(video, "loadedmetadata"),
      "Timed out while reading the uploaded video metadata.",
    );

    const captureTime = resolveVideoCoverCaptureTime(video.duration);

    if (captureTime > 0) {
      video.currentTime = captureTime;
      await withTimeout(
        waitForVideoEvent(video, "seeked"),
        "Timed out while seeking the uploaded video frame.",
      );
    } else if (video.readyState < 2) {
      await withTimeout(
        waitForVideoEvent(video, "loadeddata"),
        "Timed out while loading the uploaded video frame.",
      );
    }

    if (!video.videoWidth || !video.videoHeight) {
      throw new Error("The uploaded video has no readable frame size.");
    }

    const scale = Math.min(
      1,
      VIDEO_FRAME_COVER_MAX_WIDTH / video.videoWidth,
    );
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not create a video frame canvas.");
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(new Error("Could not encode the video frame cover."));
            return;
          }

          resolve(result);
        },
        VIDEO_FRAME_COVER_MIME_TYPE,
        VIDEO_FRAME_COVER_QUALITY,
      );
    });

    return new File(
      [blob],
      `${sanitizeUploadBaseName(fileName)}-video-frame-cover.jpg`,
      { type: VIDEO_FRAME_COVER_MIME_TYPE },
    );
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

export async function captureVideoCoverFrame(file: File) {
  if (typeof URL === "undefined") {
    throw new Error("Video frame capture is only available in the browser.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    return await captureVideoCoverFrameFromSource({
      fileName: file.name,
      src: objectUrl,
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function captureVideoCoverFrameFromUrl(
  videoUrl: string,
  fileName: string,
) {
  if (!videoUrl.trim()) {
    throw new Error("Video URL is required.");
  }

  return captureVideoCoverFrameFromSource({
    crossOrigin: "anonymous",
    fileName,
    src: videoUrl,
  });
}
