"use client";

import Image from "next/image";
import { BadgeCheck, UserRound } from "lucide-react";
import { useState } from "react";

import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";

type FanletterNewsCharacterAvatarOption = {
  label: string | null;
  url: string;
};

type FanletterNewsCharacterImageSelectorProps = {
  avatarAlt: string;
  avatarImages: FanletterNewsCharacterAvatarOption[];
  channelHero?: boolean;
  compact?: boolean;
  galleryLabel: string;
  generatedLabel: string;
};

export function FanletterNewsCharacterImageSelector({
  avatarAlt,
  avatarImages,
  channelHero = false,
  compact = false,
  galleryLabel,
  generatedLabel,
}: FanletterNewsCharacterImageSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const resolvedSelectedIndex =
    selectedIndex >= 0 && selectedIndex < avatarImages.length ? selectedIndex : 0;
  const selectedAvatar = avatarImages[resolvedSelectedIndex] ?? null;
  const foregroundImageClassName =
    compact && channelHero
      ? "object-contain object-center sm:object-cover sm:object-top"
      : "object-cover object-top";

  const imageContent = selectedAvatar ? (
    <>
      <Image
        alt=""
        aria-hidden="true"
        className="scale-110 object-cover object-top blur-2xl brightness-[0.38] saturate-[0.88]"
        fill
        loading="eager"
        sizes="(max-width: 1024px) 100vw, 380px"
        src={selectedAvatar.url}
        unoptimized={shouldBypassFanletterImageOptimization(selectedAvatar.url)}
      />
      <Image
        alt={avatarAlt}
        className={foregroundImageClassName}
        fetchPriority="high"
        fill
        loading="eager"
        sizes="(max-width: 1024px) 100vw, 380px"
        src={selectedAvatar.url}
        unoptimized={shouldBypassFanletterImageOptimization(selectedAvatar.url)}
      />
    </>
  ) : (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0d130e]">
      <UserRound className="size-16 text-[#44f26e]" />
    </div>
  );

  const thumbnailStrip = avatarImages.length > 1 ? (
    <div
      className={
        compact
          ? "flex gap-1.5 overflow-x-auto pb-0.5 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "grid grid-cols-4 gap-2"
      }
    >
      {avatarImages.map((avatar, index) => {
        const isSelected = index === resolvedSelectedIndex;
        const thumbnailLabel = avatar.label
          ? `${galleryLabel} ${index + 1}: ${avatar.label}`
          : `${galleryLabel} ${index + 1}`;

        return (
          <button
            aria-label={thumbnailLabel}
            aria-pressed={isSelected}
            className={`relative overflow-hidden border bg-white/10 shadow-[0_10px_28px_rgba(0,0,0,0.22)] transition ${
              compact ? "size-12 shrink-0 sm:size-14" : "aspect-square"
            } ${
              isSelected
                ? "border-[#44f26e] ring-2 ring-[#44f26e]/70"
                : "border-white/18 hover:border-white/54"
            }`}
            key={`${avatar.url}-${index}`}
            onClick={() => {
              setSelectedIndex(index);
            }}
            type="button"
          >
            <Image
              alt=""
              aria-hidden="true"
              className="object-cover object-top"
              fill
              loading={isSelected ? "eager" : "lazy"}
              sizes={compact ? "3.5rem" : "4rem"}
              src={avatar.url}
              unoptimized={shouldBypassFanletterImageOptimization(avatar.url)}
            />
            {isSelected ? (
              <span
                className={
                  compact
                    ? "absolute inset-x-1 bottom-1 h-0.5 rounded-full bg-[#44f26e]"
                    : "absolute inset-x-2 bottom-2 h-1 rounded-full bg-[#44f26e]"
                }
              />
            ) : null}
          </button>
        );
      })}
    </div>
  ) : null;

  if (compact) {
    return (
      <div className="relative overflow-hidden bg-[#0d130e] lg:min-h-[18rem]">
        <div
          className={
            channelHero
              ? "relative min-h-[17.75rem] overflow-hidden sm:min-h-[18rem] lg:absolute lg:inset-0 lg:min-h-0"
              : "relative min-h-[14.75rem] overflow-hidden sm:min-h-[16rem] lg:absolute lg:inset-0 lg:min-h-0"
          }
        >
          {imageContent}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/6 to-black/24 lg:from-black/72 lg:via-black/8" />
        </div>
        <div className="absolute left-2 top-2 inline-flex items-center gap-1 border border-white/16 bg-black/42 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.08em] text-white/78 backdrop-blur">
          <BadgeCheck className="size-3.5 text-[#44f26e]" />
          {generatedLabel}
        </div>
        {thumbnailStrip ? (
          <div className="relative border-t border-white/10 bg-[#0d130e] px-2 py-2 lg:absolute lg:bottom-2 lg:left-2 lg:right-2 lg:border-t-0 lg:bg-transparent lg:p-0">
            <p className="sr-only">{galleryLabel}</p>
            {thumbnailStrip}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative min-h-[24rem] overflow-hidden bg-[#0d130e] lg:min-h-[32rem]">
      {imageContent}
      <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/8 to-black/24" />
      <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 border border-white/16 bg-black/36 px-2.5 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.12em] text-white/78 backdrop-blur">
        <BadgeCheck className="size-3.5 text-[#44f26e]" />
        {generatedLabel}
      </div>
      <div className="absolute bottom-4 left-4 right-4">
        <p className="mb-3 inline-flex border border-white/18 bg-black/42 px-2.5 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.12em] text-white/76 backdrop-blur">
          {galleryLabel}
        </p>
        {thumbnailStrip}
      </div>
    </div>
  );
}
