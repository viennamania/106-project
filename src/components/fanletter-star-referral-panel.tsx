"use client";

import Link from "next/link";
import { CheckCircle2, Share2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { CopyTextButton } from "@/components/copy-text-button";
import type { FanletterV2Copy, ScoutShareLoopData } from "@/mock/fanletterV2";

type FanletterStarReferralPanelProps = {
  copy: FanletterV2Copy;
  inboundReferralCode?: string | null;
  joinHref: string;
  loop: ScoutShareLoopData;
};

function buildPlatformHref(platform: string, shareLink: string) {
  if (platform === "X") {
    const url = new URL("https://twitter.com/intent/tweet");
    url.searchParams.set("url", shareLink);

    return url.toString();
  }

  return shareLink;
}

export function FanletterStarReferralPanel({
  copy,
  inboundReferralCode,
  joinHref,
  loop,
}: FanletterStarReferralPanelProps) {
  const [isGenerated, setIsGenerated] = useState(Boolean(inboundReferralCode));
  const visibleReferralCode = inboundReferralCode ?? loop.referralCode;
  const visibleShareLink = useMemo(() => {
    if (!inboundReferralCode) {
      return loop.shareLink;
    }

    try {
      const url = new URL(loop.shareLink);
      url.searchParams.set("ref", inboundReferralCode);

      return url.toString();
    } catch {
      return loop.shareLink;
    }
  }, [inboundReferralCode, loop.shareLink]);

  return (
    <article
      className="rounded-lg border border-violet-200 bg-white p-4 shadow-[0_22px_54px_rgba(88,28,135,0.1)] sm:p-5"
      id="referral-builder"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white">
          <Share2 className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#6d28d9]">
            {copy.labels.scoutShareLoop}
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
            {copy.starDetail.referralTitle}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-black/62">
            {copy.starDetail.referralBody}
          </p>
        </div>
      </div>

      {inboundReferralCode ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <CheckCircle2 className="size-4" />
            {copy.starDetail.inboundRefTitle}
          </div>
          <p className="mt-2 text-sm font-medium leading-5 text-emerald-900/72">
            {copy.starDetail.inboundRefBody}
          </p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-2">
        {[
          loop.sourceMember,
          loop.selectedUniverse,
          `${copy.labels.referralCode}: ${visibleReferralCode}`,
          copy.scoutShareLoop.shareToSns,
          `${loop.targetMember} joins`,
          `${loop.targetMember} becomes Founder in ${loop.selectedUniverse}`,
        ].map((item, index) => (
          <div
            className="flex min-h-12 items-center gap-3 rounded-lg border border-black/8 bg-[#f8f7ff] px-3 py-2"
            key={`${item}-${index}`}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#ede9fe] text-xs font-semibold text-[#6d28d9]">
              {index + 1}
            </span>
            <span className="text-sm font-semibold leading-5 text-[#26113d]">
              {item}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-black/8 bg-[#f6f8f4] p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-black/48">
              {isGenerated
                ? copy.starDetail.referralReady
                : copy.labels.referralCode}
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-black">
              {isGenerated ? visibleReferralCode : "MOCK-READY"}
            </p>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            onClick={() => setIsGenerated(true)}
            type="button"
          >
            <Sparkles className="size-4" />
            {copy.actions.createMockReferral}
          </button>
        </div>

        {isGenerated ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase text-black/48">
              {copy.actions.shareLink}
            </p>
            <p className="mt-2 overflow-hidden text-ellipsis rounded-lg bg-white px-3 py-2 font-mono text-xs font-semibold text-[#5b21b6]">
              {visibleShareLink}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <CopyTextButton
                className="h-11 border-black/10 text-sm font-semibold"
                copiedLabel={copy.actions.copied}
                copyLabel={copy.actions.copyLink}
                text={visibleShareLink}
              />
              {loop.sharePlatforms.map((platform) => (
                <a
                  className="inline-flex h-11 items-center justify-center rounded-full border border-black/8 bg-white px-4 text-sm font-semibold text-black/68 transition hover:border-[#7c3aed]/40 hover:text-[#5b21b6]"
                  href={buildPlatformHref(platform, visibleShareLink)}
                  key={platform}
                  rel="noreferrer"
                  target="_blank"
                >
                  {platform}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 rounded-lg bg-[#12041f] p-4 text-white">
        <p className="text-sm font-semibold text-fuchsia-100">
          {copy.starDetail.rewardsTitle}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-white/12 bg-white/10 p-3">
            <p className="text-xl font-semibold">+{loop.rewards.cp}</p>
            <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
              CP
            </p>
          </div>
          <div className="rounded-lg border border-white/12 bg-white/10 p-3">
            <p className="text-xl font-semibold">
              +{loop.rewards.influenceScore}
            </p>
            <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
              {copy.labels.influenceScore}
            </p>
          </div>
          <div className="rounded-lg border border-white/12 bg-white/10 p-3">
            <p className="text-xl font-semibold">
              +{loop.rewards.creatorProgressPercent}%
            </p>
            <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
              Creator
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 py-3 text-sm font-semibold text-black transition hover:bg-[#69f98a]"
          href={joinHref}
        >
          {copy.actions.joinAsFounder}
        </Link>
        <p className="rounded-lg border border-black/8 bg-white px-3 py-2 text-xs font-semibold leading-5 text-black/52 sm:max-w-xs">
          {copy.starDetail.mockNotice}
        </p>
      </div>
    </article>
  );
}
