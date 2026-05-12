"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

import type { FanletterFanRequestType } from "@/lib/content";

export const FANLETTER_FAN_REQUEST_PRESET_EVENT =
  "fanletter:fan-request-preset";

export type FanletterFanRequestPresetDetail = {
  body: string;
  formId?: string;
  requestType: FanletterFanRequestType;
};

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.button !== 0
  );
}

export function FanletterFanRequestPresetLink({
  body,
  children,
  className,
  formId,
  href,
  requestType = "vlog_request",
}: {
  body: string;
  children: ReactNode;
  className?: string;
  formId?: string;
  href: string;
  requestType?: FanletterFanRequestType;
}) {
  function applyPreset(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || isModifiedClick(event)) {
      return;
    }

    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent<FanletterFanRequestPresetDetail>(
          FANLETTER_FAN_REQUEST_PRESET_EVENT,
          {
            detail: {
              body,
              formId,
              requestType,
            },
          },
        ),
      );
    }, 0);
  }

  return (
    <Link className={className} href={href} onClick={applyPreset}>
      {children}
    </Link>
  );
}
