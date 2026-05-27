"use client";

import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type TouchEvent,
} from "react";

import { FanletterNsfwVideoPinGate } from "@/components/fanletter-nsfw-video-pin-gate";
import { useMemberSession } from "@/components/member-session-provider";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  WALLET_UNLOCK_SESSION_CHANGE_EVENT,
  isWalletUnlockedForSession,
} from "@/lib/wallet-unlock-session";

type FanletterNewsSourceSceneGalleryItem = {
  imageUrl: string;
  label: string;
  timeLabel: string | null;
};

type FanletterNewsSourceSceneGalleryCopy = {
  body: string;
  close: string;
  eyebrow: string;
  next: string;
  openViewer: string;
  pinProtectedBody: string;
  pinProtectedTitle: string;
  previous: string;
  title: string;
};

type FanletterNewsSourceSceneGalleryNsfwPinGate = {
  connectHref?: string | null;
  enabled: boolean;
  managePinHref: string;
  title: string;
};

type ViewerTransform = {
  scale: number;
  x: number;
  y: number;
};

type TouchGesture =
  | {
      mode: "pan" | "swipe";
      startX: number;
      startY: number;
      transform: ViewerTransform;
    }
  | {
      centerX: number;
      centerY: number;
      distance: number;
      mode: "pinch";
      transform: ViewerTransform;
    };

type TouchListLike = {
  length: number;
  item(index: number): { clientX: number; clientY: number } | null;
};

const INITIAL_VIEWER_TRANSFORM: ViewerTransform = {
  scale: 1,
  x: 0,
  y: 0,
};
const MAX_VIEWER_SCALE = 4;

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampViewerTransform(transform: ViewerTransform): ViewerTransform {
  const scale = clampNumber(transform.scale, 1, MAX_VIEWER_SCALE);

  if (scale <= 1.01 || typeof window === "undefined") {
    return INITIAL_VIEWER_TRANSFORM;
  }

  const maxX = (window.innerWidth * (scale - 1)) / 2;
  const maxY = (window.innerHeight * (scale - 1)) / 2;

  return {
    scale,
    x: clampNumber(transform.x, -maxX, maxX),
    y: clampNumber(transform.y, -maxY, maxY),
  };
}

function getTouchDistance(touches: TouchListLike) {
  if (touches.length < 2) {
    return 0;
  }

  const firstTouch = touches.item(0);
  const secondTouch = touches.item(1);

  if (!firstTouch || !secondTouch) {
    return 0;
  }

  return Math.hypot(
    secondTouch.clientX - firstTouch.clientX,
    secondTouch.clientY - firstTouch.clientY,
  );
}

function getTouchCenter(touches: TouchListLike) {
  const firstTouch = touches.item(0);
  const secondTouch = touches.item(1);

  if (!firstTouch || !secondTouch) {
    return null;
  }

  return {
    x: (firstTouch.clientX + secondTouch.clientX) / 2,
    y: (firstTouch.clientY + secondTouch.clientY) / 2,
  };
}

