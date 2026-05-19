"use client";

import { useCallback, useEffect, useRef } from "react";

export type FanletterVideoMetadata = {
  aspectRatio: number;
  height: number;
  width: number;
};

type FanletterAutoplayVideoProps = {
  ariaHidden?: boolean;
  className?: string;
  controls?: boolean;
  onMetadata?: (metadata: FanletterVideoMetadata) => void;
  poster?: string;
  src: string;
  title?: string;
};

function shouldAvoidAutoplay() {
  const connection = (
    navigator as Navigator & {
      connection?: {
        saveData?: boolean;
      };
    }
  ).connection;

  return (
    connection?.saveData === true ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function FanletterAutoplayVideo({
  ariaHidden = false,
  className,
  controls = false,
  onMetadata,
  poster,
  src,
  title,
}: FanletterAutoplayVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;

    if (!video?.videoWidth || !video.videoHeight) {
      return;
    }

    onMetadata?.({
      aspectRatio: video.videoWidth / video.videoHeight,
      height: video.videoHeight,
      width: video.videoWidth,
    });
  }, [onMetadata]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;

    const ensureSource = () => {
      if (video.getAttribute("src") === src) {
        return;
      }

      video.src = src;
      video.load();
    };
    const playVideo = () => {
      ensureSource();

      const playPromise = video.play();

      if (playPromise) {
        playPromise.catch(() => {
          // Browsers can still block autoplay in constrained environments.
        });
      }
    };
    const pauseVideo = () => {
      video.pause();
    };
    const unloadSource = () => {
      video.removeAttribute("src");
      video.load();
    };

    if (shouldAvoidAutoplay()) {
      if (controls) {
        ensureSource();
      }

      return () => {
        pauseVideo();
        unloadSource();
      };
    }

    if (typeof IntersectionObserver === "undefined") {
      const animationFrame = window.requestAnimationFrame(playVideo);
      return () => {
        window.cancelAnimationFrame(animationFrame);
        pauseVideo();
        unloadSource();
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          playVideo();
        } else {
          pauseVideo();
        }
      },
      {
        rootMargin: "80px 0px",
        threshold: 0.28,
      },
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
      pauseVideo();
      unloadSource();
    };
  }, [controls, src]);

  return (
    <video
      aria-hidden={ariaHidden ? "true" : undefined}
      autoPlay
      className={className}
      controls={controls}
      data-fanletter-autoplay-video="true"
      loop
      muted
      onLoadedMetadata={handleLoadedMetadata}
      playsInline
      poster={poster}
      preload="none"
      ref={videoRef}
      title={ariaHidden ? undefined : title}
    />
  );
}
