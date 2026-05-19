"use client";

import Image from "next/image";
import { Clapperboard } from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  type SyntheticEvent,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  FanletterAutoplayVideo,
  type FanletterVideoMetadata,
} from "@/components/fanletter-autoplay-video";
import type { FanletterPublicContentItem } from "@/lib/fanletter-content-service";
import { cn } from "@/lib/utils";

type FanletterResponsiveMediaFrameProps = {
  alt: string;
  blurred?: boolean;
  children?: ReactNode;
  className?: string;
  eager?: boolean;
  imageUrl: string | null;
  mediaType: FanletterPublicContentItem["mediaType"];
  title: string;
  videoUrl: string | null;
};

type ResponsiveVideoFrameStyle = CSSProperties & {
  "--fanletter-video-max-width"?: string;
};

type ResponsiveMediaMetadata = {
  aspectRatio: number;
  height: number;
  width: number;
};

function getMediaOrientation(aspectRatio: number | null) {
  if (!aspectRatio) {
    return "portrait";
  }

  if (aspectRatio > 1.12) {
    return "landscape";
  }

  if (aspectRatio < 0.88) {
    return "portrait";
  }

  return "square";
}

export function FanletterResponsiveMediaFrame({
  alt,
  blurred = false,
  children,
  className,
  eager = false,
  imageUrl,
  mediaType,
  title,
  videoUrl,
}: FanletterResponsiveMediaFrameProps) {
  const [videoMetadataState, setVideoMetadataState] = useState<{
    metadata: FanletterVideoMetadata;
    src: string;
  } | null>(null);
  const [imageMetadataState, setImageMetadataState] = useState<{
    metadata: ResponsiveMediaMetadata;
    src: string;
  } | null>(null);

  const handleMetadata = useCallback((metadata: FanletterVideoMetadata) => {
    if (!videoUrl) {
      return;
    }

    setVideoMetadataState({ metadata, src: videoUrl });
  }, [videoUrl]);
  const handleImageLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      if (!imageUrl) {
        return;
      }

      const image = event.currentTarget;

      if (!image.naturalWidth || !image.naturalHeight) {
        return;
      }

      setImageMetadataState({
        metadata: {
          aspectRatio: image.naturalWidth / image.naturalHeight,
          height: image.naturalHeight,
          width: image.naturalWidth,
        },
        src: imageUrl,
      });
    },
    [imageUrl],
  );

  const videoMetadata =
    videoMetadataState?.src === videoUrl ? videoMetadataState.metadata : null;
  const imageMetadata =
    imageMetadataState?.src === imageUrl ? imageMetadataState.metadata : null;
  const shouldUseImageMetadata = !videoUrl && mediaType !== "video";
  const activeMetadata = videoUrl
    ? videoMetadata
    : shouldUseImageMetadata
      ? imageMetadata
      : null;
  const aspectRatio = activeMetadata?.aspectRatio ?? null;
  const orientation = getMediaOrientation(aspectRatio);
  const frameStyle = useMemo<ResponsiveVideoFrameStyle | undefined>(() => {
    if (!activeMetadata) {
      return undefined;
    }

    const nextStyle: ResponsiveVideoFrameStyle = {
      aspectRatio: `${activeMetadata.width} / ${activeMetadata.height}`,
    };

    if (orientation === "portrait") {
      const portraitWidthByViewport = ((aspectRatio ?? 9 / 16) * 72).toFixed(3);
      nextStyle["--fanletter-video-max-width"] =
        `min(100%, ${portraitWidthByViewport}svh, 32rem)`;
    } else if (orientation === "square") {
      nextStyle["--fanletter-video-max-width"] = "min(100%, 72svh, 42rem)";
    }

    return nextStyle;
  }, [activeMetadata, aspectRatio, orientation]);

  if (videoUrl) {
    return (
      <div
        className={cn(
          "relative mx-auto w-full overflow-hidden bg-black transition-[max-width] duration-300",
          orientation === "landscape"
            ? "aspect-video max-w-full"
            : orientation === "square"
              ? "aspect-square max-w-full sm:max-w-[var(--fanletter-video-max-width,min(100%,72svh,42rem))]"
              : "aspect-[9/16] max-w-full sm:max-w-[var(--fanletter-video-max-width,min(100%,40.5svh,32rem))]",
          blurred && "bg-[#050806]",
          className,
        )}
        style={frameStyle}
      >
        <FanletterAutoplayVideo
          className={
            blurred
              ? "absolute inset-0 h-full w-full scale-[1.06] object-cover blur-lg brightness-[0.72] saturate-[0.88]"
              : "absolute inset-0 h-full w-full object-contain"
          }
          controls
          onMetadata={handleMetadata}
          poster={imageUrl ?? undefined}
          src={videoUrl}
          title={title}
        />
        {blurred ? (
          <div className="pointer-events-none absolute inset-0 bg-black/10" />
        ) : null}
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-black transition-[max-width] duration-300",
        orientation === "landscape"
          ? "aspect-video max-w-full"
          : orientation === "square"
            ? "aspect-square max-w-full sm:max-w-[var(--fanletter-video-max-width,min(100%,72svh,42rem))]"
            : mediaType === "video"
              ? "aspect-[9/16] max-w-full sm:max-w-[var(--fanletter-video-max-width,min(100%,40.5svh,32rem))]"
              : "aspect-[4/5]",
        className,
      )}
      style={frameStyle}
    >
      {imageUrl ? (
        <>
          <Image
            alt={alt}
            className={
              blurred
                ? "scale-[1.06] object-cover blur-lg brightness-[0.72] saturate-[0.88]"
                : "object-cover"
            }
            fill
            loading={eager ? "eager" : undefined}
            onLoad={handleImageLoad}
            sizes="(max-width: 768px) 100vw, 50vw"
            src={imageUrl}
          />
          {blurred ? (
            <div className="pointer-events-none absolute inset-0 bg-black/10" />
          ) : null}
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(145deg,#07100b,#101820_54%,#1b2b20)] text-white/74">
          <Clapperboard className="size-14 text-[#44f26e]" />
          <span className="text-xs font-semibold uppercase tracking-[0.22em]">
            {mediaType}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
