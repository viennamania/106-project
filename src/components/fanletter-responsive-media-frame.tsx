"use client";

import Image from "next/image";
import { Clapperboard, LockKeyhole, PlayCircle, ShieldCheck } from "lucide-react";
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
import { FanletterNsfwVideoPinGate } from "@/components/fanletter-nsfw-video-pin-gate";
import { useMemberSession } from "@/components/member-session-provider";
import type { FanletterPublicContentItem } from "@/lib/fanletter-content-service";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { clearWalletUnlockedForSession } from "@/lib/wallet-unlock-session";

type FanletterResponsiveMediaFrameProps = {
  alt: string;
  blurred?: boolean;
  children?: ReactNode;
  className?: string;
  deferVideoUntilInteraction?: boolean;
  deferredVideoCtaPlacement?: "bottom" | "center";
  eager?: boolean;
  fitWithinViewport?: boolean;
  fitWithinViewportHeightRatio?: number;
  imageUrl: string | null;
  mediaType: FanletterPublicContentItem["mediaType"];
  nsfwPinGate?: {
    connectHref?: string | null;
    enabled: boolean;
    locale: Locale;
    managePinHref: string;
    teaserBlurred?: boolean;
  };
  playButtonLabel?: string;
  previewVideoUrl?: string | null;
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

function getMediaFrameSizeClass(
  orientation: ReturnType<typeof getMediaOrientation>,
  fitWithinViewport: boolean,
) {
  if (orientation === "landscape") {
    return "aspect-video max-w-full";
  }

  if (orientation === "square") {
    return fitWithinViewport
      ? "aspect-square max-w-[var(--fanletter-video-max-width,min(100%,72svh,42rem))]"
      : "aspect-square max-w-full sm:max-w-[var(--fanletter-video-max-width,min(100%,72svh,42rem))]";
  }

  return fitWithinViewport
    ? "aspect-[9/16] max-w-[var(--fanletter-video-max-width,min(100%,40.5svh,32rem))]"
    : "aspect-[9/16] max-w-full sm:max-w-[var(--fanletter-video-max-width,min(100%,40.5svh,32rem))]";
}

function getNsfwPinRelockCopy(locale: Locale) {
  return locale === "ko"
    ? {
        locked: "다시 잠그기",
        unlocked: "PIN 해제됨",
      }
    : {
        locked: "Lock again",
        unlocked: "PIN unlocked",
      };
}

export function FanletterResponsiveMediaFrame({
  alt,
  blurred = false,
  children,
  className,
  deferVideoUntilInteraction = false,
  deferredVideoCtaPlacement = "bottom",
  eager = false,
  fitWithinViewport = false,
  fitWithinViewportHeightRatio = 0.72,
  imageUrl,
  mediaType,
  nsfwPinGate,
  playButtonLabel,
  previewVideoUrl,
  title,
  videoUrl,
}: FanletterResponsiveMediaFrameProps) {
  const [deferredVideoActivatedUrl, setDeferredVideoActivatedUrl] =
    useState<string | null>(null);
  const [nsfwPinUnlockedVideoUrl, setNsfwPinUnlockedVideoUrl] =
    useState<string | null>(null);
  const [videoMetadataState, setVideoMetadataState] = useState<{
    metadata: FanletterVideoMetadata;
    src: string;
  } | null>(null);
  const [imageMetadataState, setImageMetadataState] = useState<{
    metadata: ResponsiveMediaMetadata;
    src: string;
  } | null>(null);
  const { accountAddress, email } = useMemberSession();

  const requiresNsfwPin = Boolean(videoUrl && nsfwPinGate?.enabled);
  const isNsfwPinUnlocked =
    !requiresNsfwPin || nsfwPinUnlockedVideoUrl === videoUrl;
  const playableVideoUrl = isNsfwPinUnlocked ? videoUrl : null;
  const shouldDeferVideoLoad =
    deferVideoUntilInteraction &&
    Boolean(playableVideoUrl) &&
    deferredVideoActivatedUrl !== playableVideoUrl;
  const shouldShowLockedPinGate = requiresNsfwPin && !isNsfwPinUnlocked;
  const shouldBlurLockedPinTeaser =
    shouldShowLockedPinGate && nsfwPinGate?.teaserBlurred;
  const shouldUseVideoPosterTreatment = mediaType === "video" && Boolean(imageUrl);
  const nsfwPinRelockCopy = nsfwPinGate
    ? getNsfwPinRelockCopy(nsfwPinGate.locale)
    : null;

  const handleNsfwPinRelock = useCallback(() => {
    clearWalletUnlockedForSession({
      email,
      walletAddress: accountAddress,
    });
    setNsfwPinUnlockedVideoUrl(null);
  }, [accountAddress, email]);

  const effectivePreviewVideoUrl =
    shouldDeferVideoLoad && previewVideoUrl && previewVideoUrl !== playableVideoUrl
      ? previewVideoUrl
      : null;
  const activeVideoMetadataSrc =
    effectivePreviewVideoUrl ?? (shouldDeferVideoLoad ? null : playableVideoUrl);
  const normalizedViewportHeightRatio = Math.min(
    1,
    Math.max(0.5, fitWithinViewportHeightRatio),
  );

  const handleMetadata = useCallback((metadata: FanletterVideoMetadata) => {
    if (!activeVideoMetadataSrc) {
      return;
    }

    setVideoMetadataState({ metadata, src: activeVideoMetadataSrc });
  }, [activeVideoMetadataSrc]);
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
    videoMetadataState?.src === activeVideoMetadataSrc
      ? videoMetadataState.metadata
      : null;
  const imageMetadata =
    imageMetadataState?.src === imageUrl ? imageMetadataState.metadata : null;
  const shouldUseImageMetadata = !activeVideoMetadataSrc && Boolean(imageUrl);
  const activeMetadata = activeVideoMetadataSrc
    ? videoMetadata
    : shouldUseImageMetadata
      ? imageMetadata
      : null;
  const aspectRatio = activeMetadata?.aspectRatio ?? null;
  const orientation = getMediaOrientation(aspectRatio);
  const frameStyle = useMemo<ResponsiveVideoFrameStyle | undefined>(() => {
    if (!activeMetadata) {
      if (!fitWithinViewport) {
        return undefined;
      }

      return {
        "--fanletter-video-max-width":
          `min(100%, calc(var(--fanletter-cut-feed-vh, 100svh) * ${(9 / 16 * normalizedViewportHeightRatio).toFixed(4)}), 32rem)`,
      };
    }

    const nextStyle: ResponsiveVideoFrameStyle = {
      aspectRatio: `${activeMetadata.width} / ${activeMetadata.height}`,
    };

    if (!fitWithinViewport) {
      return nextStyle;
    }

    if (orientation === "portrait") {
      const portraitWidthByViewport = (
        (aspectRatio ?? 9 / 16) * normalizedViewportHeightRatio
      ).toFixed(4);
      nextStyle["--fanletter-video-max-width"] =
        `min(100%, calc(var(--fanletter-cut-feed-vh, 100svh) * ${portraitWidthByViewport}), 32rem)`;
    } else if (orientation === "square") {
      nextStyle["--fanletter-video-max-width"] =
        `min(100%, calc(var(--fanletter-cut-feed-vh, 100svh) * ${normalizedViewportHeightRatio.toFixed(4)}), 42rem)`;
    }

    return nextStyle;
  }, [
    activeMetadata,
    aspectRatio,
    fitWithinViewport,
    normalizedViewportHeightRatio,
    orientation,
  ]);

  if (playableVideoUrl && shouldDeferVideoLoad) {
    return (
      <div
        className={cn(
          "relative mx-auto w-full overflow-hidden bg-black transition-[max-width] duration-300",
          getMediaFrameSizeClass(orientation, fitWithinViewport),
          blurred && "bg-[#050806]",
          className,
        )}
        style={frameStyle}
      >
        {effectivePreviewVideoUrl ? (
          <FanletterAutoplayVideo
            ariaHidden
            className={
              blurred
                ? "absolute inset-0 h-full w-full scale-[1.06] object-cover blur-lg brightness-[0.72] saturate-[0.88]"
                : "absolute inset-0 h-full w-full object-contain"
            }
            onMetadata={handleMetadata}
            poster={imageUrl ?? undefined}
            src={effectivePreviewVideoUrl}
            title={title}
          />
        ) : imageUrl ? (
          <Image
            alt={alt}
            className={cn(
              "object-contain p-1.5 sm:p-2",
              blurred
                ? "scale-[1.06] blur-lg brightness-[0.72] saturate-[0.88]"
                : null,
            )}
            fill
            loading={eager ? "eager" : undefined}
            onLoad={handleImageLoad}
            sizes="(max-width: 768px) 100vw, 50vw"
            src={imageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(imageUrl)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(145deg,#07100b,#101820_54%,#1b2b20)] text-white/74">
            <Clapperboard className="size-14 text-[#44f26e]" />
          </div>
        )}
        <div
          className={cn(
            "pointer-events-none absolute inset-0",
            blurred
              ? "bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.16)_42%,rgba(0,0,0,0.72))]"
              : "bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.04)_48%,rgba(0,0,0,0.28))]",
          )}
        />
        {children}
        <div
          className={cn(
            "absolute z-20 flex justify-center px-4",
            deferredVideoCtaPlacement === "center"
              ? "inset-0 items-center py-4"
              : "inset-x-0 bottom-0 items-start pb-[calc(env(safe-area-inset-bottom)+5rem)] pt-4 sm:p-5",
          )}
        >
          <button
            className="inline-flex min-h-12 max-w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-black text-black shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition hover:bg-[#69ff8c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#44f26e]"
            onClick={() => setDeferredVideoActivatedUrl(playableVideoUrl)}
            type="button"
          >
            <PlayCircle className="size-4 shrink-0" />
            <span className="min-w-0 truncate">{playButtonLabel ?? title}</span>
          </button>
        </div>
      </div>
    );
  }

  if (playableVideoUrl) {
    return (
      <div
        className={cn(
          "relative mx-auto w-full overflow-hidden bg-black transition-[max-width] duration-300",
          getMediaFrameSizeClass(orientation, fitWithinViewport),
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
          src={playableVideoUrl}
          title={title}
        />
        {blurred ? (
          <div className="pointer-events-none absolute inset-0 bg-black/10" />
        ) : null}
        {requiresNsfwPin && nsfwPinRelockCopy ? (
          <div className="absolute right-3 top-14 z-20 flex justify-end sm:right-4 sm:top-4">
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/18 bg-black/72 px-3 py-2 text-xs font-black !text-white shadow-[0_10px_26px_rgba(0,0,0,0.28)] backdrop-blur transition hover:border-[#44f26e]/44 hover:bg-black/84 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#44f26e]"
              onClick={handleNsfwPinRelock}
              type="button"
            >
              <ShieldCheck className="size-3.5 text-[#44f26e]" />
              <span className="hidden sm:inline">{nsfwPinRelockCopy.unlocked}</span>
              <LockKeyhole className="size-3.5" />
              <span>{nsfwPinRelockCopy.locked}</span>
            </button>
          </div>
        ) : null}
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative mx-auto w-full overflow-hidden bg-black transition-[max-width] duration-300",
        shouldShowLockedPinGate
          ? "min-h-[31rem] max-w-full sm:min-h-[30rem]"
          : orientation === "landscape"
            ? "aspect-video max-w-full"
            : orientation === "square"
              ? "aspect-square max-w-full sm:max-w-[var(--fanletter-video-max-width,min(100%,72svh,42rem))]"
              : mediaType === "video"
                ? "aspect-[9/16] max-w-full sm:max-w-[var(--fanletter-video-max-width,min(100%,40.5svh,32rem))]"
                : "aspect-[4/5]",
        className,
      )}
      style={shouldShowLockedPinGate ? undefined : frameStyle}
    >
      {imageUrl ? (
        <>
          {shouldUseVideoPosterTreatment ? (
            <Image
              alt=""
              aria-hidden="true"
              className={cn(
                "scale-[1.12] object-cover opacity-70 blur-2xl brightness-[0.64] saturate-[1.06]",
                blurred
                  ? "brightness-[0.54] saturate-[0.82]"
                  : shouldBlurLockedPinTeaser
                    ? "brightness-[0.58] saturate-[0.86]"
                    : null,
              )}
              fill
              loading={eager ? "eager" : undefined}
              sizes="(max-width: 768px) 100vw, 50vw"
              src={imageUrl}
              unoptimized={shouldBypassFanletterImageOptimization(imageUrl)}
            />
          ) : null}
          <Image
            alt={alt}
            className={cn(
              shouldUseVideoPosterTreatment
                ? "object-contain p-1.5 sm:p-2"
                : "object-cover",
              blurred
                ? "scale-[1.06] blur-lg brightness-[0.72] saturate-[0.88]"
                : shouldBlurLockedPinTeaser
                  ? "scale-[1.03] blur-sm brightness-[0.82] saturate-[0.9]"
                  : null,
            )}
            fill
            loading={eager ? "eager" : undefined}
            onLoad={handleImageLoad}
            sizes="(max-width: 768px) 100vw, 50vw"
            src={imageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(imageUrl)}
          />
          {shouldUseVideoPosterTreatment ? (
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_26%,transparent,rgba(0,0,0,0.3)_58%,rgba(0,0,0,0.58))]" />
          ) : null}
          {blurred || shouldBlurLockedPinTeaser ? (
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
      {shouldShowLockedPinGate && nsfwPinGate ? (
        <div className="absolute inset-0 z-10 flex items-start justify-center overflow-y-auto bg-black/58 p-2 backdrop-blur-[2px] [scrollbar-width:none] sm:items-center sm:p-5 [&::-webkit-scrollbar]:hidden">
          <FanletterNsfwVideoPinGate
            connectHref={nsfwPinGate.connectHref}
            locale={nsfwPinGate.locale}
            managePinHref={nsfwPinGate.managePinHref}
            onUnlocked={() => setNsfwPinUnlockedVideoUrl(videoUrl)}
            title={title}
          />
        </div>
      ) : (
        children
      )}
    </div>
  );
}
