const VIDEO_FRAME_COVER_MAX_WIDTH = 1280;
const VIDEO_FRAME_COVER_MIME_TYPE = "image/jpeg";
const VIDEO_FRAME_COVER_QUALITY = 0.84;
const VIDEO_FRAME_COVER_TIMEOUT_MS = 12000;
const VIDEO_FRAME_COVER_DEFAULT_COUNT = 6;
const VIDEO_FRAME_COVER_DENSE_FRACTIONS = [
  0.06,
  0.12,
  0.18,
  0.25,
  0.33,
  0.42,
  0.52,
  0.62,
  0.72,
  0.82,
  0.9,
  0.96,
] as const;
const VIDEO_FRAME_COVER_DEFAULT_FRACTIONS = [
  0.12,
  0.28,
  0.46,
  0.64,
  0.78,
  0.9,
] as const;

type VideoFrameCoverCaptureOptions = {
  avoidThresholdSec?: number;
  count?: number;
  existingTimestampSecs?: number[];
  selectionMode?: "balanced" | "fill_gaps";
};

export type CapturedVideoCoverFrame = {
  file: File;
  height: number;
  timestampSec: number;
  width: number;
};

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

function normalizeVideoFrameCount(count: number | undefined, maxCount = 6) {
  const numericCount =
    typeof count === "number" && Number.isFinite(count)
      ? count
      : VIDEO_FRAME_COVER_DEFAULT_COUNT;
  const targetCount = Math.max(1, Math.min(Math.round(numericCount), maxCount));

  return targetCount;
}

function getSafeVideoFrameTimeRange(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0.6) {
    return { latestSafeTime: 0, startTime: 0 };
  }

  return {
    latestSafeTime: Math.max(duration - 0.2, 0),
    startTime: Math.min(0.6, Math.max(duration * 0.06, 0)),
  };
}

function normalizeVideoFrameTime(time: number) {
  return Number(time.toFixed(2));
}