export function FanletterNewsSourceSceneGallery({
  blurred,
  copy,
  items,
  locale,
  nsfwPinGate,
}: {
  blurred: boolean;
  copy: FanletterNewsSourceSceneGalleryCopy;
  items: FanletterNewsSourceSceneGalleryItem[];
  locale: Locale;
  nsfwPinGate?: FanletterNewsSourceSceneGalleryNsfwPinGate;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [viewerTransform, setViewerTransform] = useState<ViewerTransform>(
    INITIAL_VIEWER_TRANSFORM,
  );
  const [walletUnlockState, setWalletUnlockState] = useState({
    scope: "",
    unlocked: false,
  });
  const dragStartXRef = useRef<number | null>(null);
  const touchGestureRef = useRef<TouchGesture | null>(null);
  const lastTapRef = useRef<{
    time: number;
    x: number;
    y: number;
  } | null>(null);
  const { accountAddress, email } = useMemberSession();
  const activeItem = items[activeIndex] ?? items[0] ?? null;
  const canNavigate = items.length > 1;
  const requiresNsfwPin = Boolean(nsfwPinGate?.enabled);
  const walletUnlockScope =
    email && accountAddress ? `${email}:${accountAddress}` : "";
  const isNsfwPinUnlocked =
    requiresNsfwPin &&
    walletUnlockState.scope === walletUnlockScope &&
    walletUnlockState.unlocked;
  const canOpenSceneViewer = !requiresNsfwPin || isNsfwPinUnlocked;
  const effectiveBlurred =
    blurred || (requiresNsfwPin && !isNsfwPinUnlocked);
  const activeItemLabel = activeItem
    ? activeItem.timeLabel
      ? `${activeItem.label} · ${activeItem.timeLabel}`
      : activeItem.label
    : "";

  const openViewer = useCallback((index: number) => {
    if (!canOpenSceneViewer) {
      return;
    }

    touchGestureRef.current = null;
    setViewerTransform(INITIAL_VIEWER_TRANSFORM);
    setActiveIndex(index);
    setIsOpen(true);
  }, [canOpenSceneViewer]);

  const closeViewer = useCallback(() => {
    touchGestureRef.current = null;
    setViewerTransform(INITIAL_VIEWER_TRANSFORM);
    setIsOpen(false);
  }, []);

  const resetViewerTransform = useCallback(() => {
    touchGestureRef.current = null;
    setViewerTransform(INITIAL_VIEWER_TRANSFORM);
  }, []);

  const handleNsfwPinUnlocked = useCallback(() => {
    setWalletUnlockState({
      scope: walletUnlockScope,
      unlocked: true,
    });
  }, [walletUnlockScope]);

  const showPrevious = useCallback(() => {
    resetViewerTransform();
    setActiveIndex((current) =>
      current <= 0 ? Math.max(items.length - 1, 0) : current - 1,
    );
  }, [items.length, resetViewerTransform]);

  const showNext = useCallback(() => {
    resetViewerTransform();
    setActiveIndex((current) =>
      current >= items.length - 1 ? 0 : current + 1,
    );
  }, [items.length, resetViewerTransform]);

  useEffect(() => {
    if (!requiresNsfwPin) {
      return;
    }

    const syncWalletUnlockSession = () => {
      const unlocked = isWalletUnlockedForSession({
        email,
        walletAddress: accountAddress,
      });

      setWalletUnlockState({
        scope: walletUnlockScope,
        unlocked,
      });

      if (!unlocked) {
        setIsOpen(false);
      }
    };

    const syncTimeoutId = window.setTimeout(syncWalletUnlockSession, 0);

    window.addEventListener(
      WALLET_UNLOCK_SESSION_CHANGE_EVENT,
      syncWalletUnlockSession,
    );
    window.addEventListener("storage", syncWalletUnlockSession);

    return () => {
      window.removeEventListener(
        WALLET_UNLOCK_SESSION_CHANGE_EVENT,
        syncWalletUnlockSession,
      );
      window.removeEventListener("storage", syncWalletUnlockSession);
      window.clearTimeout(syncTimeoutId);
    };
  }, [accountAddress, email, requiresNsfwPin, walletUnlockScope]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeViewer();
        return;
      }

      if (event.key === "ArrowLeft") {
        showPrevious();
        return;
      }

      if (event.key === "ArrowRight") {
        showNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeViewer, isOpen, showNext, showPrevious]);

  if (items.length < 2) {
    return null;
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || viewerTransform.scale > 1.01) {
      return;
    }

    dragStartXRef.current = event.clientX;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || viewerTransform.scale > 1.01) {
      dragStartXRef.current = null;
      return;
    }

    const dragStartX = dragStartXRef.current;
    dragStartXRef.current = null;

    if (dragStartX === null) {
      return;
    }

    const deltaX = event.clientX - dragStartX;

    if (Math.abs(deltaX) < 44) {
      return;
    }

    if (deltaX > 0) {
      showPrevious();
      return;
    }

    showNext();
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length >= 2) {
      const center = getTouchCenter(event.touches);
      const distance = getTouchDistance(event.touches);

      if (!center || distance <= 0) {
        return;
      }

      touchGestureRef.current = {
        centerX: center.x,
        centerY: center.y,
        distance,
        mode: "pinch",
        transform: viewerTransform,
      };
      return;
    }

    const touch = event.touches.item(0);

    if (!touch) {
      return;
    }

    touchGestureRef.current = {
      mode: viewerTransform.scale > 1.01 ? "pan" : "swipe",
      startX: touch.clientX,
      startY: touch.clientY,
      transform: viewerTransform,
    };
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const gesture = touchGestureRef.current;

    if (!gesture) {
      return;
    }

    if (event.touches.length >= 2) {
      const center = getTouchCenter(event.touches);
      const distance = getTouchDistance(event.touches);

      if (!center || distance <= 0) {
        return;
      }

      const baseGesture =
        gesture.mode === "pinch"
          ? gesture
          : {
              centerX: center.x,
              centerY: center.y,
              distance,
              mode: "pinch" as const,
              transform: viewerTransform,
            };
      const nextScale =
        baseGesture.transform.scale * (distance / baseGesture.distance);

      touchGestureRef.current = baseGesture;
      setViewerTransform(
        clampViewerTransform({
          scale: nextScale,
          x: baseGesture.transform.x + (center.x - baseGesture.centerX),
          y: baseGesture.transform.y + (center.y - baseGesture.centerY),
        }),
      );
      return;
    }

    if (gesture.mode !== "pan" || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches.item(0);

    if (!touch) {
      return;
    }

    setViewerTransform(
      clampViewerTransform({
        scale: gesture.transform.scale,
        x: gesture.transform.x + (touch.clientX - gesture.startX),
        y: gesture.transform.y + (touch.clientY - gesture.startY),
      }),
    );
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const gesture = touchGestureRef.current;
    touchGestureRef.current = null;

    if (!gesture) {
      return;
    }

    setViewerTransform((current) =>
      current.scale <= 1.01 ? INITIAL_VIEWER_TRANSFORM : current,
    );

    if (gesture.mode === "pinch") {
      return;
    }

    const touch = event.changedTouches.item(0);

    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    const movedDistance = Math.hypot(deltaX, deltaY);

    if (movedDistance <= 14) {
      const now = Date.now();
      const lastTap = lastTapRef.current;

      if (
        lastTap &&
        now - lastTap.time < 300 &&
        Math.hypot(touch.clientX - lastTap.x, touch.clientY - lastTap.y) < 36
      ) {
        lastTapRef.current = null;
        setViewerTransform((current) =>
          current.scale > 1.01
            ? INITIAL_VIEWER_TRANSFORM
            : clampViewerTransform({
                scale: 2.35,
                x: 0,
                y: 0,
              }),
        );
        return;
      }

      lastTapRef.current = {
        time: now,
        x: touch.clientX,
        y: touch.clientY,
      };
    }

    if (gesture.mode !== "swipe") {
      return;
    }

    if (Math.abs(deltaX) >= 44 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX > 0) {
        showPrevious();
        return;
      }

      showNext();
      return;
    }
  };

  return (
    <section className="mt-3 border border-black/10 bg-[#f7f9f4] p-3 sm:p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
            {copy.eyebrow}
          </p>
          <h3 className="mt-1 text-lg font-black leading-tight [word-break:keep-all]">
            {copy.title}
          </h3>
        </div>
        <p className="max-w-lg text-xs font-semibold leading-5 text-black/48 sm:text-right">
          {copy.body}
        </p>
      </div>

      <div className="-mx-3 mt-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 sm:pb-0">
        {items.map((item, index) => (
          <button
            aria-label={`${item.label} ${copy.openViewer}`}
            className={cn(
              "group min-w-[9.5rem] snap-start overflow-hidden border border-black/10 bg-white text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#19b84b] sm:min-w-0",
              canOpenSceneViewer
                ? "hover:border-[#19b84b]"
                : "cursor-not-allowed",
            )}
            disabled={!canOpenSceneViewer}
            key={`${item.imageUrl}-${index}`}
            onClick={() => {
              openViewer(index);
            }}
            type="button"
          >
            <span className="relative block aspect-[4/5] bg-black">
              <Image
                alt=""
                aria-hidden="true"
                className={
                  effectiveBlurred
                    ? "scale-[1.04] object-cover blur-sm brightness-[0.76] saturate-[0.92]"
                    : "object-cover transition duration-300 group-hover:scale-[1.035]"
                }
                fill
                sizes="(max-width: 640px) 38vw, 12rem"
                src={item.imageUrl}
                unoptimized={shouldBypassFanletterImageOptimization(item.imageUrl)}
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/46 via-transparent to-black/8" />
              <span className="absolute bottom-2 left-2 rounded-full bg-black/64 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-white/86">
                {item.timeLabel ? `${item.label} · ${item.timeLabel}` : item.label}
              </span>
              <span className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full border border-white/18 bg-black/56 text-white opacity-90 backdrop-blur">
                <Expand className="size-3.5" />
              </span>
            </span>
          </button>
        ))}
      </div>

      {requiresNsfwPin && !isNsfwPinUnlocked && nsfwPinGate ? (
        <div className="mt-3 border border-[#44f26e]/18 bg-[#07100b] p-3 text-white shadow-[0_18px_44px_rgba(0,0,0,0.18)] sm:p-4">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-[#44f26e]">
            {copy.pinProtectedTitle}
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-white/64">
            {copy.pinProtectedBody}
          </p>
          <div className="mt-3 flex justify-center">
            <FanletterNsfwVideoPinGate
              connectHref={nsfwPinGate.connectHref}
              locale={locale}
              managePinHref={nsfwPinGate.managePinHref}
              onUnlocked={handleNsfwPinUnlocked}
              title={nsfwPinGate.title}
            />
          </div>
        </div>
      ) : null}

      {isOpen && activeItem ? (
        <div
          aria-label={copy.title}
          aria-modal="true"
          className="fixed inset-0 z-[190] flex bg-[#030504] text-white"
          role="dialog"
        >
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-b from-black/84 to-transparent px-4 pb-9 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6">
            <div className="min-w-0">
              <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#44f26e]">
                {copy.eyebrow}
              </p>
              <p className="mt-1 truncate text-sm font-black text-white/84">
                {activeItemLabel} · {formatNumber(activeIndex + 1, locale)} /{" "}
                {formatNumber(items.length, locale)}
              </p>
            </div>
            <button
              aria-label={copy.close}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/10 text-white backdrop-blur transition hover:bg-white/18"
              onClick={closeViewer}
              type="button"
            >
              <X className="size-5" />
            </button>
          </div>

          <div
            className="relative h-full w-full touch-none overflow-hidden select-none"
            onPointerCancel={() => {
              dragStartXRef.current = null;
            }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onTouchCancel={resetViewerTransform}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onTouchStart={handleTouchStart}
          >
            <div
              className="flex h-full transition-transform duration-300 ease-out"
              style={{
                transform: `translateX(-${activeIndex * 100}%)`,
              }}
            >
              {items.map((item, index) => (
                <div
                  className="relative h-full w-full shrink-0"
                  key={`viewer-${item.imageUrl}-${index}`}
                >
                  <div
                    className="absolute inset-0"
                    style={
                      index === activeIndex
                        ? {
                            transform: `translate3d(${viewerTransform.x}px, ${viewerTransform.y}px, 0) scale(${viewerTransform.scale})`,
                          }
                        : undefined
                    }
                  >
                    <Image
                      alt={item.label}
                      className={
                        effectiveBlurred
                          ? "scale-[1.02] object-contain blur-sm brightness-[0.78] saturate-[0.92]"
                          : "object-contain"
                      }
                      draggable={false}
                      fill
                      priority={index === activeIndex}
                      sizes="100vw"
                      src={item.imageUrl}
                      unoptimized={shouldBypassFanletterImageOptimization(item.imageUrl)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {canNavigate ? (
            <>
              <button
                aria-label={copy.previous}
                className="absolute left-3 top-1/2 z-20 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/14 bg-black/42 text-white backdrop-blur transition hover:bg-black/62 sm:left-5 sm:size-12"
                onClick={showPrevious}
                type="button"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                aria-label={copy.next}
                className="absolute right-3 top-1/2 z-20 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/14 bg-black/42 text-white backdrop-blur transition hover:bg-black/62 sm:right-5 sm:size-12"
                onClick={showNext}
                type="button"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/84 to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-12 sm:px-6">
            <div className="mx-auto flex max-w-3xl items-center justify-center gap-2">
              {items.map((item, index) => (
                <button
                  aria-label={item.label}
                  className={
                    index === activeIndex
                      ? "h-2.5 w-7 rounded-full bg-[#44f26e]"
                      : "h-2.5 w-2.5 rounded-full bg-white/34"
                  }
                  key={`dot-${item.imageUrl}-${index}`}
                  onClick={() => {
                    resetViewerTransform();
                    setActiveIndex(index);
                  }}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
