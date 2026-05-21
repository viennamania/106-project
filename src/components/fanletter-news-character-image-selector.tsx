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
  galleryLabel: string;
  generatedLabel: string;
};

export function FanletterNewsCharacterImageSelector({
  avatarAlt,
  avatarImages,
  galleryLabel,
  generatedLabel,
}: FanletterNewsCharacterImageSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const resolvedSelectedIndex =
    selectedIndex >= 0 && selectedIndex < avatarImages.length ? selectedIndex : 0;
  const selectedAvatar = avatarImages[resolvedSelectedIndex] ?? null;

  return (
    <div className="relative min-h-[24rem] overflow-hidden bg-[#0d130e] lg:min-h-[32rem]">
      {selectedAvatar ? (
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
            className="object-cover object-top"
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
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/8 to-black/24" />
      <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 border border-white/16 bg-black/36 px-2.5 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.12em] text-white/78 backdrop-blur">
        <BadgeCheck className="size-3.5 text-[#44f26e]" />
        {generatedLabel}
      </div>
      <div className="absolute bottom-4 left-4 right-4">
        <p className="mb-3 inline-flex border border-white/18 bg-black/42 px-2.5 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.12em] text-white/76 backdrop-blur">
          {galleryLabel}
        </p>
        {avatarImages.length > 1 ? (
          <div className="grid grid-cols-4 gap-2">
            {avatarImages.map((avatar, index) => {
              const isSelected = index === resolvedSelectedIndex;
              const thumbnailLabel = avatar.label
                ? `${galleryLabel} ${index + 1}: ${avatar.label}`
                : `${galleryLabel} ${index + 1}`;

              return (
                <button
                  aria-label={thumbnailLabel}
                  aria-pressed={isSelected}
                  className={`relative aspect-square overflow-hidden border bg-white/10 shadow-[0_10px_28px_rgba(0,0,0,0.22)] transition ${
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
                    sizes="4rem"
                    src={avatar.url}
                    unoptimized={shouldBypassFanletterImageOptimization(avatar.url)}
                  />
                  {isSelected ? (
                    <span className="absolute inset-x-2 bottom-2 h-1 rounded-full bg-[#44f26e]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