function dedupeVideoFrameTimes(times: number[]) {
  const seen = new Set<string>();
  const result: number[] = [];

  for (const time of times) {
    const normalized = normalizeVideoFrameTime(time);
    const key = normalized.toFixed(2);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function getVideoFrameAvoidThresholdSec({
  duration,
  explicitThreshold,
}: {
  duration: number;
  explicitThreshold?: number;
}) {
  if (explicitThreshold !== undefined && Number.isFinite(explicitThreshold)) {
    return Math.max(0, explicitThreshold);
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  const durationBasedThreshold = Math.min(Math.max(duration * 0.055, 1.5), 6);

  return Math.min(durationBasedThreshold, Math.max(duration / 8, 0.75));
}

function getNearestVideoFrameDistance(time: number, existingTimes: number[]) {
  if (existingTimes.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.min(
    ...existingTimes.map((existingTime) => Math.abs(existingTime - time)),
  );
}

function getSafeExistingVideoFrameTimes(duration: number, timestamps: number[]) {
  const { latestSafeTime, startTime } = getSafeVideoFrameTimeRange(duration);

  return dedupeVideoFrameTimes(
    timestamps.filter(
      (timestamp) =>
        Number.isFinite(timestamp) &&
        timestamp >= startTime &&
        timestamp <= latestSafeTime,
    ),
  ).sort((left, right) => left - right);
}

function getDefaultVideoFrameCaptureTimes(duration: number, count: number) {
  const targetCount = normalizeVideoFrameCount(count);

  if (!Number.isFinite(duration) || duration <= 0.6) {
    return [0];
  }

  if (targetCount === 1) {
    return [resolveVideoCoverCaptureTime(duration)];
  }

  const { latestSafeTime, startTime } = getSafeVideoFrameTimeRange(duration);
  const times = VIDEO_FRAME_COVER_DEFAULT_FRACTIONS.slice(0, targetCount).map(
    (fraction) => Math.min(Math.max(duration * fraction, startTime), latestSafeTime),
  );

  return dedupeVideoFrameTimes(times).slice(0, targetCount);
}

function getGapFillVideoFrameCaptureTimes({
  avoidThresholdSec,
  count,
  duration,
  existingTimestampSecs,
}: {
  avoidThresholdSec?: number;
  count: number;
  duration: number;
  existingTimestampSecs: number[];
}) {
  const targetCount = normalizeVideoFrameCount(count, 18);

  if (!Number.isFinite(duration) || duration <= 0.6) {
    return [0];
  }

  const { latestSafeTime, startTime } = getSafeVideoFrameTimeRange(duration);
  const existingTimes = getSafeExistingVideoFrameTimes(
    duration,
    existingTimestampSecs,
  );
  const threshold = getVideoFrameAvoidThresholdSec({
    duration,
    explicitThreshold: avoidThresholdSec,
  });
  const candidateTimes: number[] = [];

  const sortedBoundaries = dedupeVideoFrameTimes([
    startTime,
    ...existingTimes,
    latestSafeTime,
  ]).sort((left, right) => left - right);
  const gaps = sortedBoundaries
    .slice(1)
    .map((end, index) => {
      const start = sortedBoundaries[index] ?? startTime;

      return {
        end,
        length: end - start,
        start,
      };
    })
    .filter((gap) => gap.length > 0)
    .sort((left, right) => right.length - left.length);

  for (const gap of gaps) {
    candidateTimes.push(
      gap.start + gap.length / 2,
      gap.start + gap.length / 3,
      gap.start + (gap.length * 2) / 3,
    );
  }

  candidateTimes.push(
    ...VIDEO_FRAME_COVER_DENSE_FRACTIONS.map((fraction) =>
      Math.min(Math.max(duration * fraction, startTime), latestSafeTime),
    ),
  );

  const selectedTimes: number[] = [];
  const normalizedCandidates = dedupeVideoFrameTimes(candidateTimes)
    .filter(
      (time) =>
        time >= startTime &&
        time <= latestSafeTime &&
        getNearestVideoFrameDistance(time, existingTimes) >= threshold,
    )
    .sort((left, right) => {
      const leftDistance = getNearestVideoFrameDistance(left, existingTimes);
      const rightDistance = getNearestVideoFrameDistance(right, existingTimes);

      return rightDistance - leftDistance || left - right;
    });

  for (const candidate of normalizedCandidates) {
    if (
      selectedTimes.every(
        (selectedTime) => Math.abs(selectedTime - candidate) >= threshold * 0.75,
      )
    ) {
      selectedTimes.push(candidate);
    }

    if (selectedTimes.length >= targetCount) {
      break;
    }
  }

  if (selectedTimes.length < targetCount) {
    for (const candidate of dedupeVideoFrameTimes(candidateTimes).sort(
      (left, right) => left - right,
    )) {
      if (!selectedTimes.includes(candidate)) {
        selectedTimes.push(candidate);
      }

      if (selectedTimes.length >= targetCount) {
        break;
      }
    }
  }

  return selectedTimes
    .slice(0, targetCount)
    .sort((left, right) => left - right);
}

function resolveVideoCoverCaptureTimes(
  duration: number,
  options: VideoFrameCoverCaptureOptions = {},
) {
  const targetCount = normalizeVideoFrameCount(options.count, 18);
  const existingTimestampSecs = options.existingTimestampSecs ?? [];

  if (
    options.selectionMode !== "fill_gaps" &&
    existingTimestampSecs.length === 0
  ) {
    return getDefaultVideoFrameCaptureTimes(duration, targetCount);
  }

  return getGapFillVideoFrameCaptureTimes({
    avoidThresholdSec: options.avoidThresholdSec,
    count: targetCount,
    duration,
    existingTimestampSecs,
  });
}

function getCurrentVideoFrameQuality(video: HTMLVideoElement) {
  const sampleWidth = 48;
  const sampleHeight = 48;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return { acceptable: true, score: 1 };
  }

  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  try {
    context.drawImage(video, 0, 0, sampleWidth, sampleHeight);
  } catch {
    return { acceptable: true, score: 1 };
  }

  let data: Uint8ClampedArray;

  try {
    data = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
  } catch {
    return { acceptable: true, score: 1 };
  }

  let luminanceSum = 0;
  let luminanceSquares = 0;
  let edgeSum = 0;
  let previousLuminance: number | null = null;
  const luminanceValues: number[] = [];

  for (let index = 0; index < data.length; index += 4) {
    const luminance =
      data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;

    luminanceValues.push(luminance);
    luminanceSum += luminance;
    luminanceSquares += luminance * luminance;

    if (previousLuminance !== null) {
      edgeSum += Math.abs(luminance - previousLuminance);
    }

    previousLuminance = luminance;
  }

  const pixelCount = luminanceValues.length;
  const average = luminanceSum / pixelCount;
  const variance = luminanceSquares / pixelCount - average * average;
  const contrast = Math.sqrt(Math.max(variance, 0));
  const edgeScore = edgeSum / Math.max(pixelCount - 1, 1);
  const acceptable =
    average >= 10 &&
    average <= 245 &&
    (contrast >= 6 || edgeScore >= 2.5);

  return {
    acceptable,
    score: contrast + edgeScore,
  };
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

async function encodeCurrentVideoFrame({
  fileName,
  frameIndex,
  timestampSec,
  video,
}: {
  fileName: string;
  frameIndex: number;
  timestampSec: number;
  video: HTMLVideoElement;
}): Promise<CapturedVideoCoverFrame> {
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error("The uploaded video has no readable frame size.");
  }

  const scale = Math.min(1, VIDEO_FRAME_COVER_MAX_WIDTH / video.videoWidth);
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

  const indexSuffix = String(frameIndex + 1).padStart(2, "0");

  return {
    file: new File(
      [blob],
      `${sanitizeUploadBaseName(fileName)}-video-frame-cover-${indexSuffix}.jpg`,
      { type: VIDEO_FRAME_COVER_MIME_TYPE },
    ),
    height,
    timestampSec,
    width,
  };
}

async function captureVideoCoverFrameFromSource({
  crossOrigin,
  fileName,
  options = {},
  src,
}: {
  crossOrigin?: "" | "anonymous" | "use-credentials";
  fileName: string;
  options?: VideoFrameCoverCaptureOptions;
  src: string;
}): Promise<CapturedVideoCoverFrame[]> {
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

    const targetCount = normalizeVideoFrameCount(options.count);
    const captureTimes = resolveVideoCoverCaptureTimes(video.duration, {
      ...options,
      count: Math.min(targetCount * 3, 18),
    });
    const frames: CapturedVideoCoverFrame[] = [];
    const fallbackFrames: CapturedVideoCoverFrame[] = [];

    for (const [frameIndex, captureTime] of captureTimes.entries()) {
      if (captureTime > 0 && Math.abs(video.currentTime - captureTime) > 0.05) {
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

      const quality = getCurrentVideoFrameQuality(video);
      const frame = await encodeCurrentVideoFrame({
        fileName,
        frameIndex,
        timestampSec: captureTime,
        video,
      });

      if (quality.acceptable) {
        frames.push(frame);
      } else {
        fallbackFrames.push(frame);
      }

      if (frames.length >= targetCount) {
        break;
      }
    }

    return [...frames, ...fallbackFrames].slice(0, targetCount);
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

export async function captureVideoCoverFrames(
  file: File,
  options: VideoFrameCoverCaptureOptions = {},
) {
  if (typeof URL === "undefined") {
    throw new Error("Video frame capture is only available in the browser.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    return await captureVideoCoverFrameFromSource({
      fileName: file.name,
      options: {
        ...options,
        count: options.count ?? VIDEO_FRAME_COVER_DEFAULT_COUNT,
      },
      src: objectUrl,
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function captureVideoCoverFrame(file: File) {
  const frames = await captureVideoCoverFrames(file, { count: 1 });
  const frame = frames[0];

  if (!frame) {
    throw new Error("Failed to read the uploaded video frame.");
  }

  return frame.file;
}

export async function captureVideoCoverFramesFromUrl(
  videoUrl: string,
  fileName: string,
  options: VideoFrameCoverCaptureOptions = {},
) {
  if (!videoUrl.trim()) {
    throw new Error("Video URL is required.");
  }

  return captureVideoCoverFrameFromSource({
    crossOrigin: "anonymous",
    fileName,
    options: {
      ...options,
      count: options.count ?? VIDEO_FRAME_COVER_DEFAULT_COUNT,
    },
    src: videoUrl,
  });
}

export async function captureVideoCoverFrameFromUrl(
  videoUrl: string,
  fileName: string,
) {
  if (!videoUrl.trim()) {
    throw new Error("Video URL is required.");
  }

  const frames = await captureVideoCoverFramesFromUrl(videoUrl, fileName, {
    count: 1,
  });
  const frame = frames[0];

  if (!frame) {
    throw new Error("Failed to read the uploaded video frame.");
  }

  return frame.file;
}
