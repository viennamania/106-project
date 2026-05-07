"use client";

import { useEffect, useRef } from "react";

type FanletterAutoplayVideoProps = {
  ariaHidden?: boolean;
  className?: string;
  controls?: boolean;
  poster?: string;
  src: string;
  title?: string;
};

export function FanletterAutoplayVideo({
  ariaHidden = false,
  className,
  controls = false,
  poster,
  src,
  title,
}: FanletterAutoplayVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;

    const playVideo = () => {
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

    if (typeof IntersectionObserver === "undefined") {
      playVideo();

      return pauseVideo;
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
    };
  }, [src]);

  return (
    <video
      aria-hidden={ariaHidden ? "true" : undefined}
      autoPlay
      className={className}
      controls={controls}
      data-fanletter-autoplay-video="true"
      loop
      muted
      playsInline
      poster={poster}
      preload="metadata"
      ref={videoRef}
      src={src}
      title={ariaHidden ? undefined : title}
    />
  );
}
