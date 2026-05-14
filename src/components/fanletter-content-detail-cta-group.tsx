"use client";

import { ArrowRight, Inbox, LockKeyhole, PenLine } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  FANLETTER_FAN_REQUEST_SUBMITTED_EVENT,
  type FanletterFanRequestSubmittedDetail,
} from "@/lib/fanletter-request-events";

type FanletterContentDetailCtaGroupProps = {
  creatorReferralCode: string | null;
  defaultPrimaryHref: string;
  defaultPrimaryLabel: string;
  primaryIcon: "lock" | "pen";
  requestStatusHref: string;
  requestStatusLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  sourceContentId: string;
  variant: "desktop" | "mobile";
};

export function FanletterContentDetailCtaGroup({
  creatorReferralCode,
  defaultPrimaryHref,
  defaultPrimaryLabel,
  primaryIcon,
  requestStatusHref,
  requestStatusLabel,
  secondaryHref,
  secondaryLabel,
  sourceContentId,
  variant,
}: FanletterContentDetailCtaGroupProps) {
  const [submittedRequestSourceContentId, setSubmittedRequestSourceContentId] =
    useState<string | null>(null);
  const hasSubmittedRequest = submittedRequestSourceContentId === sourceContentId;

  useEffect(() => {
    function handleRequestSubmitted(event: Event) {
      const detail = (event as CustomEvent<FanletterFanRequestSubmittedDetail>)
        .detail;

      if (!detail) {
        return;
      }

      if (detail.sourceContentId !== sourceContentId) {
        return;
      }

      if (
        creatorReferralCode &&
        detail.creatorReferralCode &&
        detail.creatorReferralCode !== creatorReferralCode
      ) {
        return;
      }

      setSubmittedRequestSourceContentId(detail.sourceContentId);
    }

    window.addEventListener(
      FANLETTER_FAN_REQUEST_SUBMITTED_EVENT,
      handleRequestSubmitted,
    );

    return () => {
      window.removeEventListener(
        FANLETTER_FAN_REQUEST_SUBMITTED_EVENT,
        handleRequestSubmitted,
      );
    };
  }, [creatorReferralCode, sourceContentId]);

  const PrimaryIcon = hasSubmittedRequest
    ? Inbox
    : primaryIcon === "lock"
      ? LockKeyhole
      : PenLine;
  const primaryHref = hasSubmittedRequest
    ? requestStatusHref
    : defaultPrimaryHref;
  const primaryLabel = hasSubmittedRequest
    ? requestStatusLabel
    : defaultPrimaryLabel;
  const containerClassName =
    variant === "mobile"
      ? "mt-4 grid grid-cols-2 gap-2"
      : "mt-7 flex flex-wrap items-center gap-3";
  const primaryClassName =
    variant === "mobile"
      ? "inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#44f26e] px-3 text-center text-sm font-semibold leading-tight !text-black transition hover:bg-[#64ff84]"
      : "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold !text-black transition hover:bg-[#64ff84]";
  const secondaryClassName =
    variant === "mobile"
      ? "inline-flex h-11 items-center justify-center rounded-full border border-white/14 px-3 text-center text-sm font-semibold leading-tight !text-white transition hover:bg-white/10"
      : "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/14 px-5 text-sm font-semibold !text-white transition hover:bg-white/10";

  return (
    <div className={containerClassName}>
      <Link className={primaryClassName} href={primaryHref}>
        {variant === "desktop" ? <PrimaryIcon className="size-4" /> : null}
        {primaryLabel}
      </Link>
      <Link className={secondaryClassName} href={secondaryHref}>
        {secondaryLabel}
        {variant === "desktop" ? <ArrowRight className="size-4" /> : null}
      </Link>
    </div>
  );
}
