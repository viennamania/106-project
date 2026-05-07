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
      preload="none"
      ref={videoRef}
      title={ariaHidden ? undefined : title}
    />
  );
}
