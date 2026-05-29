"use client";

import Image from "next/image";
import { PlayCircle } from "lucide-react";
import { type ReactNode, useCallback, useMemo, useState } from "react";

import {
  FanletterAutoplayVideo,
  type FanletterVideoMetadata,
} from "@/components/fanletter-autoplay-video";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import { cn } from "@/lib/utils";

function getVideoOrientation(metadata: FanletterVideoMetadata | null) {
  const aspectRatio = metadata?.aspectRatio ?? 9 / 16;

  if (aspectRatio > 1.12) {
    return "landscape";
  }

  if (aspectRatio < 0.88) {
    return "portrait";
  }

  return "square";
}

export function FanletterNewsLockedPreviewHero({
  children,
  posterImageUrl,
  previewBadge,
  previewMeta,
  previewVideoUrl,
  title,
}: {
  children?: ReactNode;
  posterImageUrl: string | null;
  previewBadge: string;
  previewMeta: string;
  previewVideoUrl: string;
  title: string;
}) {
  const [videoMetadata, setVideoMetadata] =
    useState<FanletterVideoMetadata | null>(null);
  const orientation = getVideoOrientation(videoMetadata);
  const frameStyle = useMemo(() => {
    if (!videoMetadata) {
      return undefined;
    }

    return {
      aspectRatio: `${videoMetadata.width} / ${videoMetadata.height}`,
    };
  }, [videoMetadata]);
  const handleMetadata = useCallback((metadata: FanletterVideoMetadata) => {
    setVideoMetadata(metadata);
  }, []);

  return (
    <div
      className={cn(
        "grid w-full overflow-hidden bg-black",
        orientation === "portrait"
          ? "lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.56fr)]"
          : "lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]",
      )}
    >
      <div
        className={cn(
          "relative w-full min-w-0 overflow-hidden bg-black",
          orientation === "landscape"
            ? "aspect-video lg:h-full lg:min-h-[28rem] lg:aspect-auto"
            : orientation === "square"
              ? "mx-auto aspect-square max-w-full sm:max-w-[min(100%,72svh,42rem)]"
              : "mx-auto aspect-[9/16] max-w-full sm:max-w-[min(100%,43.875svh,32rem)]",
        )}
        style={frameStyle}
      >
        {posterImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="absolute inset-0 scale-[1.08] object-cover opacity-45 blur-2xl brightness-[0.62] saturate-[1.05]"
            fill
            loading="eager"
            sizes="(max-width: 1024px) 100vw, 62vw"
            src={posterImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(posterImageUrl)}
          />
        ) : null}
        <FanletterAutoplayVideo
          className="absolute inset-0 h-full w-full object-contain brightness-[0.92] saturate-[1.04]"
          controls
          onMetadata={handleMetadata}
          poster={posterImageUrl ?? undefined}
          src={previewVideoUrl}
          title={title}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.22),rgba(0,0,0,0.04)_34%,rgba(0,0,0,0.42))]" />
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1.5 sm:left-4 sm:top-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-black/52 px-2.5 py-1 text-[0.68rem] font-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur">
            <PlayCircle className="size-3.5 text-[#44f26e]" />
            {previewBadge}
          </span>
          <span className="inline-flex items-center rounded-full border border-white/14 bg-black/42 px-2.5 py-1 text-[0.68rem] font-bold text-white/78 shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur">
            {previewMeta}
          </span>
        </div>
      </div>
      {children ? (
        <div className="relative min-h-[23rem] overflow-hidden border-t border-white/10 bg-[#07100b] sm:min-h-[24rem] lg:min-h-0 lg:border-l lg:border-t-0">
          {children}
        </div>
      ) : null}
    </div>
  );
}
